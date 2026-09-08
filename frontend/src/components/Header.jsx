import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Bell, 
  User, 
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

export const Header = () => {
  const { user, activeRole, logout, notifications, markNotificationsRead, theme, toggleTheme, language, toggleLanguage, t } = useAuth();
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
    <header className="sticky top-0 z-[9999] bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xl">
      {/* Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-black text-emerald-400 text-sm">BS</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold font-heading text-white tracking-wide">
                {t('BHOOMI SETU')}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">National Land Acquisition Portal</p>
          </div>
        </div>
      </div>

      {/* Right User & Tools Section */}
      <div className="flex items-center gap-3">
        {/* Language Toggle Button */}
        <button
          onClick={toggleLanguage}
          className="px-3 py-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
          title="Toggle Language (English / Hindi)"
        >
          <span className="font-bold">
            {language === 'en' ? 'A / अ' : 'अ / A'}
          </span>
          <span className="hidden md:inline text-[11px] font-bold ml-1">
            {language === 'en' ? 'Hindi' : 'English'}
          </span>
        </button>

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
          <span className="hidden md:inline text-[11px] font-bold">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
        
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              if (!showNotifDropdown) markNotificationsRead();
            }}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-[10000] animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white">Notifications</span>
              </div>
              <div className="space-y-2.5">
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-[11px] leading-tight">{user.name}</span>
                <span className="text-[9px] text-emerald-400 font-medium leading-tight">{activeRole.badge}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
