import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_10 = async (req, res) => {
  try {
    const { status, approved_by, comments } = req.body;
    const approval_date = new Date().toISOString().split('T')[0];

    const currentStage = await queryOne(`SELECT * FROM workflow_stages WHERE id = ?`, [req.params.stageId]);
    if (!currentStage) return res.status(404).json({ success: false, error: 'Stage not found' });

    // Sequential Prerequisite Enforcement: Stage N can only be processed (Approve, Return, Reject) if Stage N-1 is Approved
    if (currentStage.stage_number > 1) {
      const prevStage = await queryOne(
        `SELECT * FROM workflow_stages WHERE project_id = ? AND stage_number = ?`,
        [currentStage.project_id, currentStage.stage_number - 1]
      );
      if (!prevStage || prevStage.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          error: `Prerequisite Violation: Step ${currentStage.stage_number} is locked because Step ${currentStage.stage_number - 1} (${prevStage ? prevStage.stage_name : 'Prior Step'}) has not been Approved yet.`
        });
      }
    }

    await run(
      `UPDATE workflow_stages SET status = ?, approval_date = ?, approved_by = ?, comments = ? WHERE id = ?`,
      [status, approval_date, approved_by || 'Authority Officer', comments, req.params.stageId]
    );

    // If approved, set current project stage to next number
    if (status === 'Approved') {
      const nextStageNum = currentStage.stage_number + 1;
      if (nextStageNum <= 7) {
        await run(`UPDATE projects SET current_stage_id = ? WHERE id = ?`, [nextStageNum, currentStage.project_id]);
        await run(
          `UPDATE workflow_stages SET status = 'In Progress' WHERE project_id = ? AND stage_number = ?`,
          [currentStage.project_id, nextStageNum]
        );
      }
    } else if (status === 'Rejected') {
      await run(`UPDATE projects SET status = 'Rejected' WHERE id = ?`, [currentStage.project_id]);
    } else if (status === 'Returned for Re-Scrutiny') {
      const prevStageNum = currentStage.stage_number - 1;
      if (prevStageNum >= 1) {
        // Revert project back to previous stage
        await run(`UPDATE projects SET current_stage_id = ?, status = 'Objections Raised - Action Required' WHERE id = ?`, [prevStageNum, currentStage.project_id]);
        
        // Set current stage to Pending
        await run(`UPDATE workflow_stages SET status = 'Pending', approval_date = NULL, approved_by = NULL WHERE id = ?`, [currentStage.id]);
        
        // Set previous stage to Returned
        await run(`UPDATE workflow_stages SET status = 'Returned for Re-Scrutiny', comments = ? WHERE project_id = ? AND stage_number = ?`, [comments, currentStage.project_id, prevStageNum]);
      } else {
        await run(`UPDATE projects SET status = 'Objections Raised - Action Required' WHERE id = ?`, [currentStage.project_id]);
      }
    }

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      [currentStage.assigned_role, approved_by || 'Officer', `Updated Stage ${currentStage.stage_number} to ${status}`, comments || 'Statutory scrutiny action']
    );

    res.json({ success: true, message: `Workflow stage updated to ${status}` });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};

export const handler_11 = async (req, res) => {
  try {
    const projId = req.params.id;
    const stage = await queryOne(`SELECT id, stage_number FROM workflow_stages WHERE project_id = ? AND stage_number = 5`, [projId]);
    
    if (!stage) {
      return res.status(404).json({ success: false, error: 'Stage 5 not found' });
    }

    // Mark Stage 5 as Approved
    await run(
      `UPDATE workflow_stages SET status = 'Approved', approval_date = ?, approved_by = 'Field Surveyor', comments = 'Cadastral Survey & Land Demarcation Completed' WHERE id = ?`,
      [new Date().toISOString(), stage.id]
    );

    // Update project current_stage_id to 6
    await run(`UPDATE projects SET current_stage_id = 6 WHERE id = ?`, [projId]);
    
    // Set Stage 6 to In Progress
    await run(`UPDATE workflow_stages SET status = 'In Progress' WHERE project_id = ? AND stage_number = 6`, [projId]);

    await run(
      `INSERT INTO audit_logs (user_role, user_name, action, details) VALUES (?, ?, ?, ?)`,
      ['Cadastral Field Surveyor / Land Inspector', 'Surveyor', 'Approved Stage 5', 'Completed Cadastral Survey & Demarcation']
    );

    res.json({ success: true, message: 'Survey completed and Stage 5 approved' });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};