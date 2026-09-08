import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_28 = async (req, res) => {
  try {
    const roleKey = req.query.role_key || 'ALL';
    const notifs = await query(`
      SELECT * FROM auth.notifications 
      WHERE target_role = 'ALL' OR target_role = ? 
      ORDER BY created_at DESC LIMIT 50
    `, [roleKey]);
    res.json({ success: true, data: notifs });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_29 = async (req, res) => {
  try {
    const { text, target_role } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Notification text is required.' });
    }
    await run(
      `INSERT INTO auth.notifications (text, target_role) VALUES (?, ?)`,
      [text, target_role || 'ALL']
    );
    res.json({ success: true, message: 'Notification created' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_30 = async (req, res) => {
  try {
    const roleKey = req.body.role_key || 'ALL';
    // Mark as read for this role AND global notifications
    await run(`
      UPDATE auth.notifications 
      SET unread = 0 
      WHERE (target_role = 'ALL' OR target_role = ?) AND unread = 1
    `, [roleKey]);
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};