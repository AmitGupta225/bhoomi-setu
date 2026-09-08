import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_2 = async (req, res) => {
  try {
    const { state, ministry, status } = req.query;
    let sql = `SELECT * FROM projects WHERE 1=1`;
    const params = [];

    if (state) {
      sql += ` AND state = ?`;
      params.push(state);
    }
    if (ministry) {
      sql += ` AND ministry = ?`;
      params.push(ministry);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;
    const projects = await query(sql, params);
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_3 = async (req, res) => {
  try {
    const project = await queryOne(`SELECT * FROM projects WHERE id = ?`, [req.params.id]);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const stages = await query(`SELECT * FROM workflow_stages WHERE project_id = ? ORDER BY stage_number ASC`, [req.params.id]);
    const parcels = await query(`SELECT * FROM parcels WHERE project_id = ?`, [req.params.id]);
    const documents = await query(`SELECT * FROM documents WHERE project_id = ?`, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...project,
        stages,
        parcels,
        documents
      }
    });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_4 = async (req, res) => {
  try {
    const { name, ministry, agency, state, district, project_type, total_land_proposed_ha, estimated_budget_cr, target_completion_date, center_lat, center_lng } = req.body;
    const id = `PROJ-NEW-${Date.now().toString().slice(-4)}`;
    const code = `${agency.split(' ')[0]}/NEW/${state.slice(0, 2).toUpperCase()}/2026/${Math.floor(10 + Math.random() * 90)}`;

    await run(
      `INSERT INTO projects (id, code, name, ministry, agency, state, district, project_type, total_land_proposed_ha, estimated_budget_cr, target_completion_date, center_lat, center_lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, ministry, agency, state, district, project_type, total_land_proposed_ha, estimated_budget_cr, target_completion_date, center_lat || 20.5937, center_lng || 78.9629]
    );

    // Create 10 workflow stages based on SIH 2026 Problem Statement
    const defaultStages = [
      { num: 1, name: 'Proposal Submission & SIA Initiation', desc: 'Submitted by Land Requiring Body', role: 'Land Requiring Body (NHAI / Railways / Ministry)' },
      { num: 2, name: 'SIA Review & Public Hearing', desc: 'Social Impact study team assignment', role: 'District Collectorate / District Administration' },
      { num: 3, name: 'R&R Scheme Preparation & Approval', desc: 'R&R package completion', role: 'Rehabilitation & Resettlement Commissioner' },
      { num: 4, name: 'Preliminary Gazette Notification (Sec 11)', desc: 'Preliminary gazette release', role: 'State Government / Revenue Department' },
      { num: 5, name: 'Cadastral Survey & Land Demarcation (Sec 12)', desc: 'Field inspector maps land parcels', role: 'Cadastral Field Surveyor / Land Inspector' },
      { num: 6, name: 'Collector\'s Objection Enquiry', desc: 'Hear Objections', role: 'District Collectorate / District Administration' },
      { num: 7, name: 'Final Acquisition Declaration (Sec 19)', desc: 'Declaration publication', role: 'State Government / Revenue Department' },
      { num: 8, name: 'Land Valuation & Award (Sec 23)', desc: 'Valuation and award declaration', role: 'Land Acquiring Authority (Special Land Acquisition Officer)' },
      { num: 9, name: 'Compensation Disbursement', desc: 'PFMS DBT payment & land handover', role: 'Public Financial Management System Officer (Finance)' },
      { num: 10, name: 'Physical Possession & Handover', desc: 'Physical Possession & Handover', role: 'District Collectorate / District Administration' }
    ];

    for (const st of defaultStages) {
      let status = 'Pending';
      let approval_date = null;
      let approved_by = null;
      let comments = null;
      
      if (st.num === 1) {
        status = 'Approved';
        approval_date = new Date().toISOString();
        approved_by = 'System (Auto)';
        comments = 'Proposal successfully submitted by Land Requiring Body';
      } else if (st.num === 2) {
        status = 'In Progress';
      }

      await run(
        `INSERT INTO workflow_stages (project_id, stage_number, stage_name, description, status, assigned_role, approval_date, approved_by, comments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, st.num, st.name, st.desc, status, st.role, approval_date, approved_by, comments]
      );
    }

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Land Requiring Body', 'Ministry Officer', 'Submitted New Land Acquisition Proposal', `Created Proposal ${code} for ${name}`]
    );

    res.json({ success: true, message: 'Proposal submitted successfully', projectId: id });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_5 = async (req, res) => {
  try {
    const { name, ministry, agency, state, district, project_type, total_land_proposed_ha, estimated_budget_cr, project_category, target_completion_date } = req.body;

    await run(
      `UPDATE projects SET 
        name = COALESCE(?, name), 
        ministry = COALESCE(?, ministry), 
        agency = COALESCE(?, agency), 
        state = COALESCE(?, state), 
        district = COALESCE(?, district), 
        project_type = COALESCE(?, project_type), 
        total_land_proposed_ha = COALESCE(?, total_land_proposed_ha), 
        estimated_budget_cr = COALESCE(?, estimated_budget_cr),
        project_category = COALESCE(?, project_category),
        target_completion_date = COALESCE(?, target_completion_date),
        status = 'In Progress',
        current_stage_id = 2
       WHERE id = ?`,
      [name, ministry, agency, state, district, project_type, total_land_proposed_ha, estimated_budget_cr, project_category, target_completion_date, req.params.id]
    );

    // Step 1 is auto-approved upon resubmission
    await run(
      `UPDATE workflow_stages SET status = 'Approved', approval_date = ?, approved_by = 'System (Auto)', comments = 'Objections Rectified & Proposal Resubmitted' WHERE project_id = ? AND stage_number = 1`,
      [new Date().toISOString(), req.params.id]
    );

    // Step 2 goes back to In Progress for Collector Scrutiny
    await run(
      `UPDATE workflow_stages SET status = 'In Progress', comments = 'Awaiting SIA Review after rectification' WHERE project_id = ? AND stage_number = 2`,
      [req.params.id]
    );

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Land Requiring Body', 'Ministry Officer', 'Resubmitted Rectified Land Acquisition Proposal', `Updated proposal parameters: Area=${total_land_proposed_ha} Ha, Budget=₹${estimated_budget_cr} Cr for ${req.params.id}`]
    );

    res.json({ success: true, message: 'Proposal rectified & resubmitted for scrutiny' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};