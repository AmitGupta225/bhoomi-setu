import React, { useEffect, useState } from 'react';
import { fetchRRRecords, fetchProjects, fetchProjectDetail, updateWorkflowStage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Users, 
  Briefcase, 
  HeartHandshake, 
  CheckCircle2, 
  Clock, 
  Award,
  Building
} from 'lucide-react';

export const RehabilitationResettlement = () => {
  const { selectedProjectId, activeRole, addNotification , t } = useAuth();
  const [rrList, setRrList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState(null);
  const [stageId, setStageId] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchRRRecords(selectedProjectId);
      setRrList(data);
      
      const projData = await fetchProjects();
      if (selectedProjectId) {
        const found = projData.find(p => p.id === selectedProjectId) || null;
        setActiveProject(found);
        if (found) {
          const detail = await fetchProjectDetail(selectedProjectId);
          if (detail && detail.stages) {
            const s3 = detail.stages.find(s => s.stage_number === 3);
            if (s3) setStageId(s3.id);
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  const handleCompleteStage = async () => {
    if (!stageId) return;
    try {
      const res = await updateWorkflowStage(stageId, {
        status: 'Approved',
        approved_by: activeRole.label,
        comments: 'R&R Scheme Prepared and Verified Successfully'
      });
      if (res.success) {
        alert('Stage 3 Marked as Completed!');
        const projName = activeProject ? activeProject.name : selectedProjectId;
        if (addNotification) addNotification(`[${projName}] Stage 3 Completed: R&R Scheme Prepared`);
        const projData = await fetchProjects();
        setActiveProject(projData.find(p => p.id === selectedProjectId));
      }
    } catch (err) {
      alert('Failed to complete stage: ' + err.message);
    }
  };

  return (
    <div className="px-2.5 sm:px-4 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-8 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <Home className="w-4 h-4" />
            <span>{t('Schedule II & III RFCTLARR Resettlement Scheme')}</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white mt-1">{t('Rehabilitation & Resettlement (R&R) Family Tracker')}</h1>
          <p className="text-xs text-slate-400">{t('Monitoring displaced families, housing site allotments, annuity allowances, and skill development')}</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-2xl">
          <div>
            <span className="text-[10px] text-slate-400 block">{t('Total Displaced Families')}</span>
            <span className="text-lg font-bold text-purple-400 font-heading">1,650 {t('Families')}</span>
          </div>
        </div>
      </div>

      {activeRole?.id === 'rr_officer' && activeProject?.current_stage_id === 3 && (
        <div className="bg-purple-950/40 border border-purple-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-purple-300 text-xs">
            <strong className="block font-bold">{t('Stage 3: R&R Scheme Preparation Active')}</strong>{t('Once all families have been accounted for and the R&R scheme is prepared, mark this stage as complete to forward it to the State Government.')}</div>
          <button 
            onClick={handleCompleteStage}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shrink-0"
          >{t('Mark Stage 3 as Completed')}</button>
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>{t('Resettlement Colony Housing Allotments')}</span>
            <Building className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-heading">1,240 {t('Plots Allotted')}</div>
          <p className="text-[11px] text-emerald-400">{t('92% Construction Underway')}</p>
        </div>

        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>{t('One-Time Resettlement Allowance')}</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white font-heading">₹ 5,00,000 / {t('Family')}</div>
          <p className="text-[11px] text-cyan-400">{t('Cash in lieu of employment option')}</p>
        </div>

        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>{t('Skill Development & Vocational Training')}</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-heading">880 {t('Youth Enrolled')}</div>
          <p className="text-[11px] text-amber-400">{t('PMKVY Skill Certification Linkage')}</p>
        </div>
      </div>

      {/* Family R&R Records Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white font-heading">{t('Affected & Displaced Family R&R Master Roster')}</h2>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Family Head Name')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Social Category')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Family Size')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Housing Site Allotment')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Employment / Allowance')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Package Value')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700 text-center">{t('R&R Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {rrList.map((rr) => (
                <tr key={rr.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {t(rr.family_head_name)}
                    <span className="text-[10px] text-slate-400 block font-normal">{t('Survey No')}: {rr.survey_number} ({t(rr.village)})</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {t(rr.category)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {rr.family_members_count} {t('Members')}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-300 font-medium">
                    {t(rr.housing_allotted)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {t(rr.employment_status)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                    ₹ {(rr.r_and_r_package_value_rs / 100000).toFixed(2)} {t('Lakhs')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block shadow-sm">
                      {t(rr.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
