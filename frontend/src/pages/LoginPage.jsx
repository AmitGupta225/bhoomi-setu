import React, { useState } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Users, 
  FileSignature, 
  Building,
  Landmark,
  FileCheck2,
  Lock,
  Smartphone,
  IndianRupee,
  Home,
  Sun,
  Moon,
  AlertCircle
} from 'lucide-react';

export const LoginPage = () => {
  const { login, toggleTheme, theme, language, toggleLanguage, t } = useAuth();
  
  const [selectedRoleKey, setSelectedRoleKey] = useState('COLLECTOR');
  const [email, setEmail] = useState('collector.palghar@gov.in');
  const [password, setPassword] = useState('password123');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hardcoded demo accounts matching the roles grid in the mockup
  const demoAccounts = [
    {
      key: 'REQUIRING_BODY',
      title: 'Land Requiring Body',
      subtitle: 'NHAI / Railways / Ministry',
      icon: Building2,
      email: 'nhai.proposals@gov.in'
    },
    {
      key: 'COLLECTOR',
      title: 'District Collectorate',
      subtitle: 'District Acquisition Body',
      icon: ShieldCheck,
      email: 'collector.palghar@gov.in'
    },
    {
      key: 'STATE_GOV',
      title: 'State Government',
      subtitle: 'State Revenue Department',
      icon: Landmark,
      email: 'secy.revenue@maharashtra.gov.in'
    },
    {
      key: 'SLAO',
      title: 'Land Acquiring Officer',
      subtitle: 'SLAO Valuation Desk',
      icon: Building,
      email: 'slao.palghar@gov.in'
    },
    {
      key: 'PFMS_OFFICER',
      title: 'PFMS Finance Officer',
      subtitle: 'Financial Treasury Desk',
      icon: IndianRupee,
      email: 'pfms.treasury@gov.in'
    },
    {
      key: 'RR_OFFICER',
      title: 'R&R Commissioner',
      subtitle: 'Rehabilitation Office',
      icon: Home,
      email: 'rr.commissioner@gov.in'
    },
    {
      key: 'SURVEYOR',
      title: 'Cadastral Surveyor',
      subtitle: 'Field Inspector',
      icon: Smartphone,
      email: 'surveyor.field@gov.in'
    },
    {
      key: 'CITIZEN',
      title: 'Affected Landowner',
      subtitle: 'Public Citizen Portal',
      icon: Users,
      email: 'landowner.public@gmail.com'
    }
  ];

  const handleRoleSelect = (acc) => {
    setSelectedRoleKey(acc.key);
    setEmail(acc.email);
    setPassword('password123');
    setAuthError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    
    const res = await loginUser(email, password);
    setSubmitting(false);

    if (res.success && res.user) {
      const roleObj = ROLES[res.user.roleKey] || ROLES[selectedRoleKey];
      login({
        name: res.user.name,
        email: res.user.email,
        roleKey: res.user.roleKey,
        role: roleObj
      });
    } else {
      setAuthError(res.error || 'Authentication Failed. Invalid username or password.');
    }
  };

  const activeAccount = demoAccounts.find(a => a.key === selectedRoleKey) || demoAccounts[1];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden relative">
      
      {/* Top Header Navbar exactly like mockup */}
      <header className="flex justify-between items-center px-8 py-5 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-lg">BS</div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-heading tracking-widest text-white leading-tight">
              {t('BHOOMI SETU')}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {t('National Land Acquisition Portal')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition text-sm font-medium text-slate-300 shadow-md shadow-black/20"
          >
            <span className="font-bold text-emerald-400">{language === 'en' ? 'A' : 'अ'}</span>
            {language === 'en' ? 'हिन्दी' : 'English'}
          </button>

          <button 
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition text-sm font-medium text-slate-300 shadow-md shadow-black/20"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            {theme === 'dark' ? t('Light Mode') : t('Dark Mode')}
          </button>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 lg:p-10 max-w-[1600px] mx-auto w-full z-10 relative">
        
        {/* Left Panel: Role Selection */}
        <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-8 flex flex-col shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-8">Select Stakeholder Role</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {demoAccounts.map(acc => {
              const Icon = acc.icon;
              const isSelected = selectedRoleKey === acc.key;
              return (
                <button
                  key={acc.key}
                  type="button"
                  onClick={() => handleRoleSelect(acc)}
                  className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between relative group ${
                    isSelected 
                      ? 'bg-slate-800/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/30' 
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {t('Active')}
                    </div>
                  )}
                  
                  <div className="w-10 h-10 mb-4 rounded-xl bg-slate-900 border border-slate-700/80 text-emerald-400 group-hover:scale-110 transition flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div>
                    <h4 className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {t(acc.title)}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {t(acc.subtitle)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Sign In Form */}
        <div className="w-full lg:w-[450px] xl:w-[500px] bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-8 flex flex-col shadow-2xl relative">
          
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold text-white">Sign In</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{t(activeAccount.title)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
            
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {t(authError)}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {t('Email Address')}
              </label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                {t('Password')}
              </label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
              />
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 text-lg shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {submitting ? t('Authenticating...') : t('Sign In')}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            
          </form>

          <div className="mt-auto pt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4" />
            <span>Protected under RFCTLARR 2013 Statutory Compliance Standards</span>
          </div>
        </div>

      </main>
      
      {/* Background Orbs to match the aesthetic */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
};
