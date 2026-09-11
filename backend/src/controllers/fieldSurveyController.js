import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_16 = async (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `
      SELECT fs.*, p.survey_number, p.owner_name, pr.name as project_name
      FROM field_surveys fs
      JOIN parcels p ON fs.parcel_id = p.id
      JOIN projects pr ON fs.project_id = pr.id
    `;
    const params = [];
    if (project_id) {
      sql += ` WHERE fs.project_id = ?`;
      params.push(project_id);
    }
    sql += ` ORDER BY inspection_date DESC`;

    const surveys = await query(sql, params);
    res.json({ success: true, data: surveys });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_17 = async (req, res) => {
  try {
    const { 
      project_id, parcel_id, surveyor_name, surveyor_id, gps_lat, gps_lng, 
      land_condition, land_type, affected_families_count, structures_count, trees_count, is_tribal_land, consent_obtained,
      photo_url, verification_notes 
    } = req.body;
    
    const id = `SURVEY-${Date.now().toString().slice(-5)}`;
    const inspection_date = new Date().toISOString().split('T')[0];

    await run(
      `INSERT INTO field_surveys (
        id, project_id, parcel_id, surveyor_name, surveyor_id, gps_lat, gps_lng, 
        land_condition, land_type, affected_families_count, structures_count, trees_count, is_tribal_land, consent_obtained,
        inspection_date, photo_url, verification_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, project_id, parcel_id, surveyor_name || 'Field Officer', surveyor_id || 'FIELD-001', 
        gps_lat, gps_lng, land_condition, land_type || 'Unirrigated', affected_families_count || 0, structures_count || 0, 
        trees_count || 0, is_tribal_land ? 1 : 0, consent_obtained ? 1 : 0,
        inspection_date, photo_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60', verification_notes
      ]
    );

    
    // Auto-create an R&R Record using the survey info if affected families > 0
    if (affected_families_count > 0 && req.body.family_category) {
      const rrId = `RR-${Date.now().toString().slice(-4)}`;
      await run(
        `INSERT INTO rr_records (
          id, project_id, parcel_id, family_head_name, category, family_members_count, 
          is_displaced, housing_allotted, r_and_r_package_value_rs, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rrId, project_id, parcel_id,
          'Affected Head ' + rrId, // Placeholder until land record maps it
          req.body.family_category, 
          req.body.family_members_count || 4,
          1, 'Pending', 550000, 'Pending'
        ]
      );
    }

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Field Surveyor', surveyor_name || 'Field Officer', 'Submitted Geo-Tagged Inspection Report', `Captured Lat: ${gps_lat}, Lng: ${gps_lng} for Parcel ${parcel_id} in project ${project_id}`]
    );

    res.json({ success: true, message: 'Field survey geo-tagged report uploaded successfully', surveyId: id });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Batch synchronize offline field surveys with conflict detection
 */
export const handler_sync_batch = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, processed: [], message: 'No items to sync' });
    }

    const results = [];

    for (const item of items) {
      const { id, type, data } = item;

      if (type === 'NEW_PARCEL') {
        const existing = await queryOne('SELECT * FROM parcels WHERE ulpin = ?', [data.ulpin]);
        if (existing) {
          results.push({
            item_id: id,
            status: 'CONFLICT',
            reason: 'ULPIN_ALREADY_EXISTS',
            server_record: existing,
            client_record: data
          });
          continue;
        }

        // Insert new parcel
        const parcelId = `P-${Date.now().toString().slice(-4)}`;
        const geojsonObj = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              Array.isArray(data.coordinates) && data.coordinates.length > 0
                ? data.coordinates.map(c => [c[1], c[0]])
                : [[79.58, 24.91], [79.582, 24.91], [79.582, 24.912], [79.58, 24.91]]
            ]
          },
          properties: { survey_number: data.survey_number }
        };

        await run(
          `INSERT INTO parcels (id, ulpin, project_id, survey_number, khata_number, village, tehsil, district, state, area_ha, land_type, owner_name, market_rate_sqm, status, geojson, lat, lng)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            parcelId, data.ulpin, data.project_id, data.survey_number || 'SVY-OFFLINE',
            data.khata_number || 'KH-OFFLINE', data.village || 'Field Survey Village',
            'Chhatarpur Tehsil', 'Chhatarpur', 'Madhya Pradesh', data.area_ha || 0.1,
            data.land_type || 'Agricultural', data.owner_name || 'Landowner (Field Surveyed)',
            1500, 'Verified', JSON.stringify(geojsonObj),
            data.lat || 24.91, data.lng || 79.58
          ]
        );

        // Also create survey report
        const surveyId = `SURVEY-${Date.now().toString().slice(-5)}`;
        await run(
          `INSERT INTO field_surveys (
            id, project_id, parcel_id, surveyor_name, surveyor_id, gps_lat, gps_lng,
            land_condition, land_type, affected_families_count, structures_count, trees_count,
            is_tribal_land, consent_obtained, inspection_date, photo_url, verification_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            surveyId, data.project_id, parcelId, data.surveyor_name || 'Field Officer',
            data.surveyor_id || 'FIELD-001', data.gps_lat ?? data.lat ?? 24.91, data.gps_lng ?? data.lng ?? 79.58,
            data.land_condition || 'Normal', data.land_type || 'Unirrigated',
            data.affected_families_count || 0, data.structures_count || 0, data.trees_count || 0,
            data.is_tribal_land ? 1 : 0, data.consent_obtained ? 1 : 0,
            new Date().toISOString().split('T')[0],
            data.photo_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
            data.verification_notes || 'Synced from offline mobile survey outbox'
          ]
        );

        await run(
          `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
          ['Field Surveyor', data.surveyor_name || 'Field Officer', 'Synced Offline New Parcel', `ULPIN ${data.ulpin} synced successfully`]
        );

        results.push({ item_id: id, status: 'SYNCED', parcel_id: parcelId, survey_id: surveyId });
      } else {
        // Standard Inspection
        const parcel = await queryOne('SELECT * FROM parcels WHERE id = ? OR ulpin = ?', [data.parcel_id, data.ulpin]);

        // Conflict check: if parcel was updated concurrently to terminal status
        if (parcel && (parcel.status === 'Awarded' || parcel.status === 'Possessed' || parcel.status === 'Disputed')) {
          results.push({
            item_id: id,
            status: 'CONFLICT',
            reason: `CONCURRENT_STATUS_${parcel.status.toUpperCase()}`,
            server_record: parcel,
            client_record: data
          });
          continue;
        }

        const surveyId = `SURVEY-${Date.now().toString().slice(-5)}`;
        await run(
          `INSERT INTO field_surveys (
            id, project_id, parcel_id, surveyor_name, surveyor_id, gps_lat, gps_lng,
            land_condition, land_type, affected_families_count, structures_count, trees_count,
            is_tribal_land, consent_obtained, inspection_date, photo_url, verification_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            surveyId, data.project_id, data.parcel_id || (parcel ? parcel.id : null),
            data.surveyor_name || 'Field Officer', data.surveyor_id || 'FIELD-001',
            data.gps_lat ?? (parcel ? parcel.lat : 24.91), data.gps_lng ?? (parcel ? parcel.lng : 79.58), data.land_condition || 'Normal',
            data.land_type || 'Unirrigated', data.affected_families_count || 0,
            data.structures_count || 0, data.trees_count || 0,
            data.is_tribal_land ? 1 : 0, data.consent_obtained ? 1 : 0,
            new Date().toISOString().split('T')[0],
            data.photo_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
            data.verification_notes || 'Synced from offline mobile survey outbox'
          ]
        );

        if (parcel) {
          await run(`UPDATE parcels SET status = 'Verified' WHERE id = ?`, [parcel.id]);
        }

        await run(
          `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
          ['Field Surveyor', data.surveyor_name || 'Field Officer', 'Synced Offline Survey Inspection', `Inspection synced for parcel ${data.parcel_id || data.ulpin}`]
        );

        results.push({ item_id: id, status: 'SYNCED', survey_id: surveyId });
      }
    }

    res.json({ success: true, processed: results });
  } catch (err) {
    console.error("500 ERROR in sync_batch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Adjudicate / resolve an offline synchronization conflict
 */
export const handler_resolve_conflict = async (req, res) => {
  try {
    const { item_id, resolution, data } = req.body;

    if (resolution === 'OVERRIDE_FIELD' && data) {
      if (data.parcel_id) {
        await run(`UPDATE parcels SET status = 'Verified' WHERE id = ?`, [data.parcel_id]);
      }
      const surveyId = `SURVEY-${Date.now().toString().slice(-5)}`;
      await run(
        `INSERT INTO field_surveys (
          id, project_id, parcel_id, surveyor_name, surveyor_id, gps_lat, gps_lng,
          land_condition, land_type, affected_families_count, structures_count, trees_count,
          is_tribal_land, consent_obtained, inspection_date, photo_url, verification_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          surveyId, data.project_id, data.parcel_id, data.surveyor_name || 'Field Officer',
          data.surveyor_id || 'FIELD-001', data.gps_lat, data.gps_lng,
          data.land_condition || 'Normal', data.land_type || 'Unirrigated',
          data.affected_families_count || 0, data.structures_count || 0, data.trees_count || 0,
          data.is_tribal_land ? 1 : 0, data.consent_obtained ? 1 : 0,
          new Date().toISOString().split('T')[0],
          data.photo_url, `[CONFLICT OVERRIDE] ${data.verification_notes || ''}`
        ]
      );

      await run(
        `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
        ['Field Surveyor', data.surveyor_name || 'Field Officer', 'Conflict Resolved: Field Override', `Field data applied over server conflict for ${data.parcel_id}`]
      );
    } else {
      await run(
        `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
        ['Field Surveyor', 'Field Officer', 'Conflict Resolved: Server Kept', `Offline draft discarded in favor of server state for item ${item_id}`]
      );
    }

    res.json({ success: true, message: 'Conflict resolved successfully' });
  } catch (err) {
    console.error("500 ERROR in resolve_conflict:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};