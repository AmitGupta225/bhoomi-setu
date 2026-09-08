import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_6 = async (req, res) => {
  try {
    const { project_id, status, ulpin, survey, owner_email } = req.query;
    let sql = `SELECT * FROM parcels WHERE 1=1`;
    const params = [];

    if (project_id) {
      sql += ` AND project_id = ?`;
      params.push(project_id);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (ulpin) {
      sql += ` AND ulpin LIKE ?`;
      params.push(`%${ulpin}%`);
    }
    if (survey) {
      sql += ` AND survey_number LIKE ?`;
      params.push(`%${survey}%`);
    }
    if (owner_email) {
      sql += ` AND owner_email = ?`;
      params.push(owner_email);
    }

    const parcels = await query(sql, params);

    // Parse GeoJSON strings into JSON objects for front-end GIS render
    const formatted = parcels.map(p => ({
      ...p,
      geojson: JSON.parse(p.geojson)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_7 = async (req, res) => {
  try {
    const { status, role, user_name } = req.body;
    await run(`UPDATE parcels SET status = ? WHERE id = ?`, [status, req.params.id]);
    
    // Add an audit log for the status change
    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      [role || 'GIS Hub', user_name || 'Authorized Officer', 'Updated Parcel Status', `Changed status of parcel ${req.params.id} to '${status}'`]
    );

    res.json({ success: true, message: `Parcel status updated to ${status}` });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_8 = async (req, res) => {
  try {
    const parcel = await queryOne(`SELECT * FROM parcels WHERE id = ?`, [req.params.id]);
    if (!parcel) return res.status(404).json({ success: false, error: 'Parcel not found' });

    const compensation = await queryOne(`SELECT * FROM compensation WHERE parcel_id = ?`, [req.params.id]);
    const rrRecord = await queryOne(`SELECT * FROM rr_records WHERE parcel_id = ?`, [req.params.id]);
    const fieldSurveys = await query(`SELECT * FROM field_surveys WHERE parcel_id = ?`, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...parcel,
        geojson: JSON.parse(parcel.geojson),
        compensation,
        rrRecord,
        fieldSurveys
      }
    });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_9 = async (req, res) => {
  try {
    const {
      project_id, survey_number, khata_number, village, tehsil, district, state,
      area_ha, land_type, owner_name, owner_contact, vertices, lat, lng
    } = req.body;

    const proj = await queryOne(`SELECT * FROM projects WHERE id = ?`, [project_id]);
    const statePrefix = proj ? proj.state.slice(0, 2).toUpperCase() : 'IN';
    const distPrefix = proj ? proj.district.slice(0, 3).toUpperCase() : 'DIS';

    const countRes = await queryOne(`SELECT COUNT(*) as count FROM parcels`);
    const nextNum = (countRes ? countRes.count : 0) + 1;

    const id = `PARCEL-${statePrefix}-${Date.now().toString().slice(-4)}`;
    const ulpin = `IN-${statePrefix}-${distPrefix}-2026-${String(nextNum).padStart(5, '0')}`;

    let formattedVertices = vertices ? vertices.map(v => [v.lng, v.lat]) : [];
    if (formattedVertices.length > 0) {
      if (formattedVertices[0][0] !== formattedVertices[formattedVertices.length - 1][0] ||
        formattedVertices[0][1] !== formattedVertices[formattedVertices.length - 1][1]) {
        formattedVertices.push([formattedVertices[0][0], formattedVertices[0][1]]);
      }
    }

    const geojson = JSON.stringify({
      type: 'Feature',
      properties: { survey: survey_number, owner: owner_name, area: `${area_ha} Ha (${land_type})` },
      geometry: {
        type: 'Polygon',
        coordinates: [formattedVertices]
      }
    });

    const market_rate_sqm = 2500;
    const statutory_multiplier = 2.0;
    const status = 'Notified';

    await run(
      `INSERT INTO parcels (id, ulpin, project_id, survey_number, khata_number, village, tehsil, district, state, area_ha, land_type, owner_name, owner_aadhaar_hash, owner_contact, market_rate_sqm, statutory_multiplier, status, geojson, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, ulpin, project_id, survey_number, khata_number || 'KH-NEW',
        village || (proj ? proj.district : 'Village'), tehsil || (proj ? proj.district : 'Tehsil'),
        district || (proj ? proj.district : 'District'), state || (proj ? proj.state : 'State'),
        area_ha || 1.0, land_type || 'Agricultural Field', owner_name || 'Landowner',
        '9999-XXXX-1111', owner_contact || '+91 98765 43210', market_rate_sqm,
        statutory_multiplier, status, geojson, lat || vertices[0].lat, lng || vertices[0].lng
      ]
    );

    const baseValue = (area_ha || 1.0) * 10000 * market_rate_sqm;
    const multipliedValue = baseValue * statutory_multiplier;
    const structureAssets = baseValue * 0.15;
    const solatium = multipliedValue + structureAssets;
    const interest = (multipliedValue + solatium) * 0.12;
    const totalAssessed = multipliedValue + structureAssets + solatium + interest;

    await run(
      `INSERT INTO compensation (id, parcel_id, project_id, land_value_rs, structure_assets_rs, solatium_100_percent_rs, interest_amount_rs, total_assessed_rs, total_disbursed_rs, disbursement_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Assessed')`,
      [`COMP-${id}`, id, project_id, multipliedValue, structureAssets, solatium, interest, totalAssessed]
    );

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Field Surveyor', owner_name || 'Field Surveyor', 'Created New Multi-Vertex Land Parcel', `Mapped Survey ${survey_number} ULPIN ${ulpin} (${area_ha} Ha)`]
    );

    res.json({ success: true, message: 'New multi-vertex land parcel created successfully', parcelId: id, ulpin });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};