import React, { useEffect, useState } from 'react';
import { fetchProjects, fetchProjectDetail, updateProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  GitMerge, 
  CheckCircle2, 
  Clock, 
  Map, 
  IndianRupee, 
  FileCheck2, 
  XCircle, 
  RotateCcw, 
  MapPin, 
  ShieldAlert,
  ArrowUpRight,
  Edit,
  AlertTriangle
} from 'lucide-react';

const cleanStageName = (name) => {
  if (!name) return '';
  return name
    .replace(/^Form \d+\s*[-:]?\s*/gi, '')
    .replace(/^Section \d+(\(\d+\))?\s*[-:]?\s*/gi, '')
    .replace(/\bForm \d+\s*/gi, '')
    .replace(/\bSection \d+(\(\d+\))?\s*/gi, '')
    .trim();
};

export const ProjectStatus = () => {
  const { activeRole, selectedProjectId, setSelectedProjectId, setActiveTab, isTabAllowed, addNotification, notifyProjectUpdated , t } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectDetail, setProjectDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);
  
  // Rectification Form State (for Proposer when returned for re-scrutiny)
  const [showRectifyForm, setShowRectifyForm] = useState(false);
  const [rectifyData, setRectifyData] = useState({});
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const projList = await fetchProjects();
      setProjects(projList);
      if (selectedProjectId) {
        const detail = await fetchProjectDetail(selectedProjectId);
        setProjectDetail(detail);
        if (detail) {
          setRectifyData({
            name: detail.name,
            ministry: detail.ministry,
            agency: detail.agency,
            state: detail.state,
            district: detail.district,
            project_type: detail.project_type,
            project_category: detail.project_category,
            total_land_proposed_ha: detail.total_land_proposed_ha,
            estimated_budget_cr: detail.estimated_budget_cr,
            target_completion_date: detail.target_completion_date
          });
          if (detail.stages) {
            setActiveStage(detail.stages.find(s => s.status === 'In Progress' || s.status === 'Returned for Re-Scrutiny') || detail.stages[0]);
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  // Proposer Action: Submit Rectified Proposal
  const handleRectifySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProject(selectedProjectId, rectifyData);
      if (res.success) {
        setActionSuccess('Rectified proposal resubmitted to Collectorate for re-scrutiny!');
        if (addNotification) {
          addNotification(`[${rectifyData.name}] Proposal Rectified & Resubmitted`, 'collector');
        }
        if (notifyProjectUpdated) notifyProjectUpdated();

        setShowRectifyForm(false);
        const updated = await fetchProjectDetail(selectedProjectId);
        setProjectDetail(updated);
        if (updated && updated.stages) {
          const freshStage = updated.stages.find(s => s.stage_number === 1);
          setActiveStage(freshStage || updated.stages[0]);
        }
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      alert('Error resubmitting proposal: ' + err.message);
    }
  };

  if (loading || !projectDetail) {
    return (
      <div className="p-4 lg:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded-xl w-64"></div>
        <div className="h-64 bg-slate-900 rounded-2xl"></div>
      </div>
    );
  }

  const { stages } = projectDetail;
  const isRequiringBody = activeRole?.id === 'requiring_body';
  const isCurrentStageReturned = activeStage?.status === 'Returned for Re-Scrutiny';
  
  const acquiredPercent = Math.round((projectDetail.total_land_acquired_ha / projectDetail.total_land_proposed_ha) * 100) || 0;

  const INDIAN_STATES_AND_UTS = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const PREDEFINED_MINISTRIES = [
    'Ministry of Road Transport and Highways (MoRTH)',
    'Ministry of Railways (MoR)',
    'Ministry of Jal Shakti (Water Resources & River Development)',
    'Ministry of Power & Renewable Energy',
    'Ministry of Ports, Shipping and Waterways',
    'Ministry of Housing and Urban Affairs (MoHUA)',
    'Ministry of Civil Aviation',
    'Ministry of Heavy Industries',
    'Ministry of Environment, Forest and Climate Change (MoEFCC)'
  ];

  const PREDEFINED_AGENCIES = [
    'National Highways Authority of India (NHAI)',
    'Indian Railways (IR / Dedicated Freight Corridor)',
    'National Water Development Agency (NWDA)',
    'NTPC Limited / Power Grid Corporation',
    'Inland Waterways Authority of India (IWAI)',
    'State Road Development Corporation',
    'State Industrial Development Corporation'
  ];

  return (
    <div className="px-2.5 sm:px-4 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-8 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <GitMerge className="w-4 h-4 shrink-0" />
            <span>{t('Land Acquisition Project Monitoring')}</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white truncate">{t('Project Status & Step Timeline')}</h1>
          <p className="text-xs text-slate-400">{t('Track project milestones, proposal details, land acquisition progress, and official updates.')}</p>
        </div>

        {/* Quick Cross-System Links */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isTabAllowed('scrutiny') && (
            <button
              onClick={() => setActiveTab('scrutiny')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{t('Official Scrutiny Desk')}</span>
            </button>
          )}
          {isTabAllowed('gis') && (
            <button
              onClick={() => setActiveTab('gis')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
            >
              <Map className="w-4 h-4 text-cyan-400" />
              <span>{t('GIS Map')}</span>
            </button>
          )}
          {isTabAllowed('compensation') && (
            <button
              onClick={() => setActiveTab('compensation')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
            >
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>{t('PFMS Payouts')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body Executive Summary Card - FULL Department Name (No Truncation) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-mono text-emerald-400 font-bold px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded-md">
                {projectDetail.code}
              </span>
              <span className="text-slate-300 font-semibold">{t(projectDetail.agency)}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white font-heading">{t(projectDetail.name)}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{t('Location:')} <strong>{t(projectDetail.district)}, {t(projectDetail.state)}</strong></span>
            </p>
          </div>

          <div className="w-fit self-start lg:self-auto px-3.5 py-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col items-start lg:items-end gap-1 shadow-sm shrink-0">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{t('Current Milestone')}</span>
            <div className="text-xs font-extrabold text-emerald-300 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{t('Step')} {projectDetail.current_stage_id}: {t(projectDetail.status)}</span>
            </div>
          </div>
        </div>

        {/* 4 Summary KPI Metric Widgets in Main Body */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 text-[11px] block">{t('Land Acquisition Progress:')}</span>
            <div className="flex items-center justify-between">
              <strong className="text-emerald-400 font-mono text-sm">{acquiredPercent}% {t('Acquired')}</strong>
              <span className="text-[10px] text-slate-400 font-mono">({projectDetail.total_land_acquired_ha} / {projectDetail.total_land_proposed_ha} {t('Ha')})</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${acquiredPercent}%` }}></div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 text-[11px] block">{t('Compensation Disbursed:')}</span>
            <div className="text-cyan-400 font-mono text-sm font-bold">₹ {projectDetail.compensation_disbursed_cr} {t('Cr')}</div>
            <span className="text-[10px] text-slate-500 block">{t('Total Budget:')} ₹ {projectDetail.estimated_budget_cr} {t('Cr')}</span>
          </div>

          {/* Full Sponsoring Ministry & Agency Display - NO TRUNCATION */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 text-[11px] block">{t('Sponsoring Ministry & Agency:')}</span>
            <div className="text-slate-200 font-semibold text-xs leading-normal">{t(projectDetail.ministry)}</div>
            <div className="text-[11px] text-emerald-400 font-medium leading-normal">{t(projectDetail.agency)}</div>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 text-[11px] block">{t('Target Completion Date:')}</span>
            <div className="text-amber-400 font-semibold text-xs">{projectDetail.target_completion_date || '2028-12-31'}</div>
            <div className="pt-1.5 border-t border-slate-800/80 mt-1.5">
              <span className="text-slate-500 text-[10px] block font-mono">{t('Predictive Analytics (Est. Date)')}</span>
              <span className="text-[11px] text-emerald-400 block font-bold tracking-wide">2028-11-15 ({t('45 Days Early')})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 10-Step Process Timeline Cards - FULL UNTRUNCATED TEXT DISPLAY */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white font-heading">{t('10-Step Sequential Legal Process Pipeline')}</h2>
            <p className="text-xs text-slate-400">{t('RFCTLARR Act 2013 Statutory Progression Workflow')}</p>
          </div>
          <span className="text-xs text-slate-300 font-mono bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">{t('Project Code:')} <strong className="text-emerald-400">{projectDetail.code}</strong>
          </span>
        </div>

        {/* Timeline Cards Grid - Spacious layout displaying complete stage name without cutoffs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stages.map((st) => {
            const isCompleted = st.status === 'Approved';
            const isReturned = st.status === 'Returned for Re-Scrutiny';
            const isRejected = st.status === 'Rejected';
            const isInProgress = st.status === 'In Progress';
            const isSelected = activeStage?.id === st.id;

            return (
              <button
                key={st.id}
                onClick={() => setActiveStage(st)}
                className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 relative ${
                  isSelected 
                    ? 'bg-slate-800 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500' 
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/40'
                    : isReturned
                    ? 'bg-amber-950/30 border-amber-500/50 hover:bg-amber-950/50'
                    : isRejected
                    ? 'bg-rose-950/30 border-rose-500/50 hover:bg-rose-950/50'
                    : isInProgress
                    ? 'bg-blue-950/20 border-blue-500/40 hover:bg-blue-950/40'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-extrabold font-mono px-3.5 py-1.5 rounded-xl border shadow-sm ${
                    isCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : isReturned ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : isRejected ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {t('Step')} {st.stage_number}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />{t('Approved')}</span>) : isReturned ? (<span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <RotateCcw className="w-4 h-4 shrink-0" />{t('Returned')}</span>) : isRejected ? (<span className="text-xs font-extrabold text-rose-400 flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        <XCircle className="w-4 h-4 shrink-0" />{t('Rejected')}</span>) : isInProgress ? (<span className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <Clock className="w-4 h-4 text-blue-400 animate-spin shrink-0" />{t('In Progress')}</span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 px-3 py-1 bg-slate-800/60 border border-slate-800 rounded-xl">{t('Pending')}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className={`text-sm font-bold leading-normal break-words ${isCompleted ? 'text-emerald-200' : isReturned ? 'text-amber-200' : isRejected ? 'text-rose-200' : 'text-slate-200'}`}>
                    {t(cleanStageName(st.stage_name))}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">{t('Assigned:')} <strong className="text-slate-200 font-semibold">{t(st.assigned_role)}</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Step Information Details Card */}
      {activeStage && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold">{t('Step')} {activeStage.stage_number} {t('of')} 10</span>
              <h2 className="text-lg font-bold text-white font-heading">{t(cleanStageName(activeStage.stage_name))}</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              activeStage.status === 'Approved' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : activeStage.status === 'Returned for Re-Scrutiny'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : activeStage.status === 'Rejected'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {t('Status:')} {t(activeStage.status)}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {t(activeStage.description)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-400">{t('Assigned Authority Role:')}</span>
              <div className="font-semibold text-white">{t(activeStage.assigned_role)}</div>
            </div>

            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-400">{t('Action Date:')}</span>
              <div className="font-semibold text-emerald-400">{activeStage.approval_date || t('Pending Action')}</div>
            </div>

            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-400">{t('Approved / Verified By:')}</span>
              <div className="font-semibold text-slate-200">{t(activeStage.approved_by) || t('Awaiting Review')}</div>
            </div>
          </div>

          {activeStage.comments && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
              activeStage.status === 'Returned for Re-Scrutiny'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : activeStage.status === 'Rejected'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-slate-800/60 border-slate-700 text-slate-200'
            }`}>
              <span className="font-bold block uppercase tracking-wider text-[10px]">{t('Official Remarks & Objections:')}</span>
              <p className="font-medium">{t(activeStage.comments)}</p>
            </div>
          )}

          {actionSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{t(actionSuccess)}</span>
            </div>
          )}

          {/* Proposer Rectification / Edit Panel */}
          {(isCurrentStageReturned || activeStage?.stage_number === 1) && isRequiringBody && (
            <div className={`p-4 border rounded-2xl space-y-3 ${isCurrentStageReturned ? 'bg-amber-950/50 border-amber-500/50' : 'bg-slate-900/50 border-slate-700/50'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className={`flex items-center gap-2 text-xs font-bold ${isCurrentStageReturned ? 'text-amber-300' : 'text-slate-300'}`}>
                  {isCurrentStageReturned ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> : <Edit className="w-4 h-4 text-slate-400 shrink-0" />}
                  <span>{isCurrentStageReturned ? t('Objections Raised by Collectorate') : t('Edit Proposal Details')}</span>
                </div>
                <button
                  onClick={() => setShowRectifyForm(!showRectifyForm)}
                  className={`px-3 py-1.5 font-bold rounded-xl text-xs transition flex items-center gap-1 ${isCurrentStageReturned ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{showRectifyForm ? t('Cancel Edit') : (isCurrentStageReturned ? t('Rectify & Resubmit Proposal Details') : t('Edit Project Details'))}</span>
                </button>
              </div>

              {showRectifyForm && (
                <form onSubmit={handleRectifySubmit} className={`pt-3 border-t space-y-4 text-xs animate-in fade-in ${isCurrentStageReturned ? 'border-amber-500/30' : 'border-slate-700'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-slate-300 block mb-1">{t('Project Name:')}</label>
                      <input
                        type="text"
                        required
                        value={rectifyData.name || ''}
                        onChange={(e) => setRectifyData({ ...rectifyData, name: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Government Body / Ministry:')}</label>
                      <select
                        value={PREDEFINED_MINISTRIES.includes(rectifyData.ministry) ? rectifyData.ministry : 'CUSTOM'}
                        onChange={(e) => setRectifyData({ ...rectifyData, ministry: e.target.value === 'CUSTOM' ? '' : e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        {PREDEFINED_MINISTRIES.map((m, idx) => (
                          <option key={idx} value={m}>{t(m)}</option>
                        ))}
                        <option value="CUSTOM">+ {t('Custom Ministry')}</option>
                      </select>
                      {!PREDEFINED_MINISTRIES.includes(rectifyData.ministry) && (
                        <input
                          type="text"
                          required
                          placeholder={t('Enter Custom Ministry')}
                          value={rectifyData.ministry || ''}
                          onChange={(e) => setRectifyData({ ...rectifyData, ministry: e.target.value })}
                          className="w-full p-2.5 mt-2 bg-slate-950 border border-amber-500/50 rounded-xl text-white focus:outline-none"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Project Executing Agency:')}</label>
                      <select
                        value={PREDEFINED_AGENCIES.includes(rectifyData.agency) ? rectifyData.agency : 'CUSTOM'}
                        onChange={(e) => setRectifyData({ ...rectifyData, agency: e.target.value === 'CUSTOM' ? '' : e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        {PREDEFINED_AGENCIES.map((a, idx) => (
                          <option key={idx} value={a}>{t(a)}</option>
                        ))}
                        <option value="CUSTOM">+ {t('Custom Agency')}</option>
                      </select>
                      {!PREDEFINED_AGENCIES.includes(rectifyData.agency) && (
                        <input
                          type="text"
                          required
                          placeholder={t('Enter Custom Agency')}
                          value={rectifyData.agency || ''}
                          onChange={(e) => setRectifyData({ ...rectifyData, agency: e.target.value })}
                          className="w-full p-2.5 mt-2 bg-slate-950 border border-amber-500/50 rounded-xl text-white focus:outline-none"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('State / Union Territory:')}</label>
                      <select
                        value={rectifyData.state || ''}
                        onChange={(e) => setRectifyData({ ...rectifyData, state: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        {INDIAN_STATES_AND_UTS.map((st, idx) => (
                          <option key={idx} value={st}>{t(st)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Target District:')}</label>
                      <input
                        type="text"
                        required
                        value={rectifyData.district || ''}
                        onChange={(e) => setRectifyData({ ...rectifyData, district: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Project Type:')}</label>
                      <select
                        value={rectifyData.project_type || ''}
                        onChange={(e) => setRectifyData({ ...rectifyData, project_type: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Expressway & Logistics Corridor">{t('Expressway & Logistics Corridor')}</option>
                        <option value="Railway Freight Corridor">{t('Railway Freight Corridor')}</option>
                        <option value="Irrigation & Dam Project">{t('Irrigation & Dam Project')}</option>
                        <option value="Industrial Park / SEZ">{t('Industrial Park / SEZ')}</option>
                        <option value="Power Grid / Renewable Energy">{t('Power Grid / Renewable Energy')}</option>
                        <option value="Airport / Aviation Infrastructure">{t('Airport / Aviation Infrastructure')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Project Category:')}</label>
                      <select
                        value={rectifyData.project_category || ''}
                        onChange={(e) => setRectifyData({ ...rectifyData, project_category: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Government Project">{t('Government Project')}</option>
                        <option value="Public Private Partnership (PPP)">{t('Public Private Partnership (PPP)')}</option>
                        <option value="Private Infrastructure">{t('Private Infrastructure')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Total Proposed Land (Hectares):')}</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={rectifyData.total_land_proposed_ha || 0}
                        onChange={(e) => setRectifyData({ ...rectifyData, total_land_proposed_ha: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Estimated Budget (₹ Crores):')}</label>
                      <input
                        type="number"
                        required
                        value={rectifyData.estimated_budget_cr || 0}
                        onChange={(e) => setRectifyData({ ...rectifyData, estimated_budget_cr: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block mb-1">{t('Target Completion Date:')}</label>
                      <input
                        type="date"
                        required
                        value={rectifyData.target_completion_date || ''}
                        onChange={(e) => setRectifyData({ ...rectifyData, target_completion_date: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg w-full sm:w-auto text-center"
                    >
                      {isCurrentStageReturned ? t('Resubmit Rectified Proposal to Collector') : t('Save Changes')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
