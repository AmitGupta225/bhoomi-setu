import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProjectDossierBar } from './components/ProjectDossierBar';

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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[300px]">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-black text-xl">
            !
          </div>
          <h2 className="text-base font-bold text-white">Something went wrong in this workspace</h2>
          <p className="text-xs text-slate-400 max-w-md font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    theme
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

          <main className={`flex-1 overflow-x-hidden ${activeTab === 'gis' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-6'} flex flex-col min-w-0`}>
            {activeTab !== 'dashboard' && activeTab !== 'citizen' && activeTab !== 'proposal' && <ProjectDossierBar />}
            <div className={`flex-1 min-w-0 max-w-full overflow-x-hidden ${activeTab === 'gis' ? 'flex flex-col h-full overflow-hidden' : ''}`}>
              <ErrorBoundary>
                <Suspense fallback={<ViewLoader />}>
                  {renderActiveView()}
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ErrorBoundary>
  );
}
