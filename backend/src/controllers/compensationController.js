import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_12 = async (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `
      SELECT c.*, p.survey_number, p.owner_name, p.village, p.district, pr.name as project_name,
             (SELECT approval_date FROM workflow_stages WHERE project_id = c.project_id AND stage_number = 5) as award_approval_date
      FROM compensation c
      JOIN parcels p ON c.parcel_id = p.id
      JOIN projects pr ON c.project_id = pr.id
    `;
    const params = [];
    if (project_id) {
      sql += ` WHERE c.project_id = ?`;
      params.push(project_id);
    }
    const data = await query(sql, params);
    res.json({ success: true, data });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_13 = async (req, res) => {
  try {
    const record = await queryOne(`SELECT * FROM compensation WHERE id = ?`, [req.params.id]);
    if (!record) return res.status(404).json({ success: false, error: 'Compensation record not found' });

    await run(`UPDATE compensation SET disbursement_status = 'On Hold' WHERE id = ?`, [req.params.id]);
    
    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Finance Officer', 'PFMS Dashboard', 'Put Compensation On Hold', `Held payment for ${record.parcel_id} pending bank verification`]
    );

    res.json({ success: true, message: 'Payment marked as On Hold for verification' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_14 = async (req, res) => {
  try {
    const { compensation_id } = req.body;
    const record = await queryOne(`SELECT * FROM compensation WHERE id = ?`, [compensation_id]);
    if (!record) return res.status(404).json({ success: false, error: 'Compensation record not found' });

    // Statutory Check: PFMS Disbursement requires Stage 5 (Award Declaration & Valuation) to be Approved
    const awardStage = await queryOne(
      `SELECT * FROM workflow_stages WHERE project_id = ? AND stage_number = 5`,
      [record.project_id]
    );

    if (awardStage && awardStage.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        error: `PFMS Disbursement Locked: Statutory Award Declaration (Stage 5) is currently '${awardStage.status}'. Compensation payouts cannot be released until Stage 5 Award is approved by SLAO/Collectorate.`
      });
    }

    const pfms_ref = `PFMS-2026-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const payment_date = new Date().toISOString().split('T')[0];

    await run(
      `UPDATE compensation SET total_disbursed_rs = total_assessed_rs, disbursement_status = 'Disbursed', pfms_reference_no = ?, payment_date = ? WHERE id = ?`,
      [pfms_ref, payment_date, compensation_id]
    );

    // Update parcel status to 'Possessed'
    await run(`UPDATE parcels SET status = 'Possessed' WHERE id = ?`, [record.parcel_id]);

    // Update project disbursed amount
    await run(
      `UPDATE projects SET compensation_disbursed_cr = compensation_disbursed_cr + (? / 10000000.0) WHERE id = ?`,
      [record.total_assessed_rs, record.project_id]
    );

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['PFMS DBT System', 'Direct Benefit Transfer Officer', 'Triggered Compensation Disbursement via PFMS', `Disbursed ₹ ${(record.total_assessed_rs / 100000).toFixed(2)} Lakhs (Ref: ${pfms_ref})`]
    );

    res.json({
      success: true,
      message: 'Direct Benefit Transfer payment successfully executed via PFMS gateway.',
      pfmsReference: pfms_ref,
      disbursedAmount: record.total_assessed_rs
    });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};