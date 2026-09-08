import { authDb } from '../db.js';
import bcrypt from 'bcryptjs';

// Helper to query authDb directly (avoids relying on ATTACH resolution)
const queryAuthOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    authDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const handler_0 = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    console.log(`Login attempt: ${email}`);

    const user = await queryAuthOne(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);

    if (!user) {
      console.log(`No user found for email: ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
    }

    console.log(`User found: ${user.name}, role: ${user.role_key}`);

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      console.log(`Password mismatch for: ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleKey: user.role_key
      }
    });
  } catch (err) {
    console.error("500 ERROR in login:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};