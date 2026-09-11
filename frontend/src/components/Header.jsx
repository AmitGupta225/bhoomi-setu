import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import { 
  Bell, 
  User, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

export const Header = () => {
  const { 
    user, 
    activeRole, 
    logout, 
    notifications, 
    markNotificationsRead, 
    theme, 
    toggleTheme, 
    isMobileMenuOpen, 
    setIsMobileMenuOpen,
    t 
  } = useAuth();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const isDark = theme === 'dark';
  const unreadCount = notifications.filter(n => n.unread).length;

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className={`sticky top-0 z-[99999] backdrop-blur-md border-b px-2 sm:px-5 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between shadow-md transition-colors duration-200 max-w-full ${
      isDark 
        ? 'bg-slate-900/95 border-slate-800/90 text-slate-100 shadow-black/30' 
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50'
    }`}>
      {/* ── Left Side: Mobile Hamburger & Brand ────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-1.5 md:hidden rounded-lg sm:rounded-xl border transition flex items-center justify-center shrink-0 ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/80 border-slate-700/70'
              : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
          }`}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X size={17} className="text-emerald-500" /> : <Menu size={17} />}
        </button>

        {/* Brand Logo & Portal Name */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-sm shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[5px] sm:rounded-[7px] flex items-center justify-center">
              <span className="font-black text-emerald-400 text-[9px] sm:text-xs">BS</span>
            </div>
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-0.5">
              <h1 className={`text-[12px] sm:text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('BHOOMI')} <span className="text-emerald-500">{t('SETU')}</span>
              </h1>
              <span className="text-[10px] hidden xs:inline">🌿</span>
            </div>
            <p className={`text-[9px] sm:text-[11px] hidden sm:block font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('National Land Acquisition Portal')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Side: Controls, User & Sign Out ─────────────────── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Compact 11-Language Dropdown Selector */}
        <LanguageSelector variant="compact" />

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg sm:rounded-xl border transition flex items-center justify-center shrink-0 ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/70'
              : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          ) : (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
          )}
          <span className="hidden xl:inline text-[11px] font-bold">
            {isDark ? t('Light Mode') : t('Dark Mode')}
          </span>
        </button>
        
        {/* Notifications Bell */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              if (!showNotifDropdown) markNotificationsRead();
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition relative flex items-center justify-center shrink-0 ${
              isDark
                ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/70'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className={`absolute right-0 mt-2 w-72 sm:w-80 border rounded-2xl shadow-2xl p-3 sm:p-4 z-[10000] animate-in fade-in slide-in-from-top-2 ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/40">
                <span className="text-xs font-bold">{t('Notifications')}</span>
                <span className="text-[10px] text-emerald-500 font-semibold">{unreadCount} {t('New')}</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">{t('No new notifications')}</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <p className="font-medium leading-snug">{n.text}</p>
                      <span className="text-[9.5px] text-slate-400 mt-1 block font-mono">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Info Pill (Tablet & Desktop) */}
        {user && (
          <div
            className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs shrink-0 ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/70 text-slate-200'
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
            title={`${user.name} (${t(activeRole.badge)})`}
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="flex flex-col text-left max-w-[110px] lg:max-w-[150px] truncate">
              <span className="font-bold text-[11px] leading-tight truncate">
                {user.name}
              </span>
              <span className="text-[9px] text-emerald-500 font-medium leading-tight truncate">
                {t(activeRole.badge)}
              </span>
            </div>
          </div>
        )}

        {/* ── CORNER SIGN OUT BUTTON (DESKTOP / WINDOWS ONLY) ── */}
        {user && (
          <button
            type="button"
            onClick={logout}
            className="hidden md:flex px-2 sm:px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-400 hover:text-rose-300 border border-rose-500/35 hover:border-rose-500/60 rounded-xl transition-all items-center gap-1 sm:gap-1.5 text-xs font-extrabold shadow-sm shadow-rose-950/20 active:scale-95 shrink-0"
            title={t('Sign Out')}
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-rose-400" />
            <span className="text-[11px] font-bold">{t('Sign Out')}</span>
          </button>
        )}
      </div>
    </header>
  );
};
