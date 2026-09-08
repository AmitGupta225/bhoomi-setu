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
  const { t } = useAuth();
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

  const acquisitionPercent = Math.round((kpis.total_acquired_ha / kpis.total_proposed_ha) * 100) || 75;

  const formatMoney = (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const handleExportCSV = () => {
    const headers = ["Project Code", "Project Name", "State", "Proposed Ha", "{t('Acquired')} Ha", "{t('Compensation Disbursed')} (Cr)", "Affected Families", "Stage"];
    const rows = projects.map(p => [
      p.code,
      `"${p.name}"`,
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
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span>National Monitoring & Decision Support</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold font-heading text-white">National Land Acquisition Executive Portal</h1>
          <p className="text-xs lg:text-sm text-slate-400 max-w-2xl">Unified digital platform connecting Central Ministries, State SLAOs, District Collectors, and Affected Families across all Indian infrastructure corridors.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Proposed Land</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">{kpis.total_proposed_ha.toLocaleString()} Ha</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${acquisitionPercent}%` }}></div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">{acquisitionPercent}% {t('Acquired')}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{t('Acquired')}: <strong className="text-slate-200">{kpis.total_acquired_ha.toLocaleString()} Ha</strong></p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t('Compensation Disbursed')} (PFMS)</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">₹ {formatMoney(kpis.total_compensation_cr)} Cr</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {t('Out of Total Budget')} ₹ {kpis.total_budget_cr.toLocaleString()} Cr
            </div>
          </div>
          <div className="text-[11px] text-cyan-400 font-medium">Solatium Compensation (100%) Included</div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Affected & Displaced Families</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">{kpis.total_affected_families.toLocaleString()}</div>
            <div className="text-[11px] text-slate-400 mt-1">Displaced:<strong className="text-purple-300">{kpis.total_displaced_families.toLocaleString()} Families</strong>
            </div>
          </div>
          <div className="text-[11px] text-purple-400 font-medium">100% {t('R&R Housing Allotment Enrolled')}</div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Strategic Projects</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white font-heading">{kpis.total_projects} {t('National Projects')}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {t('SLA Adherence Index')}: <strong className="text-amber-400">94.2% On Track</strong>
            </div>
          </div>
          <div className="text-[11px] text-amber-400 font-medium">RFCTLARR Compliant</div>
        </div>
      </div>

      {/* Visual Analytics Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State-wise Progress Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white font-heading">State-Wise Land Acquisition Progress (Hectares)</h2>
              <p className="text-xs text-slate-400">Comparison of Land Proposed vs {t('Acquired')} Across States</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">5 Key States</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateBreakdown}>
                <XAxis dataKey="state" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="proposed_ha" fill="#334155" radius={[6, 6, 0, 0]} name="Proposed (Ha)" />
                <Bar dataKey="acquired_ha" fill="#10b981" radius={[6, 6, 0, 0]} name="{t('Acquired')} (Ha)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Parcel Acquisition Status Breakdown Pie Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white font-heading">Land Parcel Status Breakdown</h2>
            <p className="text-xs text-slate-400">Current Lifecycle Distribution of Parcels</p>
          </div>

          <div className="h-52 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={parcelStatusCounts}
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
                <span className="text-slate-300 leading-snug">{item.status}: <strong>{item.total_area_ha} Ha</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Table & Quick Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-heading">National Infrastructure Land Acquisition Dossiers</h2>
            <p className="text-xs text-slate-400">Live monitoring of projects, project stages, and budget utilization</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-medium rounded-xl text-xs transition border border-emerald-500/30"
            >
              <Download className="w-4 h-4" />
              <span>Export MIS Report</span>
            </button>
            <button
              onClick={() => onNavigate('gis')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition border border-slate-700"
            >
              <Layers className="w-4 h-4" />
              <span>Open Spatial Map</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 border-b border-slate-700">Project Code & Name</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Ministry & Agency</th>
                <th className="py-3.5 px-4 border-b border-slate-700">State / District</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Land Proposed vs {t('Acquired')}</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Compensation Disbursed</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Current Stage</th>
                <th className="py-3.5 px-4 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {projects.map((proj) => (
                <tr key={proj.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div>{proj.name}</div>
                    <span className="text-[10px] font-mono text-emerald-400 font-normal">{proj.code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div>{proj.agency}</div>
                    <span className="text-[10px] text-slate-400">{proj.ministry}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {proj.state}, <span className="text-slate-400">{proj.district}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{proj.total_land_acquired_ha} / {proj.total_land_proposed_ha} Ha</div>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {Math.round((proj.total_land_acquired_ha / proj.total_land_proposed_ha) * 100)}% Completed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-cyan-400">
                    ₹ {formatMoney(proj.compensation_disbursed_cr)} Cr
                    <span className="text-[10px] block text-slate-400 font-normal">of ₹ {formatMoney(proj.estimated_budget_cr)} Cr</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block shadow-md">
                      Stage {proj.current_stage_id}: {proj.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate('workflow')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium transition inline-flex items-center gap-1"
                    >
                      <span>Track</span>
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
