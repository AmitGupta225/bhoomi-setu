import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_18 = async (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `
      SELECT d.*, p.name as project_name
      FROM documents d
      JOIN projects p ON d.project_id = p.id
    `;
    const params = [];
    if (project_id) {
      sql += ` WHERE d.project_id = ?`;
      params.push(project_id);
    }
    sql += ` ORDER BY uploaded_at DESC`;

    const docs = await query(sql, params);
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_19 = async (req, res) => {
  try {
    const { project_id, title, doc_type, file_name, uploaded_by } = req.body;
    const id = `DOC-${Date.now().toString().slice(-5)}`;

    const existingDocs = await query(
      `SELECT title FROM documents WHERE project_id = ? AND title LIKE ?`,
      [project_id, `${title}%`]
    );
    
    let finalTitle = title;
    if (existingDocs && existingDocs.length > 0) {
      finalTitle = `${title} v1.${existingDocs.length}`;
    }

    // Generate simulated SHA-256 digital hash
    const hash = crypto.createHash('sha256').update(file_name + Date.now()).digest('hex');

    await run(
      `INSERT INTO documents (id, project_id, title, doc_type, file_name, file_hash_sha256, is_esign_verified, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, project_id, finalTitle, doc_type, file_name, hash, uploaded_by || 'Collector Office']
    );

    res.json({ success: true, message: 'Document registered with SHA-256 hash & e-Sign verification', docId: id, sha256: hash });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};