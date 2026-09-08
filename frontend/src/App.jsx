import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProjectDossierBar } from './components/ProjectDossierBar';
import { LoginPage } from './pages/LoginPage';
import { ProposalSubmission } from './pages/ProposalSubmission';
import { NationalDashboard } from './pages/NationalDashboard';
import { GisSpatialViewer } from './pages/GisSpatialViewer';
import { ProjectStatus } from './pages/ProjectStatus';
import { ScrutinyConsole } from './pages/ScrutinyConsole';
import { PublicGrievances } from './pages/PublicGrievances';
import { CompensationDisbursement } from './pages/CompensationDisbursement';
import { RehabilitationResettlement } from './pages/RehabilitationResettlement';
import { CitizenPortal } from './pages/CitizenPortal';
import { FieldSurveyMobile } from './pages/FieldSurveyMobile';
import { DocumentAuditLedger } from './pages/DocumentAuditLedger';

export function MainLayout() {
  const { isAuthenticated, activeTab, setActiveTab, isTabAllowed } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
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
        return<NationalDashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-full overflow-hidden relative">
      {/* Colorful Background Gradients matching the Login Page Feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[60%] bg-cyan-900/10 blur-[100px] rounded-full"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-teal-900/10 blur-[100px] rounded-full"></div>
      </div>
      <div className="relative z-10 flex flex-col h-full w-full">
      <Header />
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <Sidebar />
        
        

        <main className={`flex-1 overflow-x-hidden ${activeTab === 'gis' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-6'} flex flex-col min-w-0`}>
          {activeTab !== 'dashboard' && activeTab !== 'citizen' && activeTab !== 'proposal' && <ProjectDossierBar />}
          <div className={`flex-1 min-w-0 max-w-full overflow-x-hidden ${activeTab === 'gis' ? 'flex flex-col h-full overflow-hidden' : ''}`}>
            {renderActiveView()}
          </div>
        </main>
      </div>
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
