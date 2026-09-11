import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { fetchDashboardAnalytics, fetchProjects } from '../services/api';
import {
  Building2,
  MapPin,
  IndianRupee,
  Users,
  ArrowUpRight,
  Layers,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899'];

export const NationalDashboard = (props) => {
  const { onNavigate = () => {} } = props;
  const { t, theme } = useAuth();
  const isDark = theme === 'dark';
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await fetchDashboardAnalytics();
      const projList = await fetchProjects();
      if (res && res.success) {
        setData(res);
      }
      setProjects(projList);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800"></div>)}
        </div>
      </div>
    );
  }

  const { kpis, stateBreakdown, parcelStatusCounts } = data;

  const translatedStateBreakdown = (stateBreakdown || []).map(item => ({
    ...item,
    state: t(item.state)
  }));

  const translatedParcelStatusCounts = (parcelStatusCounts || []).map(item => ({
    ...item,
    status: t(item.status)
  }));

  const acquisitionPercent = Math.round((kpis.total_acquired_ha / kpis.total_proposed_ha) * 100) || 75;

  const formatMoney = (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const handleExportCSV = () => {
    const headers = [t("Project Code"), t("Project Name"), t("State"), t("Proposed") + " (" + t("Ha") + ")", t("Acquired") + " (" + t("Ha") + ")", t("Compensation Disbursed") + " (" + t("Cr") + ")", t("Affected Families"), t("Stage")];
    const rows = projects.map(p => [
      p.code,
      '"' + p.name + '"',
      p.state,
      p.total_land_proposed_ha,
      p.total_land_acquired_ha,
      p.compensation_disbursed_cr,
      p.affected_families,
      p.current_stage_id
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "National_Land_Acquisition_MIS_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-2.5 sm:px-4 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-8 max-w-[1600px] mx-auto w-full overflow-x-hidden">
      {/* Header Banner with Adaptive Background Image */}
      <div className={`dashboard-hero-banner flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border shadow-2xl relative overflow-hidden min-h-[140px] sm:min-h-[170px] transition-colors duration-300 ${
        isDark
          ? 'bg-slate-950 border-slate-800'
          : 'bg-gradient-to-br from-emerald-50/90 via-white/95 to-teal-50/80 border-emerald-200/90 shadow-xl'
      }`}>
        {/* Hero Background Panorama: /hero_banner.jpg for night/dark, /dashboard_banner.jpg for golden daylight */}
        <div 
          className={`absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-500 ${
            isDark ? 'opacity-45' : 'opacity-85'
          }`}
          style={{ backgroundImage: isDark ? "url('/hero_banner.jpg')" : "url('/dashboard_banner.jpg')" }}
        />
        {/* Gradient Overlays for optimal text legibility */}
        <div 
          className="hero-overlay-mask absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(to right, rgba(2, 6, 23, 0.96) 0%, rgba(2, 6, 23, 0.85) 45%, rgba(2, 6, 23, 0.35) 75%, transparent 100%)'
              : 'linear-gradient(to right, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.88) 45%, rgba(255, 255, 255, 0.35) 78%, rgba(255, 255, 255, 0.08) 100%)'
          }}
        />
        {isDark && (
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        )}
        {!isDark && (
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none"></div>
        )}

        <div className="space-y-1.5 z-10 relative">
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'}`}></span>
            <span>{t('National Monitoring & Decision Support')}</span>
          </div>
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold font-heading ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {t('National Land Acquisition Executive Portal')}
          </h1>
          <p className={`text-xs lg:text-sm max-w-2xl font-medium ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {t('Unified digital platform connecting Central Ministries, State SLAOs, District Collectors, and Affected Families across all Indian infrastructure corridors.')}
          </p>
        </div>

        {/* Right Quote as in reference image */}
        <div className="z-10 relative text-right hidden md:block pr-2">
          <div
            className="italic font-serif text-sm lg:text-base leading-snug tracking-wide font-bold"
            style={{
              color: isDark ? '#6ee7b7' : '#ffffff',
              textShadow: isDark
                ? '0 1px 4px rgba(0,0,0,0.85)'
                : '0 1px 4px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.6)'
            }}
          >
            “ {t('Right Land')}<br />
            &nbsp;&nbsp;{t('Right Process')}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;{t('Right Future')} ”
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t('Total Proposed Land')}</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">{kpis.total_proposed_ha.toLocaleString()} {t('Ha')}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${acquisitionPercent}%` }}></div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">{acquisitionPercent}% {t('Acquired')}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{t('Acquired')}: <strong className="text-slate-200">{kpis.total_acquired_ha.toLocaleString()} {t('Ha')}</strong></p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t('Compensation Disbursed')} ({t('PFMS')})</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">₹ {formatMoney(kpis.total_compensation_cr)} {t('Cr')}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {t('Out of Total Budget')} ₹ {kpis.total_budget_cr.toLocaleString()} {t('Cr')}
            </div>
          </div>
          <div className="text-[11px] text-cyan-400 font-medium">{t('Solatium Compensation (100%) Included')}</div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t('Affected & Displaced Families')}</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">{kpis.total_affected_families.toLocaleString()}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {t('Displaced Families')}: <strong className="text-purple-300">{kpis.total_displaced_families.toLocaleString()} {t('Families')}</strong>
            </div>
          </div>
          <div className="text-[11px] text-purple-400 font-medium">100% {t('R&R Housing Allotment Enrolled')}</div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t('Active Strategic Projects')}</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">{kpis.total_projects} {t('National Projects')}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {t('SLA Adherence Index')}: <strong className="text-amber-400">94.2% {t('On Track')}</strong>
            </div>
          </div>
          <div className="text-[11px] text-amber-400 font-medium">{t('RFCTLARR Statutory Multiplier')}</div>
        </div>
      </div>

      {/* Visual Analytics Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State-wise Progress Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white font-heading">{t('Land Acquisition Progress')}</h2>
              <p className="text-xs text-slate-400">{t('State-wise Progress (Top 5)')}</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">5 {t('Key States')}</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={translatedStateBreakdown}>
                <XAxis dataKey="state" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="proposed_ha" fill="#334155" radius={[6, 6, 0, 0]} name={t('Proposed') + ' (' + t('Ha') + ')'} />
                <Bar dataKey="acquired_ha" fill="#10b981" radius={[6, 6, 0, 0]} name={t('Acquired') + ' (' + t('Ha') + ')'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Parcel Acquisition Status Breakdown Pie Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white font-heading">{t('Land Parcel Status Breakdown')}</h2>
            <p className="text-xs text-slate-400">{t('Current Lifecycle Distribution of Parcels')}</p>
          </div>

          <div className="h-52 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={translatedParcelStatusCounts}
                  dataKey="total_area_ha"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {parcelStatusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {parcelStatusCounts.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-300 leading-snug">{t(item.status)}: <strong>{item.total_area_ha} {t('Ha')}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Table & Quick Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-heading">{t('National Infrastructure Land Acquisition Dossiers')}</h2>
            <p className="text-[11px] sm:text-xs text-slate-400">{t('Live monitoring of projects, project stages, and budget utilization')}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-medium rounded-xl text-xs transition border border-emerald-500/30 shrink-0"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t('Export MIS Report')}</span>
            </button>
            <button
              onClick={() => onNavigate('gis')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition border border-slate-700 shrink-0"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t('Open Spatial Map')}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 touch-pan-x">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Project Code & Name')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Ministry & Agency')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('State / District')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Land Proposed vs Acquired')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Compensation Disbursed')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">{t('Current Stage')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {projects.map((proj) => (
                <tr key={proj.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div>{t(proj.name)}</div>
                    <span className="notranslate text-[10px] font-mono text-emerald-400 font-normal">{proj.code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div>{t(proj.agency)}</div>
                    <span className="text-[10px] text-slate-400">{t(proj.ministry)}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {t(proj.state)}, <span className="text-slate-400">{t(proj.district)}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{proj.total_land_acquired_ha} / {proj.total_land_proposed_ha} {t('Ha')}</div>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {Math.round((proj.total_land_acquired_ha / proj.total_land_proposed_ha) * 100)}% {t('Completed')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-cyan-400">
                    ₹ {formatMoney(proj.compensation_disbursed_cr)} {t('Cr')}
                    <span className="text-[10px] block text-slate-400 font-normal">{t('of')} ₹ {formatMoney(proj.estimated_budget_cr)} {t('Cr')}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block shadow-md">
                      {t('Stage')} {proj.current_stage_id}: {t(proj.status)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate('workflow')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium transition inline-flex items-center gap-1"
                    >
                      <span>{t('Track')}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
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
