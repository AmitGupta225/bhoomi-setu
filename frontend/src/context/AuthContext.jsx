import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchNotifications, createNotification, markAllNotificationsRead, translateDynamicText } from '../services/api';
import enTranslations from '../locales/en.json';

const LOCALE_LOADERS = {
  hi: () => import('../locales/hi.json'),
  mr: () => import('../locales/mr.json'),
  bn: () => import('../locales/bn.json'),
  gu: () => import('../locales/gu.json'),
  ta: () => import('../locales/ta.json'),
  te: () => import('../locales/te.json'),
  kn: () => import('../locales/kn.json'),
  ml: () => import('../locales/ml.json'),
  pa: () => import('../locales/pa.json'),
  or: () => import('../locales/or.json'),
};

const loadedLocales = {
  en: enTranslations
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

export const ROLES = {
  REQUIRING_BODY: {
    id: 'requiring_body',
    label: 'Land Requiring Body (NHAI / Railways / Ministry)',
    badge: 'Project Proposer',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Submit land acquisition proposals, rectify proposals & track project progress',
    allowedTabs: ['dashboard', 'proposal', 'workflow', 'gis', 'documents'],
    defaultTab: 'proposal',
    authorizedSteps: []
  },
  COLLECTOR: {
    id: 'collector',
    label: 'District Collectorate / District Administration',
    badge: 'District Collector',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Scrutinize Step 1 proposals & conduct Step 3 Public Hearing evaluations',
    allowedTabs: ['dashboard', 'workflow', 'scrutiny', 'grievances', 'gis', 'documents'],
    defaultTab: 'scrutiny',
    authorizedSteps: [2, 6, 10]
  },
  STATE_GOV: {
    id: 'state_gov',
    label: 'State Government / Revenue Department',
    badge: 'State Revenue Dept',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Authorize Step 2 Social Impact Notifications & Step 4 Gazette Declarations',
    allowedTabs: ['dashboard', 'workflow', 'scrutiny', 'gis', 'documents'],
    defaultTab: 'scrutiny',
    authorizedSteps: [4, 7]
  },
  SLAO: {
    id: 'slao',
    label: 'Land Acquiring Authority (Special Land Acquisition Officer)',
    badge: 'SLAO Officer',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    description: 'Determine & approve Step 5 Land Valuation Awards',
    allowedTabs: ['dashboard', 'workflow', 'scrutiny', 'gis', 'documents'],
    defaultTab: 'scrutiny',
    authorizedSteps: [8]
  },
  PFMS_OFFICER: {
    id: 'pfms_officer',
    label: 'Public Financial Management System Officer (Finance)',
    badge: 'Finance Officer',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'Authorize & disburse Step 6 Direct Benefit Transfer compensation payments',
    allowedTabs: ['dashboard', 'compensation', 'workflow', 'gis'],
    defaultTab: 'compensation',
    authorizedSteps: []
  },
  RR_OFFICER: {
    id: 'rr_officer',
    label: 'Rehabilitation & Resettlement Commissioner',
    badge: 'R&R Commissioner',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'Manage & authorize Step 7 R&R family welfare housing packages',
    allowedTabs: ['dashboard', 'rr', 'workflow', 'gis'],
    defaultTab: 'rr',
    authorizedSteps: [3]
  },
  SURVEYOR: {
    id: 'surveyor',
    label: 'Cadastral Field Surveyor / Land Inspector',
    badge: 'Field Inspector',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Conduct ground inspections, capture GPS coordinates & boundary tags',
    allowedTabs: ['dashboard', 'field', 'workflow'],
    defaultTab: 'field',
    authorizedSteps: [5]
  },
  CITIZEN: {
    id: 'citizen',
    label: 'Affected Landowner / Citizen',
    badge: 'Public Landowner',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Public land parcel lookup, award statement lookup & grievance redressal',
    allowedTabs: ['dashboard', 'citizen', 'gis'],
    defaultTab: 'citizen',
    authorizedSteps: []
  }
};

const defaultAuthContext = {
  user: null,
  activeRole: ROLES.CITIZEN,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  selectedProjectId: 'PROJ-KBIL-003',
  setSelectedProjectId: () => {},
  activeTab: 'dashboard',
  setActiveTab: () => {},
  notifications: [],
  addNotification: () => {},
  markNotificationsRead: () => {},
  isTabAllowed: () => false,
  isStepAuthorized: () => false,
  projectRefreshCount: 0,
  notifyProjectUpdated: () => {},
  theme: 'dark',
  toggleTheme: () => {},
  language: 'en',
  setAppLanguage: () => {},
  toggleLanguage: () => {},
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  translateDynamic: (t) => t,
  t: (k) => k
};

const AuthContext = createContext(defaultAuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bhoomi_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedProjectId, setSelectedProjectId] = useState('PROJ-KBIL-003');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectRefreshCount, setProjectRefreshCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('bhoomi_theme') || 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('bhoomi_lang') || 'en');
  const [localeVersion, setLocaleVersion] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dynamic Locale Loader: fetches language JSON chunk on demand and caches in memory
  const ensureLocaleLoaded = useCallback(async (langCode) => {
    if (langCode === 'en' || loadedLocales[langCode]) {
      return loadedLocales[langCode];
    }
    if (LOCALE_LOADERS[langCode]) {
      try {
        const mod = await LOCALE_LOADERS[langCode]();
        loadedLocales[langCode] = mod.default || mod;
        setLocaleVersion(v => v + 1);
        return loadedLocales[langCode];
      } catch (err) {
        console.error('Failed to load locale:', langCode, err);
      }
    }
    return null;
  }, []);

  // Ensure active language dictionary is loaded
  useEffect(() => {
    if (language !== 'en') {
      ensureLocaleLoaded(language);
    }
  }, [language, ensureLocaleLoaded]);

  // Theme synchronization
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
    localStorage.setItem('bhoomi_theme', theme);
  }, [theme]);

  // Language typography synchronization: enlarges font size for Indian scripts
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    if (language !== 'en') {
      root.classList.add('lang-indic');
    } else {
      root.classList.remove('lang-indic');
    }
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Instant Native Translation Engine: Instant 0ms switch if cached, async fetch if first time
  const setAppLanguage = useCallback((langCode) => {
    setLanguage(langCode);
    localStorage.setItem('bhoomi_lang', langCode);
    ensureLocaleLoaded(langCode);
  }, [ensureLocaleLoaded]);

  useEffect(() => {
    window.__setBhoomiLanguage = setAppLanguage;
  }, [setAppLanguage]);

  const toggleLanguage = () => {
    setAppLanguage(language === 'en' ? 'hi' : 'en');
  };

  // Synchronous, high-speed translation resolver
  const t = useCallback((key) => {
    if (!key || typeof key !== 'string') return key;
    if (language === 'en') return key;

    const langDict = loadedLocales[language];
    if (langDict) {
      if (langDict[key]) return langDict[key];
      const trimmed = key.trim();
      if (langDict[trimmed]) return langDict[trimmed];

      // Suffix checks (e.g. "Active Project:")
      if (trimmed.endsWith(':')) {
        const base = trimmed.slice(0, -1).trim();
        if (langDict[base]) return langDict[base] + ':';
      }
      if (/^Step\s+(\d+)$/i.test(trimmed)) {
        const num = trimmed.match(/^Step\s+(\d+)$/i)[1];
        return (langDict['Stage'] || 'चरण') + ' ' + num;
      }
      if (/^Stage\s+(\d+)$/i.test(trimmed)) {
        const num = trimmed.match(/^Stage\s+(\d+)$/i)[1];
        return (langDict['Stage'] || 'चरण') + ' ' + num;
      }
    }

    // Check dynamic local storage cache for user-created dynamic content
    try {
      const dynCache = JSON.parse(localStorage.getItem(`bhoomi_dyn_${language}`) || '{}');
      if (dynCache[key]) return dynCache[key];
      if (dynCache[key.trim()]) return dynCache[key.trim()];
    } catch {}

    return key;
  }, [language, localeVersion]);

  // Translate dynamic user data asynchronously with client-side cache & background sync
  const translateDynamic = useCallback(async (text, targetLang = language) => {
    if (!text || typeof text !== 'string' || !text.trim()) return text;
    if (targetLang === 'en') return text;

    const cacheKey = `bhoomi_dyn_${targetLang}`;
    let dynCache = {};
    try {
      dynCache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      if (dynCache[text]) return dynCache[text];
    } catch {}

    try {
      const res = await translateDynamicText(text, targetLang);
      if (res && res.success && res.translated) {
        dynCache[text] = res.translated;
        localStorage.setItem(cacheKey, JSON.stringify(dynCache));
        setLocaleVersion(v => v + 1);
        return res.translated;
      }
    } catch (err) {
      console.warn('Dynamic translate error:', err);
    }
    return text;
  }, [language]);


  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadNotifs = async () => {
      const roleKey = user ? user.role.id : 'ALL';
      const fetched = await fetchNotifications(roleKey);
      
      const mapped = (fetched || []).map(n => {
        const d = n.created_at ? new Date(n.created_at) : new Date();
        let timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          id: n.id || Math.random(),
          text: n.text || '',
          time: timeStr,
          unread: n.unread === 1 || n.unread === true
        };
      });
      setNotifications(mapped);
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('bhoomi_auth_user', JSON.stringify(userData));
    setActiveTab(userData.role.defaultTab);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bhoomi_auth_user');
  };

  useEffect(() => {
    window.__loginRole = (roleKey) => {
      const demoNames = {
        REQUIRING_BODY: { name: 'Shri Sanjay Deshmukh', email: 'nhai.proposer@nhai.gov.in' },
        COLLECTOR: { name: 'Dr. Rajesh Verma, IAS (District Collector)', email: 'collector.palghar@gov.in' },
        STATE_GOV: { name: 'Smt. Vatsala Nair, IAS', email: 'secy.revenue@maharashtra.gov.in' },
        SLAO: { name: 'Shri Ramesh Kulkarni', email: 'slao.palghar@gov.in' },
        PFMS_OFFICER: { name: 'PFMS Treasury Desk', email: 'finance.pfms@gov.in' },
        RR_OFFICER: { name: 'R&R Commissioner Office', email: 'rr.commissioner@gov.in' },
        SURVEYOR: { name: 'Vikas Patil', email: 'surveyor.field@gov.in' },
        CITIZEN: { name: 'Priya Sharma (Affected Landowner)', email: 'landowner.public@gmail.com' }
      };
      const info = demoNames[roleKey] || { name: 'Officer', email: 'officer@gov.in' };
      const roleObj = ROLES[roleKey] || ROLES.COLLECTOR;
      login({
        name: info.name,
        email: info.email,
        roleKey: roleKey,
        role: roleObj
      });
    };
    window.__logout = logout;
    window.__setLang = (l) => setAppLanguage(l);
    window.__setTheme = (th) => setTheme(th);
  }, [setAppLanguage]);

  const notifyProjectUpdated = () => {
    setProjectRefreshCount(prev => prev + 1);
  };

  const addNotification = async (text, targetRole = 'ALL') => {
    try {
      await createNotification(text, targetRole);
      const newNotif = {
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err) {
      console.error('Failed to create notification', err);
    }
  };

  const markNotificationsRead = async () => {
    try {
      const roleKey = user ? user.role.id : 'ALL';
      await markAllNotificationsRead(roleKey);
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const activeRole = user && user.role && typeof user.role === 'object' && user.role.allowedTabs 
    ? user.role 
    : (ROLES[user?.roleKey] || ROLES[user?.role?.toUpperCase?.()] || ROLES.CITIZEN);

  const isTabAllowed = (tabId) => {
    if (!user) return false;
    const roleObj = user.role && typeof user.role === 'object' && user.role.allowedTabs 
      ? user.role 
      : (ROLES[user.roleKey] || ROLES[user.role?.toUpperCase?.()] || ROLES.CITIZEN);
    return Boolean(roleObj?.allowedTabs?.includes(tabId));
  };

  const isStepAuthorized = (stepNum) => {
    if (!user) return false;
    const roleObj = user.role && typeof user.role === 'object' && user.role.authorizedSteps 
      ? user.role 
      : (ROLES[user.roleKey] || ROLES[user.role?.toUpperCase?.()] || ROLES.CITIZEN);
    return Boolean(roleObj?.authorizedSteps?.includes(stepNum));
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeRole,
      isAuthenticated: !!user,
      login,
      logout,
      selectedProjectId,
      setSelectedProjectId,
      activeTab,
      setActiveTab,
      notifications,
      addNotification,
      markNotificationsRead,
      isTabAllowed,
      isStepAuthorized,
      projectRefreshCount,
      notifyProjectUpdated,
      theme,
      toggleTheme,
      language,
      setAppLanguage,
      toggleLanguage,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      translateDynamic,
      t
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || defaultAuthContext;
