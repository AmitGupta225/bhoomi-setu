import React, { useState, useRef, useEffect } from 'react';
import { useAuth, SUPPORTED_LANGUAGES } from '../context/AuthContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export const LanguageSelector = ({ variant = 'default' }) => {
  const { language, setAppLanguage, theme, t } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isDark = theme === 'dark';

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    if (document.body) {
      document.body.style.transition = 'opacity 0.08s ease';
      document.body.style.opacity = '0.92';
      setTimeout(() => {
        if (document.body) document.body.style.opacity = '1';
      }, 90);
    }
    setAppLanguage(code);
    setIsOpen(false);
  };

  const isCompact = variant === 'compact';

  return (
    <div className="relative notranslate" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-200 hover:text-white shadow-sm'
            : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm'
        }`}
        title="Select Language / भाषा चुनें"
      >
        <Globe size={14} className={isDark ? 'text-teal-400 shrink-0' : 'text-emerald-600 shrink-0'} />
        <span className="font-bold">{currentLang.native}</span>
        {!isCompact && (
          <span className={`text-[10px] hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ({currentLang.name})
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl shadow-2xl border p-2 z-[999999] custom-scrollbar animate-in fade-in slide-in-from-top-2 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-700/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{t('Select Language')}</span>
            <span className="text-[9px] font-normal text-emerald-400">11 {t('Languages')}</span>
          </div>

          <div className="space-y-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs transition flex items-center justify-between ${
                    isSelected
                      ? isDark
                        ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                        : 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                      : isDark
                      ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold leading-tight">{lang.native}</span>
                    <span className={`text-[10px] ${isSelected ? (isDark ? 'text-teal-400/80' : 'text-emerald-600') : 'text-slate-400'}`}>
                      {lang.name}
                    </span>
                  </div>
                  {isSelected && (
                    <Check size={14} className={isDark ? 'text-teal-400' : 'text-emerald-600'} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
