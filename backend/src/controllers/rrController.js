import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_15 = async (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `
      SELECT r.*, p.name as project_name, pcl.survey_number, pcl.village
      FROM rr_records r
      JOIN projects p ON r.project_id = p.id
      LEFT JOIN parcels pcl ON r.parcel_id = pcl.id
    `;
    const params = [];
    if (project_id) {
      sql += ` WHERE r.project_id = ?`;
      params.push(project_id);
    }
    const data = await query(sql, params);
    res.json({ success: true, data });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};