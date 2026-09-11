import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProjects, fetchProjectDetail } from '../services/api';
import { Building2, ChevronRight, Layers } from 'lucide-react';

export const ProjectDossierBar = () => {
  const { selectedProjectId, setSelectedProjectId, projectRefreshCount, theme, t } = useAuth();
  const isDark = theme === 'dark';
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    async function loadProjects() {
      const list = await fetchProjects();
      setProjects(list);
      if (selectedProjectId) {
        const detail = await fetchProjectDetail(selectedProjectId);
        setActiveProject(detail || (list.find(p => p.id === selectedProjectId)));
      } else if (list.length > 0) {
        setSelectedProjectId(list[0].id);
        const detail = await fetchProjectDetail(list[0].id);
        setActiveProject(detail || list[0]);
      }
    }
    loadProjects();
  }, [selectedProjectId, projectRefreshCount]);

  const handleSelect = async (id) => {
    setSelectedProjectId(id);
    const detail = await fetchProjectDetail(id);
    setActiveProject(detail);
  };

  if (!activeProject) return null;

  return (
    <div className={`border-b px-2.5 sm:px-4 py-1.5 sticky top-0 z-20 shadow-sm backdrop-blur-md transition-colors ${
      isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
    }`}>
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 text-xs">
        
        {/* Dedicated Project Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg border shrink-0 ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            <Building2 className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`text-xs font-medium shrink-0 hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('Active Project:')}
            </span>

            <select
              value={selectedProjectId}
              onChange={(e) => handleSelect(e.target.value)}
              className={`border rounded-xl text-xs font-bold py-1.5 px-2 sm:px-3 focus:outline-none focus:border-emerald-500 transition cursor-pointer max-w-[160px] xs:max-w-[200px] sm:max-w-[480px] truncate ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
              }`}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {t(p.name)} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Identifier Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`notranslate text-[10px] font-mono font-bold px-2 py-1 border rounded-lg ${
            isDark ? 'bg-slate-800 border-slate-700/80 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {activeProject.code}
          </span>
        </div>

      </div>
    </div>
  );
};
