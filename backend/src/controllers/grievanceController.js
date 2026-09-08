import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_24 = async (req, res) => {
  try {
    const { ulpin, owner_name, owner_email, description } = req.body;
    const tokenNo = `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await run(
      `INSERT INTO grievances (token_no, ulpin, owner_name, owner_email, description) VALUES (?, ?, ?, ?, ?)`,
      [tokenNo, ulpin, owner_name, owner_email, description]
    );

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Citizen Landowner', owner_name || 'Citizen', 'Submitted Grievance Petition', `Token No: ${tokenNo} for parcel ${ulpin || 'General'}`]
    );

    res.json({ success: true, tokenNo });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_25 = async (req, res) => {
  try {
    const { email, project_id } = req.query;
    let sql = `
      SELECT g.*, p.project_id 
      FROM grievances g
      LEFT JOIN parcels p ON g.ulpin = p.ulpin
      WHERE 1=1
    `;
    const params = [];

    if (email) {
      sql += ` AND g.owner_email = ?`;
      params.push(email);
    }
    if (project_id) {
      sql += ` AND p.project_id = ?`;
      params.push(project_id);
    }

    sql += ` ORDER BY g.created_at DESC`;

    const grievances = await query(sql, params);
    res.json({ success: true, data: grievances });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_26 = async (req, res) => {
  try {
    const { remarks, official_name } = req.body;
    await run(
      `UPDATE grievances SET status = 'Official Replied', remarks = ? WHERE id = ?`,
      [remarks, req.params.id]
    );

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['District Collectorate', official_name || 'Collector', 'Replied to Grievance Petition', `Replied to Grievance ID: ${req.params.id} with remarks`]
    );

    res.json({ success: true, message: 'Grievance Replied' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_27 = async (req, res) => {
  try {
    await run(`UPDATE grievances SET status = 'Resolved' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Grievance closed by landowner' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};