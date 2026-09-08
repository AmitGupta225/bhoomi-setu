import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_22 = async (req, res) => {
  try {
    const logs = await query(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50`);
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_23 = async (req, res) => {
  try {
    const { ulpin } = req.params;
    const logs = await query(
      `SELECT * FROM audit_logs WHERE details LIKE ? ORDER BY timestamp DESC`,
      [`%${ulpin}%`]
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};