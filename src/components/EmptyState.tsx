'use client';

import { Zap } from "lucide-react";
import { useTranslation } from "@/context/TranslationContext";

export default function EmptyState({ hasError }: { hasError: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 text-gray-300 shadow-inner ${hasError ? 'bg-red-50 text-red-300' : ''}`}>
        <Zap size={48} className={hasError ? "animate-pulse" : ""} />
      </div>
      <h3 className="text-2xl font-black text-gray-900">
        {hasError ? t('error.search') : t('error.empty')}
      </h3>
      <p className="mt-3 max-w-xs text-base font-medium text-gray-400">
        {hasError ? t('error.retry') : t('error.empty_hint')}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-8 rounded-2xl bg-gray-900 px-8 py-3 text-sm font-bold text-white transition hover:bg-indigo-600 active:scale-95"
      >
        {t('search.clear')}
      </button>
    </div>
  );
}
