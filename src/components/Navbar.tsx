'use client';

import { Zap } from "lucide-react";
import SearchInput from "./SearchInput";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "@/context/TranslationContext";

export default function Navbar({ pluginCount }: { pluginCount: number }) {
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
            <Zap size={22} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none text-gray-900">{t('nav.title')}</span>
            <span className="text-[10px] font-medium text-gray-400 tracking-wider uppercase">{t('nav.subtitle')}</span>
          </div>
        </div>
        
        <div className="flex flex-1 justify-center px-4 md:px-8">
          <div className="w-full max-w-[500px]">
            <SearchInput />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <LanguageSwitcher />
          <div className="hidden text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full lg:block">
            {pluginCount > 0 ? `${t('count.label')} ${pluginCount} ${t('count.unit')}` : t('chat.thinking')}
          </div>
        </div>
      </div>
    </nav>
  );
}
