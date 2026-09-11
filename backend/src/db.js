import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// -------------------------------------------------------------
// Enterprise Multi-Database Architecture (Clean Modular DB Files)
// -------------------------------------------------------------
// 1. auth.db     -> Identity, Roles & Security Audit Logs
// 2. projects.db -> Infrastructure Projects, GIS Parcels & Statutory Stages
// 3. finance.db  -> Compensation Ledger & R&R Packages
// 4. surveys.db  -> Field Inspections & Document Vault
// -------------------------------------------------------------

const authDbPath = path.join(dbDir, 'auth.db');
const projectsDbPath = path.join(dbDir, 'projects.db');
const financeDbPath = path.join(dbDir, 'finance.db');
const surveysDbPath = path.join(dbDir, 'surveys.db');

export const authDb = new sqlite3.Database(authDbPath);
export const projectsDb = new sqlite3.Database(projectsDbPath);
export const financeDb = new sqlite3.Database(financeDbPath);
export const surveysDb = new sqlite3.Database(surveysDbPath);

// Primary Entry Connection
export const db = projectsDb;

const runOn = (database, sql, params = []) => {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Initialize Schemas & Attach Sub-Databases
export const initDb = async () => {
  console.log('Initializing multi-database infrastructure (auth.db, projects.db, finance.db, surveys.db)...');

  // Initialize Auth Schema
  await runOn(authDb, `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runOn(authDb, `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_role TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT DEFAULT '127.0.0.1'
    )
  `);

  await runOn(authDb, `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      unread BOOLEAN DEFAULT 1,
      target_role TEXT DEFAULT 'ALL'
    )
  `);

  // Initialize Projects Schema
  await runOn(projectsDb, `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      ministry TEXT NOT NULL,
      agency TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      project_type TEXT NOT NULL,
      total_land_proposed_ha REAL NOT NULL,
      total_land_acquired_ha REAL DEFAULT 0,
      estimated_budget_cr REAL NOT NULL,
      compensation_disbursed_cr REAL DEFAULT 0,
      affected_families INTEGER DEFAULT 0,
      displaced_families INTEGER DEFAULT 0,
      current_stage_id INTEGER DEFAULT 1,
      status TEXT DEFAULT 'In Progress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      target_completion_date TEXT,
      center_lat REAL,
      center_lng REAL
    )
  `);

  await runOn(projectsDb, `
    CREATE TABLE IF NOT EXISTS parcels (
      id TEXT PRIMARY KEY,
      ulpin TEXT UNIQUE NOT NULL,
      project_id TEXT NOT NULL,
      survey_number TEXT NOT NULL,
      khata_number TEXT NOT NULL,
      village TEXT NOT NULL,
      tehsil TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      area_ha REAL NOT NULL,
      land_type TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_email TEXT DEFAULT 'landowner.public@gmail.com',
      owner_aadhaar_hash TEXT,
      owner_contact TEXT,
      market_rate_sqm REAL NOT NULL,
      statutory_multiplier REAL DEFAULT 1.5,
      status TEXT DEFAULT 'Proposed',
      geojson TEXT NOT NULL,
      lat REAL,
      lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await runOn(projectsDb, `
    CREATE TABLE IF NOT EXISTS workflow_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      stage_number INTEGER NOT NULL,
      stage_name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Pending',
      assigned_role TEXT NOT NULL,
      approval_date TEXT,
      approved_by TEXT,
      comments TEXT,
      document_ref TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await runOn(projectsDb, `
    CREATE TABLE IF NOT EXISTS grievances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_no TEXT UNIQUE NOT NULL,
      ulpin TEXT,
      owner_name TEXT,
      owner_email TEXT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runOn(projectsDb, `
    CREATE TABLE IF NOT EXISTS dynamic_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_text TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_text, target_lang)
    )
  `);

  // Initialize Finance Schema
  await runOn(financeDb, `
    CREATE TABLE IF NOT EXISTS compensation (
      id TEXT PRIMARY KEY,
      parcel_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      land_value_rs REAL NOT NULL,
      structure_assets_rs REAL DEFAULT 0,
      solatium_100_percent_rs REAL NOT NULL,
      interest_amount_rs REAL DEFAULT 0,
      total_assessed_rs REAL NOT NULL,
      total_disbursed_rs REAL DEFAULT 0,
      disbursement_status TEXT DEFAULT 'Assessed',
      pfms_reference_no TEXT,
      bank_account_masked TEXT,
      ifsc_code TEXT,
      payment_date TEXT,
      FOREIGN KEY (parcel_id) REFERENCES parcels(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await runOn(financeDb, `
    CREATE TABLE IF NOT EXISTS rr_records (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parcel_id TEXT,
      family_head_name TEXT NOT NULL,
      category TEXT NOT NULL,
      family_members_count INTEGER NOT NULL,
      is_displaced INTEGER DEFAULT 0,
      housing_allotted TEXT DEFAULT 'Not Applicable',
      employment_status TEXT DEFAULT 'Pending',
      r_and_r_package_value_rs REAL NOT NULL,
      amount_disbursed_rs REAL DEFAULT 0,
      status TEXT DEFAULT 'In Review',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Initialize Surveys Schema
  await runOn(surveysDb, `
    CREATE TABLE IF NOT EXISTS field_surveys (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parcel_id TEXT NOT NULL,
      surveyor_name TEXT NOT NULL,
      surveyor_id TEXT NOT NULL,
      gps_lat REAL NOT NULL,
      gps_lng REAL NOT NULL,
      land_condition TEXT NOT NULL,
      land_type TEXT DEFAULT 'Unirrigated',
      affected_families_count INTEGER DEFAULT 0,
      structures_count INTEGER DEFAULT 0,
      trees_count INTEGER DEFAULT 0,
      is_tribal_land INTEGER DEFAULT 0,
      consent_obtained INTEGER DEFAULT 0,
      inspection_date TEXT NOT NULL,
      photo_url TEXT,
      verification_notes TEXT,
      status TEXT DEFAULT 'Verified',
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (parcel_id) REFERENCES parcels(id)
    )
  `);

  await runOn(surveysDb, `
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_hash_sha256 TEXT NOT NULL,
      is_esign_verified INTEGER DEFAULT 1,
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Attach all domain databases to the primary connection for seamless cross-domain queries
  try {
    await runOn(projectsDb, `ATTACH DATABASE ? AS auth`, [authDbPath]);
  } catch (e) { /* ignore if already attached */ }

  try {
    await runOn(projectsDb, `ATTACH DATABASE ? AS finance`, [financeDbPath]);
  } catch (e) { /* ignore if already attached */ }

  try {
    await runOn(projectsDb, `ATTACH DATABASE ? AS surveys`, [surveysDbPath]);
  } catch (e) { /* ignore if already attached */ }

  // --- Seed & Synchronize Demo Stakeholder Users ---
  console.log('Synchronizing core demo stakeholder users...');
  try {
    const bcrypt = await import('bcryptjs');
    const saltRounds = 10;
    const defaultHash = await bcrypt.default.hash('password123', saltRounds);

    const demoUsers = [
      // 8 Core Stakeholder Roles from LoginPage
      { email: 'collector.palghar@gov.in', password: 'password123', name: 'Dr. Rajesh Verma, IAS (District Collector)', role_key: 'COLLECTOR' },
      { email: 'nhai.proposals@gov.in', password: 'password123', name: 'Rajiv Sharma (Chief Engineer, NHAI)', role_key: 'REQUIRING_BODY' },
      { email: 'slao.palghar@gov.in', password: 'password123', name: 'Vikramaditya Deshmukh (SLAO Officer)', role_key: 'SLAO' },
      { email: 'secy.revenue@maharashtra.gov.in', password: 'password123', name: 'Sanjay Mukherjee, IAS (Principal Secy Revenue)', role_key: 'STATE_GOV' },
      { email: 'pfms.treasury@gov.in', password: 'password123', name: 'Anil Kumar (PFMS Nodal Officer)', role_key: 'PFMS_OFFICER' },
      { email: 'rr.commissioner@gov.in', password: 'password123', name: 'Priya Kulkarni (R&R Commissioner)', role_key: 'RR_OFFICER' },
      { email: 'surveyor.field@gov.in', password: 'password123', name: 'Suresh Patil (Cadastral Inspector)', role_key: 'SURVEYOR' },
      { email: 'landowner.public@gmail.com', password: 'password123', name: 'Priya Sharma (Affected Landowner)', role_key: 'CITIZEN' },

      // Alternative & Legacy Demo Logins (ensures complete compatibility)
      { email: 'nhai.proposer@nhai.gov.in', password: 'password123', name: 'Shri Sanjay Deshmukh (NHAI Proposer)', role_key: 'REQUIRING_BODY' },
      { email: 'finance.pfms@gov.in', password: 'password123', name: 'PFMS Treasury Desk', role_key: 'PFMS_OFFICER' },
      { email: 'collector@bhoomi.gov.in', password: 'password123', name: 'Rajesh Kumar (Collector)', role_key: 'COLLECTOR' },
      { email: 'revenue@bhoomi.gov.in', password: 'password123', name: 'Priya Sharma (Revenue Dept)', role_key: 'STATE_GOV' },
      { email: 'slao@bhoomi.gov.in', password: 'password123', name: 'Vikram Singh (SLAO)', role_key: 'SLAO' },
      { email: 'pfms@bhoomi.gov.in', password: 'password123', name: 'Anita Desai (Finance Officer)', role_key: 'PFMS_OFFICER' },
      { email: 'rr@bhoomi.gov.in', password: 'password123', name: 'Suresh Nair (R&R Commissioner)', role_key: 'RR_OFFICER' },
      { email: 'surveyor@bhoomi.gov.in', password: 'password123', name: 'Amit Gupta (Field Surveyor)', role_key: 'SURVEYOR' },
      { email: 'citizen@bhoomi.gov.in', password: 'password123', name: 'Anil Kumar Patil (Landowner)', role_key: 'CITIZEN' },
    ];

    for (const u of demoUsers) {
      const cleanEmail = u.email.trim().toLowerCase();
      const existing = await new Promise((res) => {
        authDb.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail], (err, row) => {
          if (err) res(null);
          else res(row);
        });
      });

      if (!existing) {
        await runOn(authDb,
          `INSERT INTO users (email, password, name, role_key) VALUES (?, ?, ?, ?)`,
          [cleanEmail, defaultHash, u.name, u.role_key]
        );
      } else {
        await runOn(authDb,
          `UPDATE users SET password = ?, name = ?, role_key = ? WHERE id = ?`,
          [defaultHash, u.name, u.role_key, existing.id]
        );
      }
    }

    // Auto-seed landowners from parcels table if not already present
    try {
      const parcelsOwners = await new Promise((res) => {
        projectsDb.all(`SELECT DISTINCT owner_email, owner_name FROM parcels WHERE owner_email IS NOT NULL AND owner_email != ''`, (err, rows) => {
          if (err) res([]);
          else res(rows || []);
        });
      });

      for (const po of parcelsOwners) {
        const em = po.owner_email.trim().toLowerCase();
        const nm = po.owner_name ? `${po.owner_name} (Affected Landowner)` : 'Affected Landowner';
        await runOn(authDb,
          `INSERT OR IGNORE INTO users (email, password, name, role_key) VALUES (?, ?, ?, 'CITIZEN')`,
          [em, defaultHash, nm]
        );
      }
    } catch (pe) {
      console.warn('Parcels auto-seed notice:', pe.message);
    }

    console.log('Demo stakeholder and landowner accounts synced successfully.');
  } catch (seedErr) {
    console.error('Error during demo users sync:', seedErr);
  }

  console.log('Multi-database architecture (auth.db, projects.db, finance.db, surveys.db) initialized.');
};

export default projectsDb;
