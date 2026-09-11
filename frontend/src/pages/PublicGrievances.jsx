import React, { useEffect, useState } from 'react';
import { fetchGrievances, resolveGrievance } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Clock, Scale } from 'lucide-react';

export const PublicGrievances = () => {
  const { user, activeRole, selectedProjectId , t } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grievances, setGrievances] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveRemarks, setResolveRemarks] = useState('');

  useEffect(() => {
    async function loadGrievances() {
      setLoading(true);
      const grievancesList = await fetchGrievances(null, selectedProjectId);
      setGrievances(grievancesList || []);
      setLoading(false);
    }
    loadGrievances();
  }, [selectedProjectId]);

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
        const grievancesList = await fetchGrievances(null, selectedProjectId);
        setGrievances(grievancesList || []);
      }
    } catch (err) {
      alert('Error resolving grievance: ' + err.message);
    }
  };

  if (activeRole.id !== 'collector') {
    return (
      <div className="p-8 text-center text-slate-400">{t('You do not have permission to view Public Grievances.')}</div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto font-sans text-slate-100">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-amber-400" />
            <span>{t('Public Grievances & Petitions')}</span>
          </h2>
          <span className="text-sm px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg font-bold">
            {grievances.filter(g => g.status === 'Pending').length} {t('Pending Petitions')}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-slate-800 rounded-2xl w-full"></div>
            <div className="h-32 bg-slate-800 rounded-2xl w-full"></div>
          </div>) : grievances.length === 0 ? (<div className="p-12 text-center text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800/60">{t('No public grievances found.')}</div>
        ) : (
          <div className="space-y-4">
            {grievances.map(g => (
              <div key={g.id} className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col xl:flex-row xl:items-start justify-between gap-6 hover:border-slate-700 transition">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-cyan-400">{g.token_no}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        g.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' 
                        : g.status === 'Official Replied' ? 'bg-indigo-500/20 text-indigo-400' 
                        : (g.status === 'Pending' && Math.floor((new Date() - new Date(g.created_at)) / (1000 * 60 * 60 * 24)) > 30) ? 'bg-rose-600/30 text-rose-300 border border-rose-500'
                        : 'bg-rose-500/20 text-rose-400'
                      }`}>
                      {(g.status === 'Pending' && Math.floor((new Date() - new Date(g.created_at)) / (1000 * 60 * 60 * 24)) > 30) ? t('Escalated to Collector (Over 30 Days)') : t(g.status)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {new Date(g.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-white">{t(g.owner_name)} <span className="text-sm font-normal text-slate-400">({g.owner_email})</span></div>
                  <div className="text-sm text-slate-400 font-mono">{t('Parcel ULPIN:')} <span className="text-slate-300 font-bold">{g.ulpin}</span></div>
                  <div className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800/60 shadow-inner">
                    "{t(g.description)}"
                  </div>
                  
                  {g.remarks && (
                    <div className="mt-4 p-4 bg-indigo-950/20 border-l-4 border-indigo-500 text-sm text-indigo-300 rounded-r-xl">
                      <strong className="text-indigo-400">{t('Official Reply / Resolution Remarks:')}</strong> <br/>{t(g.remarks)}
                    </div>
                  )}
                </div>

                {g.status === 'Pending' && (
                  <div className="w-full xl:w-96 bg-slate-900 p-5 rounded-2xl border border-slate-800 shrink-0 space-y-4 shadow-xl">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-400" />{t('Execute Resolution')}</h4>
                    <textarea 
                      rows={4}
                      placeholder={t('Enter legal resolution remarks or instructions...')}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                      value={resolvingId === g.id ? resolveRemarks : ''}
                      onChange={(e) => {
                        setResolvingId(g.id);
                        setResolveRemarks(e.target.value);
                      }}
                    />
                    <button
                      onClick={handleResolveGrievance}
                      disabled={resolvingId !== g.id || !resolveRemarks}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-lg shadow-indigo-900/40"
                    >{t('Submit Official Reply')}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
