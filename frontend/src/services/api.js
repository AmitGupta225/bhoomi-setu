import axios from 'axios';

// In local dev, Vite proxy forwards /api → localhost:5001
// On Render (static site), VITE_API_BASE_URL must be set to the full backend URL e.g. https://bhoomi-setu-api.onrender.com/api
let rawApiBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
if (rawApiBase.endsWith('/')) rawApiBase = rawApiBase.slice(0, -1);
const API_BASE = rawApiBase;

export const loginUser = async (email, password) => {
  try {
    const res = await axios.post(`${API_BASE}/login`, { email, password });
    return res.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return err.response.data;
    }
    return { success: false, error: 'Network error or backend offline' };
  }
};

export const fetchDashboardAnalytics = async () => {
  try {
    const res = await axios.get(`${API_BASE}/analytics/dashboard`);
    return res.data;
  } catch (err) {
    console.warn('Backend offline, using fallback mock data', err);
    return {
      success: true,
      kpis: {
        total_projects: 5,
        total_proposed_ha: 8211.45,
        total_acquired_ha: 6151.50,
        total_budget_cr: 25260.00,
        total_compensation_cr: 17211.05,
        total_affected_families: 6670,
        total_displaced_families: 1650
      },
      stateBreakdown: [
        { state: 'Maharashtra', project_count: 1, proposed_ha: 1450.5, acquired_ha: 980.2, disbursed_cr: 3120.4 },
        { state: 'Uttar Pradesh', project_count: 1, proposed_ha: 820.75, acquired_ha: 740.0, disbursed_cr: 2890.15 },
        { state: 'Madhya Pradesh', project_count: 1, proposed_ha: 2100.0, acquired_ha: 890.5, disbursed_cr: 4100.0 },
        { state: 'Tamil Nadu', project_count: 1, proposed_ha: 640.2, acquired_ha: 590.8, disbursed_cr: 1980.5 },
        { state: 'Rajasthan', project_count: 1, proposed_ha: 3200.0, acquired_ha: 2950.0, disbursed_cr: 5120.0 }
      ],
      ministryBreakdown: [
        { ministry: 'Ministry of Road Transport & Highways', project_count: 2, budget_cr: 7000.0 },
        { ministry: 'Ministry of Railways', project_count: 1, budget_cr: 3200.0 },
        { ministry: 'Ministry of Jal Shakti', project_count: 1, budget_cr: 9460.0 },
        { ministry: 'Ministry of New and Renewable Energy', project_count: 1, budget_cr: 5600.0 }
      ],
      parcelStatusCounts: [
        { status: 'Acquired', count: 18, total_area_ha: 6151.50 },
        { status: 'Joint Measurement (JMS)', count: 8, total_area_ha: 1240.20 },
        { status: 'Section 11 Notification', count: 6, total_area_ha: 580.00 },
        { status: 'Section 19 Declaration', count: 4, total_area_ha: 239.75 }
      ],
      recentAudit: [
        { id: 1, user_role: 'District Collector', user_name: 'Dr. R. K. Sharma', action: 'Approved Sec 23 Award', timestamp: new Date().toISOString() },
        { id: 2, user_role: 'PFMS Nodal Officer', user_name: 'DBT Engine', action: 'Disbursed ₹ 3,120 Cr', timestamp: new Date().toISOString() }
      ]
    };
  }
};

export const fetchProjects = async (params = {}) => {
  try {
    const res = await axios.get(`${API_BASE}/projects`, { params });
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const fetchProjectDetail = async (id) => {
  try {
    const res = await axios.get(`${API_BASE}/projects/${id}`);
    return res.data.data;
  } catch (err) {
    return null;
  }
};

export const createProject = async (projectData) => {
  const res = await axios.post(`${API_BASE}/projects`, projectData);
  return res.data;
};

export const updateProject = async (id, projectData) => {
  const res = await axios.put(`${API_BASE}/projects/${id}`, projectData);
  return res.data;
};

export const fetchParcels = async (params = {}) => {
  try {
    const res = await axios.get(`${API_BASE}/parcels`, { params });
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const createParcel = async (parcelData) => {
  const res = await axios.post(`${API_BASE}/parcels`, parcelData);
  return res.data;
};

export const updateParcel = async (id, parcelData) => {
  const res = await axios.put(`${API_BASE}/parcels/${id}`, parcelData);
  return res.data;
};

export const deleteParcel = async (id, role, userName) => {
  const res = await axios.delete(`${API_BASE}/parcels/${id}`, { data: { role, user_name: userName } });
  return res.data;
};

export const fetchCompensationRecords = async (projectId) => {
  try {
    const res = await axios.get(`${API_BASE}/compensation`, { params: { project_id: projectId } });
    return res.data.data;
  } catch (err) {
    return [];
  }
};export const disburseCompensation = async (compensationId) => {
  const res = await axios.post(`${API_BASE}/compensation/disburse`, { compensation_id: compensationId });
  return res.data;
};

export const putCompensationHold = async (compensationId) => {
  const res = await axios.put(`${API_BASE}/compensation/${compensationId}/hold`);
  return res.data;
};export const updateWorkflowStage = async (stageId, payload) => {
  const res = await axios.put(`${API_BASE}/workflow/${stageId}`, payload);
  return res.data;
};

export const fetchRRRecords = async (projectId) => {
  try {
    const res = await axios.get(`${API_BASE}/rr`, { params: { project_id: projectId } });
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const fetchFieldSurveys = async (projectId) => {
  try {
    const res = await axios.get(`${API_BASE}/field-surveys`, { params: projectId ? { project_id: projectId } : {} });
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const submitFieldSurvey = async (payload) => {
  const res = await axios.post(`${API_BASE}/field-surveys`, payload);
  return res.data;
};

export const syncFieldSurveysBatch = async (items) => {
  const res = await axios.post(`${API_BASE}/field-surveys/sync-batch`, { items });
  return res.data;
};

export const resolveFieldConflict = async (payload) => {
  const res = await axios.post(`${API_BASE}/field-surveys/resolve-conflict`, payload);
  return res.data;
};

export const fetchDocuments = async (projectId) => {
  try {
    const res = await axios.get(`${API_BASE}/documents`, { params: projectId ? { project_id: projectId } : {} });
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const approveSurvey = async (projectId) => {
  const res = await axios.post(`${API_BASE}/projects/${projectId}/approve-survey`);
  return res.data;
};

export const registerDocument = async (payload) => {
  const res = await axios.post(`${API_BASE}/documents`, payload);
  return res.data;
};

export const fetchAuditLogs = async () => {
  try {
    const res = await axios.get(`${API_BASE}/audit-logs`);
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const checkULPIN = async (ulpin) => {
  const res = await axios.get(`${API_BASE}/integrations/ulpin-check/${ulpin}`);
  return res.data;
};

export const fetchMyLandRecord = async (email) => {
  try {
    const res = await axios.get(`${API_BASE}/citizen/my-land`, { params: { email } });
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const submitGrievance = async (payload) => {
  try {
    const res = await axios.post(`${API_BASE}/citizen/grievance`, payload);
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const fetchGrievances = async (email = null, projectId = null) => {
  try {
    const params = {};
    if (email) params.email = email;
    if (projectId) params.project_id = projectId;
    const res = await axios.get(`${API_BASE}/grievances`, { params });
    return res.data.data;
  } catch (err) {
    return [];
  }
};

export const resolveGrievance = async (id, payload) => {
  try {
    const res = await axios.put(`${API_BASE}/grievances/${id}/resolve`, payload);
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const closeGrievance = async (id) => {
  try {
    const res = await axios.put(`${API_BASE}/grievances/${id}/close`);
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// -------------------------------------------------------------
// Notifications API
// -------------------------------------------------------------
export const fetchNotifications = async (roleKey) => {
  try {
    const res = await axios.get(`${API_BASE}/notifications`, { params: roleKey ? { role_key: roleKey } : {} });
    return res.data?.data || [];
  } catch (err) {
    return [];
  }
};

export const createNotification = async (text, targetRole = 'ALL') => {
  const res = await axios.post(`${API_BASE}/notifications`, { text, target_role: targetRole });
  return res.data;
};

export const markAllNotificationsRead = async (roleKey) => {
  const res = await axios.put(`${API_BASE}/notifications/read`, { role_key: roleKey });
  return res.data;
};

export const fetchUlpinData = async (ulpin) => {
  const res = await axios.get(`${API_BASE}/bhu-naksha/verify/${ulpin}`);
  return res.data;
};

export const updateParcelStatus = async (id, status, role, userName) => {
  const res = await axios.put(`${API_BASE}/parcels/${id}/status`, { status, role, user_name: userName });
  return res.data;
};

export const translateDynamicText = async (text, targetLang, sourceLang = 'en') => {
  try {
    const res = await axios.post(`${API_BASE}/translate`, { text, targetLang, sourceLang });
    return res.data;
  } catch (err) {
    return { success: false, translated: text };
  }
};

