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

  const unreadCount = notifications.filter(n => n.unread).length;

  // Click outside listener to automatically close notifications dropdown
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
    <header className="sticky top-0 z-[99999] bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between shadow-xl max-w-full">
      {/* Left: Mobile Hamburger & Brand */}
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 md:hidden text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition flex items-center justify-center shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X size={17} className="text-emerald-400" /> : <Menu size={17} />}
        </button>

        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[7px] sm:rounded-[10px] flex items-center justify-center">
              <span className="font-black text-emerald-400 text-[10px] sm:text-sm">BS</span>
            </div>
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <h1 className="text-xs sm:text-lg font-extrabold font-heading text-white tracking-wide">
                {t('BHOOMI')} <span className="text-emerald-400">{t('SETU')}</span>
              </h1>
              <span className="text-[10px] sm:text-xs">🌿</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
              {t('National Land Acquisition Portal')}
            </p>
          </div>
        </div>
      </div>

      {/* Right User & Tools Section */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* 11-Language Dropdown Selector */}
        <LanguageSelector variant="compact" />

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center gap-1 text-xs font-semibold shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
          )}
          <span className="hidden lg:inline text-[11px] font-bold">
            {theme === 'dark' ? t('Light Mode') : t('Dark Mode')}
          </span>
        </button>
        
        {/* Notifications Bell */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              if (!showNotifDropdown) markNotificationsRead();
            }}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition relative flex items-center justify-center"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-slate-950 text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-[10000] animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white">{t('Notifications')}</span>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                {notifications.map(n => (
                  <div key={n.id} className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
                    <p className="text-slate-200 font-medium">{n.text}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Info & Logout Button */}
        {user && (
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div 
              className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs"
              title={`${user.name} (${t(activeRole.badge)})`}
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col max-w-[90px] sm:max-w-[140px] truncate">
                <span className="font-extrabold text-white text-[10px] sm:text-[11px] leading-tight truncate">
                  {user.name}
                </span>
                <span className="text-[8.5px] sm:text-[9px] text-emerald-400 font-medium leading-tight truncate">
                  {t(activeRole.badge)}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 sm:p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">{t('Sign Out')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
