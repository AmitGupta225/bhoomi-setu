import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProjects, fetchProjectDetail } from '../services/api';
import { Building2, ChevronRight, Layers } from 'lucide-react';

export const ProjectDossierBar = () => {
  const { selectedProjectId, setSelectedProjectId, projectRefreshCount } = useAuth();
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
    <div className="bg-slate-900/95 border-b border-slate-800 px-4 lg:px-8 py-2 sticky top-0 z-20 shadow-md backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 text-xs">
        
        {/* Dedicated Project Selector */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 text-xs font-medium shrink-0 hidden sm:inline">Active Project:</span>

            <select
              value={selectedProjectId}
              onChange={(e) => handleSelect(e.target.value)}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-white py-1.5 px-3 focus:outline-none focus:border-emerald-500 transition cursor-pointer max-w-[320px] sm:max-w-[480px] truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Identifier Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-slate-800 border border-slate-700/80 rounded-lg text-emerald-400">
            {activeProject.code}
          </span>
        </div>

      </div>
    </div>
  );
};
