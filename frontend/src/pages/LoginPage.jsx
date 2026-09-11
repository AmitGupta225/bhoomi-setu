import React, { useState } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  MapPin,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Building,
  Landmark,
  FileText,
  Users,
  Smartphone,
  IndianRupee,
  Home,
  Sprout,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  Clock,
  Fingerprint,
  CreditCard,
  Vote,
  CheckCircle2,
  X,
  KeyRound
} from 'lucide-react';

export const LoginPage = () => {
  const { login, toggleTheme, theme, language, toggleLanguage, t } = useAuth();
  const isDark = theme === 'dark';

  const [selectedRoleKey, setSelectedRoleKey] = useState('COLLECTOR');
  const [email, setEmail] = useState('collector.palghar@gov.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Indian Government Document Options for Digital Identity Login
  const GOV_DOC_TYPES = [
    {
      id: 'aadhaar',
      name: 'Aadhaar / DigiLocker',
      authority: 'UIDAI • Unique Identification Authority of India',
      icon: Fingerprint,
      placeholder: 'e.g. 5489 2104 9821',
      demoId: '5489 2104 9821',
      label: '12-Digit Aadhaar / 16-Digit Virtual ID (VID)',
      defaultRole: 'CITIZEN'
    },
    {
      id: 'parichay',
      name: 'Jan Parichay (MeriPehchaan)',
      authority: 'National Single Sign-On Gateway (MeitY)',
      icon: Landmark,
      placeholder: 'e.g. collector.palghar@gov.in',
      demoId: 'collector.palghar@gov.in',
      label: 'Government Parichay Email / Username',
      defaultRole: 'COLLECTOR'
    },
    {
      id: 'pan',
      name: 'PAN Card (Income Tax)',
      authority: 'Income Tax Department, Govt of India',
      icon: CreditCard,
      placeholder: 'e.g. BKWPV8492K',
      demoId: 'BKWPV8492K',
      label: '10-Character Alphanumeric PAN Card Number',
      defaultRole: 'PFMS_OFFICER'
    },
    {
      id: 'sparrow',
      name: 'SPARROW / e-Office ID',
      authority: 'Department of Personnel & Training (DoPT)',
      icon: Building2,
      placeholder: 'e.g. IAS/MH/2014/0082',
      demoId: 'IAS/MH/2014/0082',
      label: 'Civil Services Cadre / Employee Code',
      defaultRole: 'SLAO'
    },
    {
      id: 'voter',
      name: 'Voter ID (EPIC)',
      authority: 'Election Commission of India (ECI)',
      icon: Vote,
      placeholder: 'e.g. MH/12/345/678901',
      demoId: 'MH/12/345/678901',
      label: '10-Character Elector Photo Identity Card No.',
      defaultRole: 'CITIZEN'
    },
    {
      id: 'ulpin',
      name: 'ULPIN / Bhu-Aadhaar',
      authority: 'Department of Land Resources (DoLR)',
      icon: MapPin,
      placeholder: 'e.g. IN-MH-PAL-2026-00101',
      demoId: 'IN-MH-PAL-2026-00101',
      label: '14-Digit Bhu-Aadhaar Unique Parcel Code',
      defaultRole: 'SURVEYOR'
    }
  ];

  // Government ID Login Modal State
  const [showGovIdModal, setShowGovIdModal] = useState(false);
  const [selectedGovDocId, setSelectedGovDocId] = useState('aadhaar');
  const [govDocNumber, setGovDocNumber] = useState('5489 2104 9821');
  const [govRoleKey, setGovRoleKey] = useState('COLLECTOR');
  const [govOtpSent, setGovOtpSent] = useState(false);
  const [govOtpCode, setGovOtpCode] = useState('');
  const [govVerifying, setGovVerifying] = useState(false);
  const [govError, setGovError] = useState('');
  const [govSuccess, setGovSuccess] = useState(false);

  const selectedDoc = GOV_DOC_TYPES.find(d => d.id === selectedGovDocId) || GOV_DOC_TYPES[0];

  // Exact initial 8 stakeholder roles with dark + light styling
  const demoAccounts = [
    {
      key: 'REQUIRING_BODY',
      title: 'Land Requiring Body',
      subtitle: 'NHAI / Railways / Ministry',
      icon: Building2,
      email: 'nhai.proposals@gov.in',
      roleKey: 'REQUIRING_BODY',
      gradient: isDark
        ? 'from-[#0b2344] via-[#091a33] to-[#071324]'
        : 'from-blue-50 via-sky-50 to-blue-100/50',
      border: isDark
        ? 'border-cyan-500/30 hover:border-cyan-400/60'
        : 'border-blue-200/90 hover:border-blue-400 shadow-sm',
      iconColor: isDark ? 'text-cyan-400' : 'text-blue-600',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-blue-100 border-blue-200',
      watermarkColor: isDark ? 'text-cyan-400' : 'text-blue-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <rect x="10" y="85" width="80" height="8" rx="2" />
          <rect x="15" y="78" width="70" height="6" />
          <path d="M50 10 L15 32 L85 32 Z" />
          <rect x="22" y="34" width="8" height="42" rx="1" />
          <rect x="36" y="34" width="8" height="42" rx="1" />
          <rect x="56" y="34" width="8" height="42" rx="1" />
          <rect x="70" y="34" width="8" height="42" rx="1" />
        </svg>
      )
    },
    {
      key: 'COLLECTOR',
      title: 'District Collectorate',
      subtitle: 'District Acquisition Body',
      icon: ShieldCheck,
      email: 'collector.palghar@gov.in',
      roleKey: 'COLLECTOR',
      isMostUsed: true,
      gradient: isDark
        ? 'from-[#0d3434] via-[#0a2727] to-[#061818]'
        : 'from-emerald-50 via-teal-50 to-emerald-100/50',
      border: isDark
        ? 'border-teal-400/40 hover:border-teal-300'
        : 'border-emerald-300 hover:border-emerald-500 shadow-sm',
      iconColor: isDark ? 'text-teal-300' : 'text-emerald-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-emerald-100 border-emerald-200',
      watermarkColor: isDark ? 'text-teal-400' : 'text-emerald-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 12 C35 12 30 25 30 35 L70 35 C70 25 65 12 50 12 Z" />
          <rect x="25" y="35" width="50" height="6" />
          <rect x="15" y="42" width="70" height="45" rx="2" />
          <rect x="22" y="48" width="8" height="30" opacity="0.4" />
          <rect x="36" y="48" width="8" height="30" opacity="0.4" />
          <rect x="56" y="48" width="8" height="30" opacity="0.4" />
          <rect x="70" y="48" width="8" height="30" opacity="0.4" />
        </svg>
      )
    },
    {
      key: 'SLAO',
      title: 'Land Acquiring Officer',
      subtitle: 'SLAO Valuation Desk',
      icon: Building,
      email: 'slao.palghar@gov.in',
      roleKey: 'SLAO',
      gradient: isDark
        ? 'from-[#281545] via-[#1e0f35] to-[#140a24]'
        : 'from-purple-50 via-fuchsia-50 to-purple-100/50',
      border: isDark
        ? 'border-purple-500/30 hover:border-purple-400/60'
        : 'border-purple-200/90 hover:border-purple-400 shadow-sm',
      iconColor: isDark ? 'text-purple-300' : 'text-purple-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-purple-100 border-purple-200',
      watermarkColor: isDark ? 'text-purple-400' : 'text-purple-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <path d="M25 15 L60 15 L75 30 L75 85 L25 85 Z" />
          <circle cx="50" cy="65" r="10" opacity="0.5" />
          <line x1="32" y1="40" x2="55" y2="40" stroke="currentColor" strokeWidth="3" />
          <line x1="32" y1="48" x2="68" y2="48" stroke="currentColor" strokeWidth="3" />
        </svg>
      )
    },
    {
      key: 'STATE_GOV',
      title: 'State Government',
      subtitle: 'State Revenue Department',
      icon: Landmark,
      email: 'secy.revenue@maharashtra.gov.in',
      roleKey: 'STATE_GOV',
      gradient: isDark
        ? 'from-[#0e2c2f] via-[#092022] to-[#061416]'
        : 'from-teal-50 via-cyan-50 to-teal-100/50',
      border: isDark
        ? 'border-emerald-500/30 hover:border-emerald-400/60'
        : 'border-teal-200/90 hover:border-teal-400 shadow-sm',
      iconColor: isDark ? 'text-emerald-300' : 'text-teal-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-teal-100 border-teal-200',
      watermarkColor: isDark ? 'text-teal-400' : 'text-teal-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 18 L20 38 L80 38 Z" />
          <rect x="18" y="38" width="64" height="6" />
          <rect x="24" y="44" width="7" height="40" />
          <rect x="39" y="44" width="7" height="40" />
          <rect x="54" y="44" width="7" height="40" />
          <rect x="69" y="44" width="7" height="40" />
          <rect x="14" y="84" width="72" height="6" />
        </svg>
      )
    },
    {
      key: 'PFMS_OFFICER',
      title: 'PFMS Finance Officer',
      subtitle: 'Financial Treasury Desk',
      icon: IndianRupee,
      email: 'pfms.treasury@gov.in',
      roleKey: 'PFMS_OFFICER',
      gradient: isDark
        ? 'from-[#33260c] via-[#241a06] to-[#171003]'
        : 'from-amber-50 via-yellow-50 to-amber-100/50',
      border: isDark
        ? 'border-amber-500/30 hover:border-amber-400/60'
        : 'border-amber-200/90 hover:border-amber-400 shadow-sm',
      iconColor: isDark ? 'text-amber-400' : 'text-amber-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-amber-100 border-amber-200',
      watermarkColor: isDark ? 'text-amber-400' : 'text-amber-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="6" />
          <path d="M38 32 L62 32 M38 42 L62 42 M38 32 L38 52 Q52 52 52 64 Q52 74 38 74 L60 74" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      key: 'RR_OFFICER',
      title: 'R&R Commissioner',
      subtitle: 'Rehabilitation Office',
      icon: Home,
      email: 'rr.commissioner@gov.in',
      roleKey: 'RR_OFFICER',
      gradient: isDark
        ? 'from-[#112444] via-[#0c1a32] to-[#07101f]'
        : 'from-sky-50 via-blue-50 to-cyan-100/50',
      border: isDark
        ? 'border-blue-500/30 hover:border-blue-400/60'
        : 'border-cyan-200/90 hover:border-cyan-400 shadow-sm',
      iconColor: isDark ? 'text-blue-300' : 'text-cyan-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-cyan-100 border-cyan-200',
      watermarkColor: isDark ? 'text-blue-400' : 'text-cyan-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <path d="M15 45 L50 15 L85 45 L85 85 L15 85 Z" />
          <rect x="40" y="55" width="20" height="30" opacity="0.4" />
          <rect x="25" y="48" width="12" height="14" opacity="0.4" />
          <rect x="63" y="48" width="12" height="14" opacity="0.4" />
        </svg>
      )
    },
    {
      key: 'SURVEYOR',
      title: 'Cadastral Surveyor',
      subtitle: 'Field Inspector',
      icon: Smartphone,
      email: 'surveyor.field@gov.in',
      roleKey: 'SURVEYOR',
      gradient: isDark
        ? 'from-[#351025] via-[#260919] to-[#18040f]'
        : 'from-rose-50 via-pink-50 to-rose-100/50',
      border: isDark
        ? 'border-pink-500/30 hover:border-pink-400/60'
        : 'border-rose-200/90 hover:border-rose-400 shadow-sm',
      iconColor: isDark ? 'text-pink-300' : 'text-rose-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-rose-100 border-rose-200',
      watermarkColor: isDark ? 'text-pink-400' : 'text-rose-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <rect x="42" y="16" width="16" height="14" rx="2" />
          <circle cx="50" cy="23" r="4" opacity="0.4" />
          <line x1="30" y1="23" x2="70" y2="23" stroke="currentColor" strokeWidth="4" />
          <line x1="50" y1="30" x2="20" y2="88" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <line x1="50" y1="30" x2="50" y2="88" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="30" x2="80" y2="88" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
      )
    },
    {
      key: 'CITIZEN',
      title: 'Affected Landowner',
      subtitle: 'Public Citizen Portal',
      icon: Users,
      email: 'landowner.public@gmail.com',
      roleKey: 'CITIZEN',
      gradient: isDark
        ? 'from-[#0e3020] via-[#092216] to-[#05150d]'
        : 'from-green-50 via-emerald-50 to-green-100/50',
      border: isDark
        ? 'border-emerald-500/30 hover:border-emerald-400/60'
        : 'border-green-200/90 hover:border-green-400 shadow-sm',
      iconColor: isDark ? 'text-emerald-400' : 'text-green-700',
      iconBg: isDark ? 'bg-black/40 border-white/10' : 'bg-green-100 border-green-200',
      watermarkColor: isDark ? 'text-emerald-400' : 'text-green-600',
      watermark: (color) => (
        <svg className={`w-24 h-24 ${color}`} viewBox="0 0 100 100" fill="currentColor">
          <path d="M10 82 Q50 65 90 82 Z" />
          <path d="M50 30 Q65 45 50 65 Q35 45 50 30 Z" />
          <path d="M30 45 Q45 55 35 70 Q20 60 30 45 Z" />
          <path d="M70 45 Q55 55 65 70 Q80 60 70 45 Z" />
          <line x1="50" y1="30" x2="50" y2="80" stroke="currentColor" strokeWidth="4" />
        </svg>
      )
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
      const normalizedRoleKey = (res.user.roleKey || selectedRoleKey || 'COLLECTOR').toUpperCase();
      const roleObj = ROLES[normalizedRoleKey] || ROLES[selectedRoleKey] || ROLES['COLLECTOR'];
      login({
        name: res.user.name,
        email: res.user.email,
        roleKey: normalizedRoleKey,
        role: roleObj
      });
    } else {
      setAuthError(res.error || 'Authentication Failed. Invalid username or password.');
    }
  };

  const handleSelectGovDoc = (doc) => {
    setSelectedGovDocId(doc.id);
    setGovDocNumber(doc.demoId);
    setGovRoleKey(doc.defaultRole);
    setGovOtpSent(false);
    setGovOtpCode('');
    setGovError('');
  };

  const handleSendGovOtp = (e) => {
    if (e) e.preventDefault();
    if (!govDocNumber.trim()) {
      setGovError(t('Please enter a valid document or identity number.'));
      return;
    }
    setGovError('');
    setGovOtpSent(true);
    setGovOtpCode('582914');
  };

  const handleVerifyGovId = (e) => {
    if (e) e.preventDefault();
    if (!govOtpCode.trim() || govOtpCode.length < 4) {
      setGovError(t('Please enter the 6-digit verification code.'));
      return;
    }

    setGovVerifying(true);
    setGovError('');

    setTimeout(() => {
      setGovVerifying(false);
      setGovSuccess(true);

      const targetAccount = demoAccounts.find(a => a.key === govRoleKey) || demoAccounts[0];
      const normalizedRoleKey = (targetAccount.roleKey || 'COLLECTOR').toUpperCase();
      const roleObj = ROLES[normalizedRoleKey] || ROLES['COLLECTOR'];

      setTimeout(() => {
        setShowGovIdModal(false);
        login({
          name: `${targetAccount.title} (${selectedDoc.name.split(' ')[0]} Verified)`,
          email: targetAccount.email,
          roleKey: normalizedRoleKey,
          role: roleObj
        });
      }, 600);
    }, 700);
  };

  return (
    <div
      className={`login-page min-h-screen w-full flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#071120] text-slate-100' : 'bg-slate-100/90 text-slate-800'
      }`}
    >
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <header
        className={`flex justify-between items-center px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-md relative z-[99999] border-b transition-colors duration-300 max-w-full ${
          isDark
            ? 'bg-[#0a1628]/95 border-slate-800/80 shadow-md'
            : 'bg-white/95 border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
              isDark
                ? 'bg-teal-500/15 border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.25)]'
                : 'bg-emerald-50 border-emerald-300 shadow-sm'
            }`}
          >
            <MapPin size={15} className={`sm:w-[18px] sm:h-[18px] ${isDark ? 'text-teal-400' : 'text-emerald-600'}`} />
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-0.5">
              <span className={`text-xs sm:text-sm font-black tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('BHOOMI')}&nbsp;
              </span>
              <span className={`text-xs sm:text-sm font-black tracking-widest ${isDark ? 'text-teal-400' : 'text-emerald-600'}`}>
                {t('SETU')}
              </span>
              <span className="ml-1 text-xs sm:text-sm">🌿</span>
            </div>
            <p className={`text-[10px] font-medium tracking-wide hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('Transparent Land Acquisition • Secure Tomorrow')}
            </p>
          </div>
        </div>

        {/* Right toggles */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <LanguageSelector variant="compact" />

          {/* Sun / Moon Theme Toggle */}
          <div
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full cursor-pointer transition border shrink-0 ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/70 hover:border-slate-600'
                : 'bg-white border-slate-300 shadow-sm hover:border-slate-400'
            }`}
          >
            {isDark ? (
              <Sun size={13} className="text-amber-400 shrink-0" />
            ) : (
              <Moon size={13} className="text-indigo-600 shrink-0" />
            )}
            <span className={`text-xs font-semibold hidden sm:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isDark ? t('Light Mode') : t('Dark Mode')}
            </span>
            <div
              className={`w-6 sm:w-7 h-3.5 sm:h-4 rounded-full p-0.5 flex items-center transition-colors ${
                isDark ? 'bg-teal-500 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch z-10">

        {/* ── LEFT PANEL: Welcome Banner + 8 Role Cards ───────────────── */}
        <div className="order-1 flex-1 flex flex-col gap-2.5 sm:gap-3 min-w-0">

          {/* 1. Welcome Hero Banner with Adaptive Day/Night Visuals */}
          <div
            className={`login-hero-banner relative rounded-2xl overflow-hidden min-h-[120px] sm:h-40 border shadow-xl shrink-0 transition-all duration-300 ${
              isDark ? 'border-slate-700/50' : 'border-emerald-300/80 shadow-emerald-900/10'
            }`}
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #071426 0%, #0c2340 100%)'
                : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 45%, #f8fafc 100%)'
            }}
          >
            <img
              src={isDark ? '/hero_banner.jpg' : '/dashboard_banner.jpg'}
              alt="Rural Land Infrastructure"
              className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ${
                isDark ? 'opacity-45' : 'opacity-85'
              }`}
            />
            
            {/* Luminous/Dark gradient masks on left half so text is 100% crisp and readable */}
            <div
              className="hero-overlay-mask absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, rgba(6, 16, 30, 0.96) 0%, rgba(6, 16, 30, 0.88) 45%, rgba(6, 16, 30, 0.3) 75%, transparent 100%)'
                  : 'linear-gradient(to right, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.88) 45%, rgba(255, 255, 255, 0.35) 75%, rgba(255, 255, 255, 0.05) 100%)'
              }}
            ></div>
            <div
              className="hero-overlay-mask absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(to top, rgba(6, 16, 30, 0.75) 0%, transparent 60%)'
                  : 'linear-gradient(to top, rgba(255, 255, 255, 0.45) 0%, transparent 60%)'
              }}
            ></div>

            {/* Content overlay */}
            <div className="relative z-10 p-3 sm:p-5 h-full flex flex-col justify-between gap-2">
              
              {/* Title & Subtitle */}
              <div>
                <h2 className="text-base sm:text-2xl font-black tracking-wide leading-tight drop-shadow-sm">
                  <span className={isDark ? 'text-white' : 'text-slate-800'}>{t('Welcome to')}</span><br />
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{t('BHOOMI')}</span>{' '}
                  <span className={isDark ? 'text-emerald-400' : 'text-emerald-600 font-black'}>{t('SETU')}</span>
                </h2>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 drop-shadow-sm ${
                  isDark ? 'text-slate-200' : 'text-slate-600'
                }`}>
                  {t('A Unified Digital Platform for Land Acquisition & Management')}
                </p>
              </div>

              {/* 4 Feature Badges in a row */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors"
                  style={
                    isDark
                      ? { backgroundColor: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }
                      : { backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #a7f3d0', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                  }
                >
                  <Sprout size={11} className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} shrink-0`} />
                  <span className={isDark ? 'text-white' : 'text-slate-800 font-semibold'}>{t('Transparent Process')}</span>
                </span>
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors"
                  style={
                    isDark
                      ? { backgroundColor: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }
                      : { backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #a7f3d0', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                  }
                >
                  <ShieldCheck size={11} className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'} shrink-0`} />
                  <span className={isDark ? 'text-white' : 'text-slate-800 font-semibold'}>{t('Secure Data')}</span>
                </span>
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors"
                  style={
                    isDark
                      ? { backgroundColor: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }
                      : { backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #a7f3d0', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                  }
                >
                  <Clock size={11} className={`${isDark ? 'text-teal-400' : 'text-teal-700'} shrink-0`} />
                  <span className={isDark ? 'text-white' : 'text-slate-800 font-semibold'}>{t('Real-time Monitoring')}</span>
                </span>
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors"
                  style={
                    isDark
                      ? { backgroundColor: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }
                      : { backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #a7f3d0', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                  }
                >
                  <Users size={11} className={`${isDark ? 'text-purple-300' : 'text-purple-700'} shrink-0`} />
                  <span className={isDark ? 'text-white' : 'text-slate-800 font-semibold'}>{t('For a Better Tomorrow')}</span>
                </span>
              </div>
            </div>

            {/* Inspirational Quote (Top-Right) */}
            <div className="hidden sm:block absolute top-3.5 right-5 text-right max-w-[240px] pointer-events-none z-10">
              <p
                className="text-[11px] sm:text-xs italic font-serif leading-snug font-bold tracking-wide"
                style={{
                  color: isDark ? '#cbd5e1' : '#ffffff',
                  textShadow: isDark
                    ? '0 1px 3px rgba(0,0,0,0.8)'
                    : '0 1px 4px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.7)'
                }}
              >
                “ {t('Right Land, Right Process, Right Future')} ”
              </p>
            </div>
          </div>

          {/* 2. Stakeholder Role Selection Section */}
          <div
            className={`border rounded-2xl p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between shadow-xl transition-colors duration-300 ${
              isDark ? 'bg-[#0b1a30] border-slate-700/40' : 'bg-white border-slate-200/90'
            }`}
          >
            
            {/* Header with 43+ Active Users badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center ${
                    isDark
                      ? 'bg-teal-500/15 border border-teal-500/30 text-teal-400'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  }`}
                >
                  <Users size={12} />
                </div>
                <div>
                  <h3 className={`text-[11px] sm:text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('Select Stakeholder Role')}
                  </h3>
                  <p className={`text-[9px] sm:text-[10px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('Choose your role to continue')}
                  </p>
                </div>
              </div>

              <span
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border ${
                  isDark
                    ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                43+ {t('Active Users')}
              </span>
            </div>

            {/* 4x2 Grid of 8 Stakeholder Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 flex-1">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                const isSelected = selectedRoleKey === acc.key;

                return (
                  <button
                    key={acc.key}
                    type="button"
                    onClick={() => handleRoleSelect(acc)}
                    className={`login-role-card relative p-2 sm:p-3 rounded-xl text-left transition-all duration-200 flex flex-col justify-between overflow-hidden group border ${
                      isSelected
                        ? isDark
                          ? 'border-teal-400 ring-2 ring-teal-400/60 shadow-[0_0_15px_rgba(20,184,166,0.35)] scale-[1.01]'
                          : 'border-emerald-600 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-600/15 scale-[1.01]'
                        : `${acc.border} opacity-95 hover:opacity-100 hover:scale-[1.008]`
                    } bg-gradient-to-br ${acc.gradient}`}
                    style={{ minHeight: '80px' }}
                  >
                    {/* Watermark Illustration in the background */}
                    <div className="absolute right-0 bottom-0 pointer-events-none opacity-15 sm:opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-300">
                      {acc.watermark(acc.watermarkColor)}
                    </div>

                    {/* Top Row: Icon + {t('Most Used')} Badge */}
                    <div className="flex items-start justify-between relative z-10 w-full mb-1">
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center ${acc.iconColor} ${acc.iconBg} shadow-sm`}
                      >
                        <Icon size={13} className="sm:w-[15px] sm:h-[15px]" />
                      </div>

                      {acc.isMostUsed && (
                        <span
                          className={`px-1 py-0.5 rounded text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider shadow-sm ${
                            isDark
                              ? 'bg-teal-400 text-slate-950'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {t('Most Used')}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Title + Subtitle + Arrow Button */}
                    <div className="relative z-10 flex items-end justify-between w-full mt-auto">
                      <div className="pr-1.5 min-w-0">
                        <h4
                          className={`text-[11px] sm:text-xs font-bold truncate leading-snug ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {t(acc.title)}
                        </h4>
                        <p
                          className={`text-[9px] sm:text-[10px] truncate leading-tight mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-600 font-medium'
                          }`}
                        >
                          {t(acc.subtitle)}
                        </p>
                      </div>

                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm transition ${
                          isSelected
                            ? isDark
                              ? 'bg-teal-400 text-slate-950'
                              : 'bg-emerald-600 text-white shadow-sm'
                            : isDark
                            ? 'bg-white/10 text-white group-hover:bg-white/20'
                            : 'bg-white/80 text-slate-600 border border-slate-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-transparent transition-colors'
                        }`}
                      >
                        <ArrowRight size={9} className="sm:w-[10px] sm:h-[10px]" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

        </div>

        {/* ── RIGHT PANEL: Sign In Box with Fading Background Image ──── */}
        <div
          className={`order-2 login-signin-panel w-full lg:w-[380px] xl:w-[400px] shrink-0 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-colors duration-300 ${
            isDark
              ? 'bg-[#0b1a30] border-slate-700/40 text-slate-100'
              : 'bg-white border-slate-200/90 shadow-xl text-slate-800'
          }`}
        >

          {/* Fading satellite image directly as a background behind the sign in text */}
          <div className="absolute inset-x-0 top-0 h-56 pointer-events-none overflow-hidden z-0">
            <img
              src="/satellite_earth.jpg"
              alt="Earth Telemetry Backdrop"
              className={`w-full h-full object-cover object-center ${
                isDark ? 'opacity-35 mix-blend-screen' : 'opacity-25'
              }`}
              style={
                !isDark
                  ? {
                      filter: 'invert(1) hue-rotate(180deg)',
                      mixBlendMode: 'multiply'
                    }
                  : {}
              }
            />
            {/* Smooth gradient fade to transparent then to card background */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(to bottom, rgba(11, 26, 48, 0.2) 0%, rgba(11, 26, 48, 0.7) 60%, #0b1a30 100%)'
                  : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.5) 60%, #ffffff 100%)'
              }}
            ></div>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, rgba(11, 26, 48, 0.5) 0%, transparent 35%, transparent 65%, rgba(11, 26, 48, 0.5) 100%)'
                  : 'linear-gradient(to right, rgba(255, 255, 255, 0.35) 0%, transparent 35%, transparent 65%, rgba(255, 255, 255, 0.35) 100%)'
              }}
            ></div>
          </div>

          {/* Foreground content sitting on top of the fading image */}
          <div className="relative z-10">
            
            {/* Sign In Header sitting directly over the fading satellite background */}
            <div className="mb-4 pt-1">
              <h3
                className={`text-2xl font-black tracking-tight drop-shadow-sm ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {t('Sign In')}
              </h3>
              <p
                className={`text-xs mt-0.5 font-medium ${
                  isDark ? 'text-slate-300/80' : 'text-slate-500'
                }`}
              >
                {t('Access your account to continue')}
              </p>
            </div>

            {/* Error Alert if any */}
            {authError && (
              <div
                className={`mb-3 text-xs px-3 py-2 rounded-xl flex items-center gap-2 border ${
                  isDark
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{t(authError)}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Email */}
              <div>
                <label
                  className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Mail className={`w-3.5 h-3.5 ${isDark ? 'text-teal-400' : 'text-emerald-600'}`} />
                  <span>{t('Email Address')}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@gov.in"
                  className={`w-full text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 transition backdrop-blur-sm border ${
                    isDark
                      ? 'bg-[#071324]/90 border-slate-700 text-white placeholder-slate-600 focus:border-teal-500 focus:ring-teal-500/50'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/40'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Lock className={`w-3.5 h-3.5 ${isDark ? 'text-teal-400' : 'text-emerald-600'}`} />
                  <span>{t('Password')}</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`w-full text-xs rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:ring-1 transition backdrop-blur-sm border ${
                      isDark
                        ? 'bg-[#071324]/90 border-slate-700 text-white placeholder-slate-600 focus:border-teal-500 focus:ring-teal-500/50'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
                      isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* {t('Remember Me')} + Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-teal-600 rounded"
                  />
                  <span className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('Remember Me')}
                  </span>
                </label>

                <button
                  type="button"
                  className={`text-[11px] font-medium transition ${
                    isDark ? 'text-teal-400 hover:text-teal-300' : 'text-emerald-700 hover:text-emerald-800'
                  }`}
                >
                  {t('Forgot Password?')}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`force-text-white w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-1 active:scale-[0.99] ${
                  isDark
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 shadow-teal-900/40'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-700/25'
                }`}
                style={{ color: '#ffffff' }}
              >
                <span style={{ color: '#ffffff' }}>{submitting ? t('Authenticating...') : t('Sign In')}</span>
                {!submitting && <ArrowRight size={13} style={{ color: '#ffffff' }} />}
              </button>

              {/* OR Divider */}
              <div className="flex items-center gap-2.5 py-1">
                <div className={`flex-1 h-px ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('OR')}
                </span>
                <div className={`flex-1 h-px ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
              </div>

              {/* Government ID Login */}
              <button
                type="button"
                onClick={() => {
                  setShowGovIdModal(true);
                  setGovOtpSent(false);
                  setGovError('');
                }}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 border ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:text-white'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Building size={13} className={isDark ? 'text-teal-400' : 'text-emerald-600'} />
                <span>{t('Login with Government ID')}</span>
              </button>
            </form>
          </div>

          {/* Bottom Security Credentials & Ministry Tag */}
          <div
            className={`relative z-10 pt-3 mt-4 space-y-2 text-center border-t transition-colors ${
              isDark ? 'border-slate-800/60' : 'border-slate-200'
            }`}
          >
            <div
              className={`flex items-center justify-center gap-1.5 text-[10px] ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              <ShieldCheck size={12} className={isDark ? 'text-emerald-500/80' : 'text-emerald-600'} />
              <span>{t('Secured and Encrypted | NIC | Digital India')}</span>
            </div>

            <div
              className={`flex items-center justify-center gap-2 text-[9.5px] ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {t('Ministry of Rural Development')}
              </span>
              <span>&bull;</span>
              <span>{t('Govt. of India')}</span>
            </div>
          </div>

        </div>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer
        className={`py-2 text-center text-[10px] border-t transition-colors duration-300 ${
          isDark
            ? 'bg-[#071120] text-slate-500 border-slate-800/60'
            : 'bg-white text-slate-500 border-slate-200 shadow-sm'
        }`}
      >
        <span>{t('Smart Land Management • Sustainable Development • Digital India')}</span>
      </footer>

      {/* ── Government of India Identity Gateway Modal ─────────────────── */}
      {showGovIdModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl border rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-teal-950/40'
                : 'bg-white border-slate-200 text-slate-800 shadow-2xl'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-start justify-between border-b pb-3 mb-3 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 p-0.5 shadow-md shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Digital India • MeitY
                    </span>
                  </div>
                  <h3 className={`text-base sm:text-lg font-black font-heading mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('Government of India Digital Identity Gateway')}
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('National Single Sign-On (SSO) & Aadhaar / PAN / Parichay Authentication')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowGovIdModal(false); setGovOtpSent(false); setGovError(''); }}
                className={`p-2 rounded-xl transition ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {govSuccess ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('Identity Verified Successfully!')}</h4>
                <p className="text-xs text-emerald-500 font-medium">
                  {t('Authenticated via')} {selectedDoc.name} • {t('Entering Bhoomi Setu Workspace...')}
                </p>
                <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mt-2"></div>
              </div>
            ) : (
              <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {/* 1. Select Document Option (6 Indian Government Options) */}
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('Select Official Identity Document:')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GOV_DOC_TYPES.map((doc) => {
                      const DocIcon = doc.icon;
                      const isSelected = doc.id === selectedGovDocId;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectGovDoc(doc)}
                          className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 relative ${
                            isSelected
                              ? (isDark 
                                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                                : 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500')
                              : (isDark
                                ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300')
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                              <DocIcon size={15} />
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </div>
                          <div>
                            <div className={`text-xs font-bold leading-tight ${isSelected ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                              {doc.name}
                            </div>
                            <div className="text-[9.5px] text-slate-400 mt-0.5 truncate">
                              {doc.authority.split('•')[0]}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Authority Badge */}
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                  isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-medium">
                    {t('Official Gateway:')} <strong>{selectedDoc.authority}</strong>
                  </span>
                </div>

                {/* 2. Document Identifier Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {selectedDoc.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => setGovDocNumber(selectedDoc.demoId)}
                      className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 underline"
                    >
                      {t('Fill Demo ID')}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={govDocNumber}
                    onChange={(e) => setGovDocNumber(e.target.value)}
                    placeholder={selectedDoc.placeholder}
                    className={`w-full text-xs font-mono rounded-xl px-3 py-2 border focus:outline-none transition ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                </div>

                {/* 3. Role Assignment */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {t('Authenticate Access For Stakeholder Role:')}
                  </label>
                  <select
                    value={govRoleKey}
                    onChange={(e) => setGovRoleKey(e.target.value)}
                    className={`w-full text-xs rounded-xl px-3 py-2 border focus:outline-none transition ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-emerald-300 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  >
                    {demoAccounts.map(acc => (
                      <option key={acc.key} value={acc.key}>
                        {acc.title} ({acc.subtitle})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. OTP / Verification Step */}
                {!govOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendGovOtp}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2 mt-2"
                  >
                    <KeyRound size={15} />
                    <span>{t('Generate & Send OTP via Gateway')}</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        {t('OTP Sent to Registered Mobile')} (+91 ******4500)
                      </span>
                      <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                        Demo OTP: 582914
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={govOtpCode}
                        onChange={(e) => setGovOtpCode(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className={`w-full text-center tracking-widest font-mono text-base font-bold rounded-xl py-2 border focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setGovOtpCode('582914')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 shrink-0"
                      >
                        {t('Auto-Fill')}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={govVerifying}
                      onClick={handleVerifyGovId}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2"
                    >
                      {govVerifying ? (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      <span>{govVerifying ? t('Verifying Credentials...') : t('Verify & Enter Bhoomi Setu')}</span>
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {govError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{govError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className={`border-t pt-3 mt-3 flex items-center justify-between text-xs shrink-0 ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
              <span className="text-[10px]">NIC • MeitY • Government of India</span>
              <button
                type="button"
                onClick={() => { setShowGovIdModal(false); setGovOtpSent(false); setGovError(''); }}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
