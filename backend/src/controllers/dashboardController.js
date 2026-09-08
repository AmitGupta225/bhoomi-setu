import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



export const handler_1 = async (req, res) => {
  try {
    const kpiSummary = await queryOne(`
      SELECT 
        COUNT(id) as total_projects,
        SUM(total_land_proposed_ha) as total_proposed_ha,
        SUM(total_land_acquired_ha) as total_acquired_ha,
        SUM(estimated_budget_cr) as total_budget_cr,
        SUM(compensation_disbursed_cr) as total_compensation_cr,
        SUM(affected_families) as total_affected_families,
        SUM(displaced_families) as total_displaced_families
      FROM projects
    `);

    const stateBreakdown = await query(`
      SELECT 
        state, 
        COUNT(id) as project_count, 
        SUM(total_land_proposed_ha) as proposed_ha,
        SUM(total_land_acquired_ha) as acquired_ha,
        SUM(compensation_disbursed_cr) as disbursed_cr
      FROM projects 
      GROUP BY state
    `);

    const ministryBreakdown = await query(`
      SELECT 
        ministry, 
        COUNT(id) as project_count, 
        SUM(estimated_budget_cr) as budget_cr
      FROM projects 
      GROUP BY ministry
    `);

    const parcelStatusCounts = await query(`
      SELECT status, COUNT(id) as count, SUM(area_ha) as total_area_ha
      FROM parcels
      GROUP BY status
    `);

    const recentAudit = await query(`
      SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 6
    `);

    res.json({
      success: true,
      kpis: kpiSummary,
      stateBreakdown,
      ministryBreakdown,
      parcelStatusCounts,
      recentAudit
    });
  } catch (err) {
    console.error("500 ERROR:", err); res.status(500).json({ success: false, error: err.message });
  }
};