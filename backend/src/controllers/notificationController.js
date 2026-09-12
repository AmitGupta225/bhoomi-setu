import { query, run } from '../db.js';

const executeNotificationQuery = async (queryFn, sql, params = []) => {
  try {
    return await queryFn(sql, params);
  } catch (err) {
    if (err.message && err.message.includes('auth.notifications')) {
      const fallbackSql = sql.replace(/auth\.notifications/g, 'notifications');
      return await queryFn(fallbackSql, params);
    }
    throw err;
  }
};

export const handler_28 = async (req, res) => {
  try {
    const roleKey = req.query.role_key || 'ALL';
    const notifs = await executeNotificationQuery(
      query,
      `SELECT * FROM auth.notifications 
       WHERE target_role = 'ALL' OR target_role = ? 
       ORDER BY created_at DESC LIMIT 50`,
      [roleKey]
    );
    res.json({ success: true, data: notifs });
  } catch (err) {
    console.error("500 ERROR in getNotifications:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_29 = async (req, res) => {
  try {
    const { text, target_role } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Notification text is required.' });
    }
    await executeNotificationQuery(
      run,
      `INSERT INTO auth.notifications (text, target_role, unread) VALUES (?, ?, 1)`,
      [text, target_role || 'ALL']
    );
    res.json({ success: true, message: 'Notification created' });
  } catch (err) {
    console.error("500 ERROR in createNotification:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_30 = async (req, res) => {
  try {
    const roleKey = req.body.role_key || 'ALL';
    await executeNotificationQuery(
      run,
      `UPDATE auth.notifications 
       SET unread = 0 
       WHERE (target_role = 'ALL' OR target_role = ?) AND unread = 1`,
      [roleKey]
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error("500 ERROR in markNotificationsRead:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};