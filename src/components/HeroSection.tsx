'use client';

import { useTranslation } from "@/context/TranslationContext";

export default function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden pt-16 pb-12 text-center">
      <div className="absolute top-0 left-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 bg-indigo-50/50 blur-[120px] rounded-full" />
      <div className="container mx-auto px-4">
        <h1 className="mb-6 text-4xl font-black tracking-tight text-gray-900 sm:text-6xl">
          {t('hero.title')} <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('hero.title_highlight')}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg font-medium text-gray-500 leading-relaxed">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>
  );
}
