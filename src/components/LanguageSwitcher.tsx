'use client';

import { useState, useEffect } from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/TranslationContext';

const languages = [
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'jp', name: '日本語', flag: '🇯🇵' },
  { code: 'kr', name: '한국어', flag: '🇰🇷' },
] as const;

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useTranslation();

  const currentLang = languages.find(l => l.code === language) || languages[0];

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as HTMLElement).closest('.lang-switcher')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectLanguage = (langCode: typeof languages[number]['code']) => {
    setLanguage(langCode);
    setIsOpen(false);
    console.log(`Language changed to: ${langCode}`);
  };

  return (
    <div className="relative lang-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/30 active:scale-95"
      >
        <Languages size={16} className="text-indigo-500" />
        <span>{currentLang.name}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1 shadow-xl ring-1 ring-black/5 z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors rounded-xl ${
                  currentLang.code === lang.code
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
