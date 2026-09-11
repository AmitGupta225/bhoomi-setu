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
  ChevronRight,
  X
} from 'lucide-react';

export const Sidebar = () => {
  const { 
    activeRole, 
    activeTab, 
    setActiveTab, 
    isTabAllowed, 
    isMobileMenuOpen, 
    setIsMobileMenuOpen, 
    t 
  } = useAuth();
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

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile, visible on md+) ─────── */}
      <aside className={`relative bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-full p-1 z-50 transition-colors shadow-lg shadow-black/50 hidden md:flex items-center justify-center"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Upper Role-Tailored Navigation Items */}
        <div className="p-4 space-y-2">
          <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden py-0' : 'opacity-100'}`}>
            {t(activeRole.badge)} {t('Workspace')}
          </div>

          <div className="space-y-1 pt-1">
            {roleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  data-tab={item.id}
                  onClick={() => handleNavClick(item.id)}
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

      {/* ── Mobile Slide-Over Drawer (visible when isMobileMenuOpen on < md) ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <span className="font-black text-emerald-400 text-xs">BS</span>
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white leading-tight">{t('BHOOMI')} <span className="text-emerald-400">{t('SETU')}</span></div>
                    <div className="text-[10px] text-slate-400">{t(activeRole.badge)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  aria-label="Close Navigation"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1.5 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar pr-1">
                {roleNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      data-tab={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-950/30' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                      <span className="truncate">{t(item.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Footer in Mobile Drawer */}
            <div className="pt-3 border-t border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-500">
                Digital India • NIC • MoRD
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
