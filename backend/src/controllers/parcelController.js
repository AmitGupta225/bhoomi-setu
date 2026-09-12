import { query, queryOne, run } from '../db.js';

const sendNotification = async (text, targetRole = 'ALL') => {
  try {
    await run(`INSERT INTO auth.notifications (text, target_role, unread) VALUES (?, ?, 1)`, [text, targetRole]);
  } catch (err) {
    try {
      await run(`INSERT INTO notifications (text, target_role, unread) VALUES (?, ?, 1)`, [text, targetRole]);
    } catch (fallbackErr) {
      console.warn('Failed to insert notification:', fallbackErr.message);
    }
  }
};


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

    if (!project_id) {
      return res.status(400).json({ success: false, error: 'Project ID is required.' });
    }
    if (!survey_number || !survey_number.trim()) {
      return res.status(400).json({ success: false, error: 'Survey / Khasra / Plot Number is required.' });
    }
    if (!khata_number || !khata_number.trim()) {
      return res.status(400).json({ success: false, error: 'Khata Number is required.' });
    }
    if (!village || !village.trim()) {
      return res.status(400).json({ success: false, error: 'Village / Settlement name is required.' });
    }
    if (!owner_name || !owner_name.trim()) {
      return res.status(400).json({ success: false, error: 'Primary Landowner name is required.' });
    }
    const cleanPhone = (owner_contact || '').replace(/\D/g, '');
    if (!owner_contact || !owner_contact.trim() || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit owner contact phone number is required.' });
    }
    if (!vertices || !Array.isArray(vertices) || vertices.length < 3) {
      return res.status(400).json({ success: false, error: 'A valid parcel boundary requires at least 3 GPS vertices.' });
    }
    const parsedArea = parseFloat(area_ha);
    if (isNaN(parsedArea) || parsedArea <= 0) {
      return res.status(400).json({ success: false, error: 'Parcel area (Ha) must be greater than 0.' });
    }

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
      properties: { survey: survey_number.trim(), owner: owner_name.trim(), area: `${parsedArea} Ha (${land_type || 'Agricultural Field'})` },
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
        id, ulpin, project_id, survey_number.trim(), khata_number.trim(),
        village.trim(), tehsil || (proj ? proj.district : 'Tehsil'),
        district || (proj ? proj.district : 'District'), state || (proj ? proj.state : 'State'),
        parsedArea, land_type || 'Agricultural Field', owner_name.trim(),
        '9999-XXXX-1111', owner_contact.trim(), market_rate_sqm,
        statutory_multiplier, status, geojson, lat || vertices[0].lat, lng || vertices[0].lng
      ]
    );

    const baseValue = parsedArea * 10000 * market_rate_sqm;
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
      ['Field Surveyor', owner_name.trim() || 'Field Surveyor', 'Created New Multi-Vertex Land Parcel', `Mapped Survey ${survey_number.trim()} ULPIN ${ulpin} (${parsedArea} Ha)`]
    );

    // Broadcast Real-time In-App Notification
    await sendNotification(
      `[New Parcel Mapped] Plot #${survey_number.trim()} (${ulpin}) in ${village.trim()} created by ${owner_name.trim() || 'Field Surveyor'}`,
      'ALL'
    );

    res.json({ success: true, message: 'New multi-vertex land parcel created successfully', parcelId: id, ulpin });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_update_parcel = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      survey_number, khata_number, village, tehsil, district, state,
      area_ha, land_type, owner_name, owner_contact, address, vertices, lat, lng,
      role, user_name
    } = req.body;

    const existing = await queryOne(`SELECT * FROM parcels WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Parcel not found' });

    if (survey_number !== undefined && !survey_number.trim()) {
      return res.status(400).json({ success: false, error: 'Survey Number cannot be empty.' });
    }
    if (khata_number !== undefined && !khata_number.trim()) {
      return res.status(400).json({ success: false, error: 'Khata Number cannot be empty.' });
    }
    if (village !== undefined && !village.trim()) {
      return res.status(400).json({ success: false, error: 'Village name cannot be empty.' });
    }
    if (owner_name !== undefined && !owner_name.trim()) {
      return res.status(400).json({ success: false, error: 'Landowner name cannot be empty.' });
    }
    if (owner_contact !== undefined) {
      const cleanPhone = owner_contact.replace(/\D/g, '');
      if (!owner_contact.trim() || cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'A valid 10-digit owner contact phone number is required.' });
      }
    }
    if (vertices !== undefined) {
      if (!Array.isArray(vertices) || vertices.length < 3) {
        return res.status(400).json({ success: false, error: 'A valid parcel boundary requires at least 3 GPS vertices.' });
      }
    }
    if (area_ha !== undefined && (isNaN(parseFloat(area_ha)) || parseFloat(area_ha) <= 0)) {
      return res.status(400).json({ success: false, error: 'Parcel area (Ha) must be greater than 0.' });
    }

    let geojson = existing.geojson;
    if (vertices && Array.isArray(vertices) && vertices.length >= 3) {
      let formattedVertices = vertices.map(v => [v.lng, v.lat]);
      if (formattedVertices[0][0] !== formattedVertices[formattedVertices.length - 1][0] ||
          formattedVertices[0][1] !== formattedVertices[formattedVertices.length - 1][1]) {
        formattedVertices.push([formattedVertices[0][0], formattedVertices[0][1]]);
      }
      geojson = JSON.stringify({
        type: 'Feature',
        properties: {
          survey: survey_number ? survey_number.trim() : existing.survey_number,
          owner: owner_name ? owner_name.trim() : existing.owner_name,
          area: `${area_ha || existing.area_ha} Ha (${land_type || existing.land_type})`
        },
        geometry: {
          type: 'Polygon',
          coordinates: [formattedVertices]
        }
      });
    }

    const updatedAreaHa = area_ha !== undefined && area_ha !== null && area_ha !== '' ? parseFloat(area_ha) : existing.area_ha;
    const finalLat = lat !== undefined ? lat : (vertices && vertices[0] ? vertices[0].lat : existing.lat);
    const finalLng = lng !== undefined ? lng : (vertices && vertices[0] ? vertices[0].lng : existing.lng);

    await run(
      `UPDATE parcels SET 
        survey_number = COALESCE(?, survey_number),
        khata_number = COALESCE(?, khata_number),
        village = COALESCE(?, village),
        tehsil = COALESCE(?, tehsil),
        district = COALESCE(?, district),
        state = COALESCE(?, state),
        area_ha = ?,
        land_type = COALESCE(?, land_type),
        owner_name = COALESCE(?, owner_name),
        owner_contact = COALESCE(?, owner_contact),
        geojson = ?,
        lat = ?,
        lng = ?
      WHERE id = ?`,
      [
        survey_number ? survey_number.trim() : null,
        khata_number ? khata_number.trim() : null,
        village ? village.trim() : null,
        tehsil, district, state,
        updatedAreaHa, land_type,
        owner_name ? owner_name.trim() : null,
        owner_contact ? owner_contact.trim() : null,
        geojson, finalLat, finalLng, id
      ]
    );

    // Recalculate compensation if area changed
    if (updatedAreaHa !== existing.area_ha) {
      const market_rate_sqm = existing.market_rate_sqm || 2500;
      const statutory_multiplier = existing.statutory_multiplier || 2.0;
      const baseValue = updatedAreaHa * 10000 * market_rate_sqm;
      const multipliedValue = baseValue * statutory_multiplier;
      const structureAssets = baseValue * 0.15;
      const solatium = multipliedValue + structureAssets;
      const interest = (multipliedValue + solatium) * 0.12;
      const totalAssessed = multipliedValue + structureAssets + solatium + interest;

      await run(
        `UPDATE compensation SET 
          land_value_rs = ?, structure_assets_rs = ?, solatium_100_percent_rs = ?,
          interest_amount_rs = ?, total_assessed_rs = ?
        WHERE parcel_id = ?`,
        [multipliedValue, structureAssets, solatium, interest, totalAssessed, id]
      );
    }

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      [role || 'Field Surveyor', user_name || 'Cadastral Surveyor', 'Edited Land Parcel Boundary & Details', `Updated plot ${id} (${existing.ulpin})`]
    );

    // Broadcast Real-time In-App Notification
    await sendNotification(
      `[Parcel Modified] Plot #${survey_number ? survey_number.trim() : existing.survey_number} (${existing.ulpin}) in ${village ? village.trim() : existing.village} updated by ${user_name || role || 'Field Surveyor'}`,
      'ALL'
    );

    const updatedRow = await queryOne(`SELECT * FROM parcels WHERE id = ?`, [id]);
    res.json({
      success: true,
      message: `Parcel ${existing.ulpin} updated successfully`,
      data: { ...updatedRow, geojson: JSON.parse(updatedRow.geojson) }
    });
  } catch (err) {
    console.error("500 ERROR in handler_update_parcel:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_delete_parcel = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, user_name } = req.body || {};

    const existing = await queryOne(`SELECT * FROM parcels WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }

    // Clean up dependent records in compensation, surveys, and rr
    await run(`DELETE FROM compensation WHERE parcel_id = ?`, [id]);
    await run(`DELETE FROM rr_records WHERE parcel_id = ?`, [id]);
    await run(`DELETE FROM field_surveys WHERE parcel_id = ?`, [id]);
    await run(`DELETE FROM parcels WHERE id = ?`, [id]);

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      [role || 'Field Surveyor', user_name || 'Cadastral Surveyor', 'Deleted Land Parcel', `Permanently deleted parcel ${id} (${existing.ulpin}, Survey: ${existing.survey_number})`]
    );

    // Broadcast Real-time In-App Notification
    await sendNotification(
      `[Parcel Deleted] Plot #${existing.survey_number} (${existing.ulpin}) in ${existing.village} permanently deleted by ${user_name || role || 'Field Surveyor'}`,
      'ALL'
    );

    res.json({
      success: true,
      message: `Parcel ${existing.ulpin} (${existing.survey_number}) deleted successfully`,
      deletedId: id
    });
  } catch (err) {
    console.error("500 ERROR in handler_delete_parcel:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};