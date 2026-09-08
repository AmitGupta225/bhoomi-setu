import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FilePlus,
  BarChart3, 
  Map, 
  GitMerge, 
  IndianRupee, 
  Home, 
  Users, 
  Smartphone, 
  FileCheck2,
  CheckSquare,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Sidebar = () => {
  const { activeRole, activeTab, setActiveTab, isTabAllowed, t } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'workflow', label: 'Project Status', icon: GitMerge },
    { id: 'scrutiny', label: 'Approvals & Scrutiny', icon: CheckSquare },
    { id: 'grievances', label: 'Public Grievances', icon: MessageSquare },
    { id: 'proposal', label: 'Submit Proposal', icon: FilePlus },
    { id: 'gis', label: 'GIS Spatial Hub', icon: Map },
    { id: 'compensation', label: 'PFMS Compensation', icon: IndianRupee },
    { id: 'rr', label: 'R&R Entitlements', icon: Home },
    { id: 'citizen', label: 'Landowner Portal', icon: Users },
    { id: 'field', label: 'GIS & Field Survey Map', icon: Smartphone },
    { id: 'documents', label: 'Document Vault', icon: FileCheck2 }
  ];

  const roleNavItems = allNavItems.filter(item => isTabAllowed(item.id));

  return (
    <aside className={`relative bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-full p-1 z-50 transition-colors shadow-lg shadow-black/50 hidden md:flex items-center justify-center"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Upper Role-Tailored Navigation Items */}
      <div className="p-4 space-y-2">
        <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden py-0' : 'opacity-100'}`}>
          {activeRole.badge} Workspace
        </div>

        <div className="space-y-1 pt-1">
          {roleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? t(item.label) : undefined}
                className={`w-full flex items-center px-3.5 py-3 rounded-xl text-xs font-medium transition group ${
                  isActive 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-bold shadow-lg shadow-emerald-950/40' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <Icon className={`w-4 h-4 transition ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                  {!isCollapsed && <span className="whitespace-nowrap">{t(item.label)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
