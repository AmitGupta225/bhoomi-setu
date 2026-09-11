import React, { useEffect, useState } from 'react';
import { fetchProjects, fetchProjectDetail, updateWorkflowStage, updateProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  GitMerge,
  CheckCircle2,
  Clock,
  Lock,
  UserCheck,
  ShieldAlert,
  Map,
  IndianRupee,
  FileCheck2,
  XCircle,
  RotateCcw,
  Edit,
  AlertTriangle,
  Building2,
  Award
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

export const WorkflowLifecycle = () => {
  const { activeRole, isStepAuthorized, selectedProjectId, setSelectedProjectId, setActiveTab, isTabAllowed, addNotification, notifyProjectUpdated , t } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectDetail, setProjectDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);
  const [comments, setComments] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Rectification Form State (for Proposer when returned for re-scrutiny)
  const [showRectifyForm, setShowRectifyForm] = useState(false);
  const [rectifyData, setRectifyData] = useState({});

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
            total_land_proposed_ha: detail.total_land_proposed_ha,
            estimated_budget_cr: detail.estimated_budget_cr
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

  const handleSelectProject = async (id) => {
    setSelectedProjectId(id);
    setLoading(true);
    const detail = await fetchProjectDetail(id);
    setProjectDetail(detail);
    if (detail) {
      setRectifyData({
        name: detail.name,
        ministry: detail.ministry,
        agency: detail.agency,
        state: detail.state,
        district: detail.district,
        project_type: detail.project_type,
        total_land_proposed_ha: detail.total_land_proposed_ha,
        estimated_budget_cr: detail.estimated_budget_cr
      });
      if (detail.stages) {
        setActiveStage(detail.stages.find(s => s.status === 'In Progress' || s.status === 'Returned for Re-Scrutiny') || detail.stages[0]);
      }
    }
    setLoading(false);
  };

  // Authority Scrutiny Action (Approve, Return for Re-Scrutiny, Reject)
  const handleScrutinyDecision = async (decisionStatus) => {
    if (!activeStage) return;
    if (!isStepAuthorized(activeStage.stage_number)) {
      alert(`Role Restriction: Only ${activeStage.assigned_role} can perform scrutiny decisions for Stage ${activeStage.stage_number}.`);
      return;
    }

    if ((decisionStatus === 'Returned for Re-Scrutiny' || decisionStatus === 'Rejected') && !comments.trim()) {
      alert('Official Scrutiny Remarks are mandatory when returning for re-scrutiny or rejecting.');
      return;
    }

    try {
      const res = await updateWorkflowStage(activeStage.id, {
        status: decisionStatus,
        approved_by: `${activeRole.label}`,
        comments: comments || `Stage ${activeStage.stage_number} decision: ${decisionStatus} by ${activeRole.badge}`
      });

      if (res.success) {
        setActionSuccess(`Stage ${activeStage.stage_number} updated: Status is now "${decisionStatus}"!`);
        if (addNotification) {
          const projName = activeProject ? activeProject.name : selectedProjectId;
          addNotification(`[${projName}] Stage ${activeStage.stage_number} (${activeStage.stage_name}): ${decisionStatus} by ${activeRole.badge}`);
        }
        if (notifyProjectUpdated) notifyProjectUpdated();
        const updated = await fetchProjectDetail(selectedProjectId);
        setProjectDetail(updated);
        if (updated && updated.stages) {
          const freshStage = updated.stages.find(s => s.stage_number === activeStage.stage_number);
          setActiveStage(freshStage || updated.stages[0]);
        }
        setComments('');
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      alert('Error recording scrutiny decision: ' + err.message);
    }
  };

  // Proposer Action: Submit Rectified Proposal
  const handleRectifySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProject(selectedProjectId, rectifyData);
      if (res.success) {
        setActionSuccess('Rectified proposal resubmitted to Collectorate for re-scrutiny!');
        if (addNotification) {
          addNotification(`[${rectifyData.name}] Proposal Rectified & Resubmitted`);
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
  const isAuthorizedToScrutinizeCurrent = activeStage ? isStepAuthorized(activeStage.stage_number) : false;
  const isRequiringBody = activeRole.id === 'requiring_body';
  const isCurrentStageReturned = activeStage?.status === 'Returned for Re-Scrutiny';

  const acquiredPercent = Math.round((projectDetail.total_land_acquired_ha / projectDetail.total_land_proposed_ha) * 100) || 0;

  const getStageActionVocabulary = (stageNumber, status) => {
    if (status === 'Approved') {
      switch (stageNumber) {
        case 1: return t("Submit Proposal & Initiate SIA");
        case 2: return t("Forward SIA to State Gov");
        case 3: return t("Approve R&R Scheme");
        case 4: return t("Issue Sec 11 Notification");
        case 5: return t("Hear & Resolve Objections");
        case 6: return t("Declare Final Acquisition (Sec 19)");
        case 7: return t("Pass Valuation Award (Sec 23)");
        default: return t("Approve & Advance Stage") + ` ${stageNumber}`;
      }
    } else if (status === 'Returned for Re-Scrutiny') {
      switch (stageNumber) {
        case 3: return t("Return R&R Scheme to Collector");
        case 6: return t("Refer Back to Collector");
        default: return t("Return to Proposer for Re-Scrutiny");
      }
    } else if (status === 'Rejected') {
      return t("Reject Stage") + ` ${stageNumber}`;
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-full overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <GitMerge className="w-4 h-4 shrink-0" />
            <span>{t('RFCTLARR Act Statutory Acquisition Engine')}</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white truncate">{t('Project Status & Statutory Milestones')}</h1>
          <p className="text-xs text-slate-400">{t('End-to-end statutory milestones: Proposal Submission, Collector Scrutiny, SIA Hearings, Gazette Declarations, Awards & Payouts.')}</p>
        </div>

        {/* Quick Cross-System Links */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isTabAllowed('gis') && (
            <button
              onClick={() => setActiveTab('gis')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
            >
              <Map className="w-4 h-4 text-cyan-400" />
              <span>{t('GIS Spatial Hub')}</span>
            </button>
          )}
          {isTabAllowed('compensation') && (
            <button
              onClick={() => setActiveTab('compensation')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
            >
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>{t('PFMS DBT Payouts')}</span>
            </button>
          )}
          {isTabAllowed('documents') && (
            <button
              onClick={() => setActiveTab('documents')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
            >
              <FileCheck2 className="w-4 h-4 text-purple-400" />
              <span>{t('Gazette Document Vault')}</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Body Dossier Metrics & Executive Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-emerald-400 font-bold px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded-md">
                {projectDetail.code}
              </span>
              <span className="text-slate-400">• {t(projectDetail.agency)}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white font-heading">{t(projectDetail.name)}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('Location:')} <strong>{t(projectDetail.district)}, {t(projectDetail.state)}</strong></span>
            </p>
          </div>          <div className="flex items-center gap-3 shrink-0">
            <div className="px-5 py-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-right shadow-lg">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">{t('Current Milestone')}</span>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-extrabold text-sm shadow-sm">
                <span>{t('Stage')} {projectDetail.current_stage_id}: {t(projectDetail.status)}</span>
              </div>
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
            <span className="text-[10px] text-slate-500 block">{t('Out of Total Budget')} ₹ {projectDetail.estimated_budget_cr} {t('Cr')}</span>
          </div>

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

      {/* Statutory Deadlines Panel */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <h2 className="text-lg font-extrabold text-white font-heading flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />{t('Statutory Deadlines (RFCTLARR)')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: t('SIA Notification (Stage 2)'), rule: t('6 months from Stage 1'), target: 2, from: 1, months: 6 },
            { title: t('Sec 11 Gazette (Stage 4)'), rule: t('12 months from Stage 1'), target: 4, from: 1, months: 12 },
            { title: t('Sec 23 Award (Stage 7)'), rule: t('12 months from Stage 4'), target: 7, from: 4, months: 12 },
            { title: t('Sec 24 Compensation Lapse'), rule: t('24 months from Stage 7'), target: 8, from: 7, months: 24 }
          ].map((dl, idx) => {
            const fromStage = stages.find(s => s.stage_number === dl.from);
            const targetStage = stages.find(s => s.stage_number === dl.target);
            
            if (!fromStage || !fromStage.approval_date) {
              return (
                <div key={idx} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400">{dl.rule}</div>
                  <div className="font-bold text-white text-sm mt-1">{dl.title}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">{t('Awaiting preceding stage')}</div>
                </div>
              );
            }
            
            const fromDate = new Date(fromStage.approval_date);
            const deadlineDate = new Date(fromDate);
            deadlineDate.setMonth(deadlineDate.getMonth() + dl.months);
            
            const today = new Date();
            const daysRemaining = Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24));
            
            let status = t('On Track');
            let color = 'text-emerald-400';
            
            const isCompleted = targetStage ? targetStage.status === 'Approved' : projectDetail.compensation_disbursed_cr > 0;
            
            if (isCompleted) {
              status = `${t('Completed')} ✅`;
              color = 'text-emerald-400';
            } else if (daysRemaining < 0) {
              status = `${t('Overdue')} 🔴`;
              color = 'text-rose-400';
            } else if (daysRemaining < 30) {
              status = `${t('At Risk')} ⚠️`;
              color = 'text-amber-400';
            } else {
              status = `${t('On Track')} ✅`;
            }

            return (
              <div key={idx} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="text-[11px] text-slate-400">{dl.rule}</div>
                <div className="font-bold text-white text-sm mt-1">{dl.title}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className={`text-xs font-bold ${color}`}>{status}</div>
                  {!isCompleted && <div className="text-[10px] text-slate-400">{daysRemaining} {t('days left')}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stepper Project Status */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <h2 className="text-lg font-extrabold text-white font-heading">{t('Statutory Timeline Milestones for:')} <span className="text-emerald-400">{t(projectDetail.name)}</span>
          </h2>
          <span className="text-xs text-slate-300 font-mono bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">{t('Project Code:')} <strong className="text-emerald-300">{projectDetail.code}</strong></span>
        </div>

        {/* Timeline Cards - Responsive Grid display without text cutoffs */}
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
                onClick={() => {
                  setActiveStage(st);
                  setShowRectifyForm(false);
                }}
                className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 relative ${isSelected
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
                  <span className={`text-xs font-extrabold font-mono px-3.5 py-1.5 rounded-xl border shadow-sm ${isCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : isReturned ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : isRejected ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                    {t('Stage')} {st.stage_number}
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

      {/* Selected Stage Detail & Scrutiny Action Console */}
      {activeStage && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage Details */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{t('Stage')} {activeStage.stage_number} {t('of')} 10</span>
                <h2 className="text-lg font-bold text-white font-heading">{t(cleanStageName(activeStage.stage_name))}</h2>
              </div>
              <span className={`px-4 py-2 rounded-full text-xs font-extrabold shadow-sm self-start sm:self-auto ${activeStage.status === 'Approved'
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

            {/* Active Proposal Parameters Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block border-b border-slate-800 pb-1">{t('Active Proposal Technical Parameters')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 pt-1">
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] block">{t('Project Title:')}</span>
                  <strong className="text-white text-xs truncate block">{t(projectDetail.name)}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] block">{t('State & District:')}</span>
                  <strong className="text-white text-xs block truncate">{t(projectDetail.state)}, {t(projectDetail.district)}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] block">{t('Proposed Land Area:')}</span>
                  <strong className="text-emerald-400 font-mono text-xs block truncate">{projectDetail.total_land_proposed_ha} {t('Hectares')}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] block">{t('Estimated Budget:')}</span>
                  <strong className="text-cyan-400 font-mono text-xs block truncate">₹ {projectDetail.estimated_budget_cr} {t('Cr')}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1">
                <span className="text-slate-400">{t('Assigned Scrutiny Authority:')}</span>
                <div className="font-semibold text-white truncate">{t(activeStage.assigned_role)}</div>
              </div>

              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1">
                <span className="text-slate-400">{t('Last Action Date:')}</span>
                <div className="font-semibold text-emerald-400">{activeStage.approval_date || t('Pending Scrutiny')}</div>
              </div>
            </div>

            {activeStage.comments && (
              <div className={`p-4 rounded-2xl border text-xs space-y-1 ${activeStage.status === 'Returned for Re-Scrutiny'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : activeStage.status === 'Rejected'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-200'
                }`}>
                <span className="font-bold block uppercase tracking-wider text-[10px]">{t('Official Scrutiny Remarks & Objections:')}</span>
                <p className="font-medium">{t(activeStage.comments)}</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
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
                        <label className="text-slate-300 block mb-1">{t('Estimated Budget')} (₹ {t('Cr')}):</label>
                        <input
                          type="number"
                          required
                          value={rectifyData.estimated_budget_cr || 0}
                          onChange={(e) => setRectifyData({ ...rectifyData, estimated_budget_cr: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className={`px-5 py-2.5 font-bold rounded-xl text-xs transition shadow-lg ${isCurrentStageReturned ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'}`}
                      >
                        {isCurrentStageReturned ? t('Resubmit Rectified Proposal to Collector') : t('Save Changes')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Scrutiny Action Approval / Rejection Console */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{t('Statutory Scrutiny Console')}</span>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700 text-xs space-y-1">
              <span className="text-slate-400">{t('Active User Persona:')}</span>
              <div className="font-bold text-white flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="truncate">{t(activeRole.label)}</span>
              </div>
            </div>

            {/* Role Restriction Check */}
            {!isAuthorizedToScrutinizeCurrent ? (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{t('Role View-Only Mode')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{t('You are logged in as')} <strong>{t(activeRole.badge)}</strong>. {t('Official scrutiny and decision for Stage')} {activeStage.stage_number} {t('is legally assigned to')} <strong>{t(activeStage.assigned_role)}</strong>.
                  {t('Switch active persona from top right header dropdown to execute decisions.')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium block">{t('Statutory Scrutiny Remarks & Objections:')}</label>
                  <textarea
                    rows={3}
                    placeholder={t('Enter inspection findings, gazette reference numbers, or deficiencies requiring re-scrutiny...')}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  {/* Approve */}
                  <button
                    onClick={() => handleScrutinyDecision('Approved')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{getStageActionVocabulary(activeStage.stage_number, 'Approved')}</span>
                  </button>

                  {/* Return for Re-Scrutiny */}
                  <button
                    onClick={() => handleScrutinyDecision('Returned for Re-Scrutiny')}
                    className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>{getStageActionVocabulary(activeStage.stage_number, 'Returned for Re-Scrutiny')}</span>
                  </button>

                  {/* Reject Proposal */}
                  <button
                    onClick={() => handleScrutinyDecision('Rejected')}
                    className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{getStageActionVocabulary(activeStage.stage_number, 'Rejected')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
