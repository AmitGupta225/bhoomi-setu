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