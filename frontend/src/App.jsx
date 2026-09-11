import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProjectDossierBar } from './components/ProjectDossierBar';
import { 
  BarChart3, 
  GitMerge, 
  Map, 
  Layers, 
  Menu
} from 'lucide-react';

// Code-split page components with React.lazy
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ProposalSubmission = lazy(() => import('./pages/ProposalSubmission').then(m => ({ default: m.ProposalSubmission })));
const NationalDashboard = lazy(() => import('./pages/NationalDashboard').then(m => ({ default: m.NationalDashboard })));
const GisSpatialViewer = lazy(() => import('./pages/GisSpatialViewer').then(m => ({ default: m.GisSpatialViewer })));
const ProjectStatus = lazy(() => import('./pages/ProjectStatus').then(m => ({ default: m.ProjectStatus })));
const ScrutinyConsole = lazy(() => import('./pages/ScrutinyConsole').then(m => ({ default: m.ScrutinyConsole })));
const PublicGrievances = lazy(() => import('./pages/PublicGrievances').then(m => ({ default: m.PublicGrievances })));
const CompensationDisbursement = lazy(() => import('./pages/CompensationDisbursement').then(m => ({ default: m.CompensationDisbursement })));
const RehabilitationResettlement = lazy(() => import('./pages/RehabilitationResettlement').then(m => ({ default: m.RehabilitationResettlement })));
const CitizenPortal = lazy(() => import('./pages/CitizenPortal').then(m => ({ default: m.CitizenPortal })));
const FieldSurveyMobile = lazy(() => import('./pages/FieldSurveyMobile').then(m => ({ default: m.FieldSurveyMobile })));
const DocumentAuditLedger = lazy(() => import('./pages/DocumentAuditLedger').then(m => ({ default: m.DocumentAuditLedger })));

const ViewLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 min-h-[300px]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin"></div>
    <span className="text-xs text-slate-400 font-medium">Loading Workspace...</span>
  </div>
);

export function MainLayout() {
  const { 
    isAuthenticated, 
    activeTab, 
    setActiveTab, 
    isTabAllowed, 
    activeRole,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    theme,
    t
  } = useAuth();
  const isDark = theme === 'dark';

  React.useEffect(() => {
    window.__setActiveTab = setActiveTab;
  }, [setActiveTab]);

  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#071120] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin"></div>
        </div>
      }>
        <LoginPage />
      </Suspense>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'proposal':
        return <ProposalSubmission onNavigate={(tab) => setActiveTab(tab)} />;
      case 'dashboard':
        return <NationalDashboard onNavigate={(tab) => setActiveTab(tab)} />;
      case 'gis':
        return <GisSpatialViewer />;
      case 'workflow':
        return <ProjectStatus />;
      case 'scrutiny':
        return <ScrutinyConsole />;
      case 'grievances':
        return <PublicGrievances />;
      case 'compensation':
        return <CompensationDisbursement />;
      case 'rr':
        return <RehabilitationResettlement />;
      case 'citizen':
        return <CitizenPortal />;
      case 'field':
        return <FieldSurveyMobile />;
      case 'documents':
        return <DocumentAuditLedger />;
      default:
        return <NationalDashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  // Select 4 primary shortcuts for mobile bottom bar
  const bottomBarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'workflow', label: 'Status', icon: GitMerge },
    { id: 'gis', label: 'Map', icon: Map },
    // 4th slot: role-specific primary tab
    activeRole.defaultTab !== 'dashboard' && activeRole.defaultTab !== 'gis' && activeRole.defaultTab !== 'workflow'
      ? { id: activeRole.defaultTab, label: 'Workspace', icon: Layers }
      : { id: 'documents', label: 'Vault', icon: Layers }
  ].filter(item => isTabAllowed(item.id));

  return (
    <div className={`h-screen flex flex-col font-sans max-w-full overflow-hidden relative ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Colorful Background Gradients matching the Portal Theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] blur-[120px] rounded-full ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-200/40'}`}></div>
        <div className={`absolute bottom-[10%] -right-[10%] w-[40%] h-[60%] blur-[100px] rounded-full ${isDark ? 'bg-cyan-900/10' : 'bg-cyan-200/30'}`}></div>
        <div className={`absolute top-[40%] left-[30%] w-[30%] h-[30%] blur-[100px] rounded-full ${isDark ? 'bg-teal-900/10' : 'bg-teal-200/30'}`}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">
        <Header />

        <div className="flex-1 flex min-w-0 overflow-hidden relative">
          <Sidebar />

          <main className={`flex-1 overflow-x-hidden ${activeTab === 'gis' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-20 md:pb-6'} flex flex-col min-w-0`}>
            {activeTab !== 'dashboard' && activeTab !== 'citizen' && activeTab !== 'proposal' && <ProjectDossierBar />}
            <div className={`flex-1 min-w-0 max-w-full overflow-x-hidden ${activeTab === 'gis' ? 'flex flex-col h-full overflow-hidden' : ''}`}>
              <Suspense fallback={<ViewLoader />}>
                {renderActiveView()}
              </Suspense>
            </div>
          </main>
        </div>

        {/* ── Mobile Bottom Quick Navigation Bar (md:hidden) ────────── */}
        <nav className={`md:hidden fixed bottom-0 inset-x-0 backdrop-blur-lg border-t z-40 px-2 py-1.5 flex items-center justify-around shadow-2xl transition-colors ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-slate-300'
        }`}>
          {bottomBarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
                  isActive 
                    ? (isDark ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
                }`}
              >
                <Icon size={18} className={isActive ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-slate-400' : 'text-slate-500')} />
                <span className="text-[10px] leading-tight">{t(item.label)}</span>
              </button>
            );
          })}

          {/* "More / Menu" button toggles full mobile drawer */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Menu size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <span className="text-[10px] leading-tight">{t('More')}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
