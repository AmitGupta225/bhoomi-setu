import React, { useEffect, useState } from 'react';
import { fetchProjects, fetchProjectDetail, updateWorkflowStage, updateProject, fetchGrievances, resolveGrievance } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ShieldAlert, 
  XCircle, 
  RotateCcw, 
  Edit, 
  AlertTriangle,
  MapPin,
  Building2,
  GitMerge,
  ShieldCheck,
  MessageSquare,
  Scale
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

export const ScrutinyConsole = () => {
  const { user, activeRole, isStepAuthorized, selectedProjectId, setSelectedProjectId, addNotification, notifyProjectUpdated , t } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectDetail, setProjectDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);
  const [comments, setComments] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Grievance State for Collectorate
  const [grievances, setGrievances] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveRemarks, setResolveRemarks] = useState('');

  // Rectification Form State
  const [showRectifyForm, setShowRectifyForm] = useState(false);
  const [rectifyData, setRectifyData] = useState({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const projList = await fetchProjects();
      setProjects(projList);
      
      const grievancesList = await fetchGrievances();
      setGrievances(grievancesList || []);

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
            // Find stage authorized for current role first
            const roleAuthorized = detail.stages.find(s => isStepAuthorized(s.stage_number));
            setActiveStage(roleAuthorized || detail.stages[0]);
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  const handleScrutinyDecision = async (decisionStatus) => {
    if (!activeStage) return;
    if (!isStepAuthorized(activeStage.stage_number)) {
      alert(`Role Restriction: Only ${activeStage.assigned_role} can perform scrutiny decisions for Step ${activeStage.stage_number}.`);
      return;
    }

    if ((decisionStatus === 'Returned for Re-Scrutiny' || decisionStatus === 'Rejected') && !comments.trim()) {
      alert('Official Scrutiny Remarks are mandatory when returning for re-scrutiny or rejecting.');
      return;
    }

    try {
      const res = await updateWorkflowStage(activeStage.id, {
        status: decisionStatus,
        approved_by: `${t(activeRole.label)}`,
        comments: comments || `Step ${activeStage.stage_number} decision: ${decisionStatus} by ${activeRole.badge}`
      });

      if (res.success) {
        setActionSuccess(`Step ${activeStage.stage_number} updated: Status is now "${decisionStatus}"!`);
        if (addNotification) {
          const target = decisionStatus === 'Returned for Re-Scrutiny' ? 'requiring_body' : 'ALL';
          const projName = projectDetail ? projectDetail.name : selectedProjectId;
          addNotification(`[${projName}] Step ${activeStage.stage_number} (${activeStage.stage_name}): ${decisionStatus} by ${activeRole.badge}`, target);
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
      alert('Error recording scrutiny decision: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResolveGrievance = async (e) => {
    e.preventDefault();
    if (!resolvingId || !resolveRemarks) return;

    try {
      const res = await resolveGrievance(resolvingId, {
        remarks: resolveRemarks,
        official_name: user?.name
      });
      if (res.success) {
        setResolvingId(null);
        setResolveRemarks('');
        const grievancesList = await fetchGrievances();
        setGrievances(grievancesList || []);
      }
    } catch (err) {
      alert('Error resolving grievance: ' + err.message);
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
  // Filter steps ONLY authorized for this logged in role!
  const authorizedStagesForRole = stages.filter(st => isStepAuthorized(st.stage_number));
  const isAuthorizedToScrutinizeCurrent = activeStage ? isStepAuthorized(activeStage.stage_number) : false;

  // Prerequisite check calculation for current active stage
  const prevStage = activeStage && activeStage.stage_number > 1 
    ? stages.find(s => s.stage_number === activeStage.stage_number - 1)
    : null;
  const isPrerequisiteMet = activeStage 
    ? (activeStage.stage_number === 1 || (prevStage && prevStage.status === 'Approved'))
    : false;

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-full overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>{t('Official Approvals & Scrutiny Desk')}</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white truncate">
            {t('Scrutiny & Decision Desk')} ({t(activeRole.badge)})
          </h1>
          <p className="text-xs text-slate-400">{t('Authorized administrative decision portal for')} <strong>{t(activeRole.label)}</strong>.
          </p>
        </div>

        <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl text-xs space-y-0.5 shrink-0">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('Authorized Authority:')}</span>
          <div className="font-bold text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{t(activeRole.label)}</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{t(actionSuccess)}</span>
        </div>
      )}

      {/* Main Body Dossier Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
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

          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-right shrink-0">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">{t('Active Milestone Status')}</span>
            <span className="text-sm font-extrabold text-emerald-300 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl inline-block shadow-sm">
              {t('Step')} {projectDetail.current_stage_id}: {t(projectDetail.status)}
            </span>
          </div>
        </div>

        {/* Full Department & Ministry Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-slate-400 text-[11px] block">{t('Sponsoring Ministry:')}</span>
            <div className="text-white font-bold text-xs leading-normal">{t(projectDetail.ministry)}</div>
          </div>
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-slate-400 text-[11px] block">{t('Implementing Agency:')}</span>
            <div className="text-emerald-400 font-bold text-xs leading-normal">{t(projectDetail.agency)}</div>
          </div>
        </div>
      </div>

      {/* Role Authorized Step Cards ONLY */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-heading">
            {t(activeRole.badge)} {t('Authorized Stages for Scrutiny')}
          </h2>
          <span className="text-xs text-emerald-400 font-bold">
            {authorizedStagesForRole.length} {t('Step(s) Legally Assigned')}
          </span>
        </div>

        {authorizedStagesForRole.length === 0 ? (
          <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2 text-xs">
            <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-slate-300 font-bold">{t('Your role does not perform step approvals.')}</p>
            <p className="text-slate-500">{t('Log in as District Collector, State Govt, SLAO, PFMS Officer, or R&R Commissioner to execute scrutiny decisions.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {authorizedStagesForRole.map((st) => {
              const isSelected = activeStage?.id === st.id;
              const pStage = st.stage_number > 1 ? stages.find(s => s.stage_number === st.stage_number - 1) : null;
              const stepPrereqMet = st.stage_number === 1 || (pStage && pStage.status === 'Approved');

              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setActiveStage(st);
                    setShowRectifyForm(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition space-y-2 relative ${
                    isSelected 
                      ? 'bg-slate-800 border-emerald-500 shadow-xl ring-2 ring-emerald-500' 
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {t('Step')} {st.stage_number}
                    </span>
                    {stepPrereqMet ? (
                      <span className="text-[10px] font-bold text-emerald-400">✓ {t('Ready for Review')}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />{t('Locked')}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{t(cleanStageName(st.stage_name))}</h3>
                    <p className="text-xs text-slate-400 mt-1">{t('Status:')} <strong className="text-emerald-300">{t(st.status)}</strong></p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Step Scrutiny Action Desk */}
      {activeStage && isAuthorizedToScrutinizeCurrent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Technical Details Box */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{t('Step')} {activeStage.stage_number} {t('Official Review Desk')}</span>
                <h2 className="text-lg font-bold text-white font-heading">{t(cleanStageName(activeStage.stage_name))}</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {t(activeStage.status)}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              {t(activeStage.description)}
            </p>

            {/* Prerequisite Pending Warning Card */}
            {!isPrerequisiteMet && prevStage && (
              <div className="p-4 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-xs space-y-2 text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t('Sequential Prerequisite Milestone Pending')}</span>
                </div>
                <p className="leading-relaxed">
                  {t('Step')} {activeStage.stage_number} ({t(cleanStageName(activeStage.stage_name))}) {t('cannot be approved because Step')} {prevStage.stage_number} (<strong>{t(cleanStageName(prevStage.stage_name))}</strong>) {t('is currently')} <strong>{t(prevStage.status)}</strong>.
                </p>
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-amber-500/30 text-[11px] text-slate-300">
                  <span>{t('Mandatory Action Required: Step')} {prevStage.stage_number} {t('must be officially approved by')} <strong>{t(prevStage.assigned_role)}</strong> {t('before Step')} {activeStage.stage_number} {t('can be approved.')}</span>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block border-b border-slate-800 pb-1">{t('Proposal Technical Parameters Under Review')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">{t('Project Name:')}</span>
                  <strong className="text-white text-xs">{t(projectDetail.name)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{t('District & State:')}</span>
                  <strong className="text-white text-xs">{t(projectDetail.district)}, {t(projectDetail.state)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{t('Proposed Land Area:')}</span>
                  <strong className="text-emerald-400 font-mono text-xs">{projectDetail.total_land_proposed_ha} {t('Hectares')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{t('Estimated Budget:')}</span>
                  <strong className="text-cyan-400 font-mono text-xs">₹ {projectDetail.estimated_budget_cr} {t('Cr')}</strong>
                </div>
              </div>
            </div>

            {activeStage.comments && (
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-xs space-y-1 text-amber-200">
                <span className="font-bold block uppercase tracking-wider text-[10px]">{t('Previous Remarks / Objections:')}</span>
                <p className="font-medium">{t(activeStage.comments)}</p>
              </div>
            )}
          </div>

          {/* Authority Scrutiny Action Console */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{t('Official Decision Console')}</span>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700 text-xs space-y-1">
              <span className="text-slate-400">{t('Authenticated Authority:')}</span>
              <div className="font-bold text-white">{t(activeRole.label)}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium block">{t('Official Remarks & Findings:')}</label>
              <textarea
                rows={3}
                placeholder={t('Enter inspection findings, gazette reference numbers, or objections...')}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleScrutinyDecision('Approved')}
                disabled={!isPrerequisiteMet}
                className={`w-full py-2.5 font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 ${
                  isPrerequisiteMet 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
                title={!isPrerequisiteMet ? `Locked: Step ${prevStage?.stage_number} must be Approved first` : ''}
              >
                {isPrerequisiteMet ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
                <span>{isPrerequisiteMet ? `${t('Approve & Advance Step')} ${activeStage.stage_number}` : `${t('Locked')} (${t('Step')} ${prevStage?.stage_number} ${t('Pending')})`}</span>
              </button>

              <button
                onClick={() => handleScrutinyDecision('Returned for Re-Scrutiny')}
                disabled={!isPrerequisiteMet}
                className={`w-full py-2.5 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 ${
                  isPrerequisiteMet
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 cursor-pointer'
                    : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
                title={!isPrerequisiteMet ? `Locked: Step ${prevStage?.stage_number} must be Approved first` : ''}
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>{t('Return to Proposer for Re-Scrutiny')}</span>
              </button>

              <button
                onClick={() => handleScrutinyDecision('Rejected')}
                disabled={!isPrerequisiteMet}
                className={`w-full py-2.5 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 ${
                  isPrerequisiteMet
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 cursor-pointer'
                    : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
                title={!isPrerequisiteMet ? `Locked: Step ${prevStage?.stage_number} must be Approved first` : ''}
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{t('Reject Proposal / Step')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
