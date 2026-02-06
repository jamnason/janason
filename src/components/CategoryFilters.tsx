'use client';

import { Box, Star, Clock, Zap, Laugh, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "@/context/TranslationContext";

const CATEGORIES = [
  { id: 'all', key: 'filter.all', icon: <Box size={18} />, query: 'topic:ai-plugin OR topic:llm-plugin OR "ai assistant"' },
  { id: 'stars', key: 'filter.stars', icon: <Star size={18} />, query: 'topic:ai-plugin sort:stars' },
  { id: 'latest', key: 'filter.latest', icon: <Clock size={18} />, query: 'topic:ai-plugin sort:updated' },
  { id: 'functional', key: 'filter.functional', icon: <Zap size={18} />, query: 'topic:ai-plugin topic:tool OR topic:utility' },
  { id: 'entertainment', key: 'filter.entertainment', icon: <Laugh size={18} />, query: 'topic:ai-plugin topic:game OR topic:fun' },
  { id: 'search', key: 'filter.search', icon: <Search size={18} />, query: '' },
];

export default function CategoryFilters() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentCategory = searchParams.get('category') || 'all';

  const handleCategoryClick = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('category', id);
    
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="flex w-full items-center justify-start gap-3 overflow-x-auto pb-4 no-scrollbar sm:justify-center md:pb-0">
      {CATEGORIES.map((cat) => (
        <button 
          key={cat.id}
          onClick={() => handleCategoryClick(cat.id)}
          disabled={isPending}
          className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-200 ${
            currentCategory === cat.id 
              ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 border-2 border-indigo-500' 
              : 'bg-white text-gray-500 hover:text-gray-900 border-2 border-transparent hover:border-gray-100'
          } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <span className={currentCategory === cat.id ? 'text-indigo-500' : 'text-gray-400'}>{cat.icon}</span>
          {t(cat.key)}
        </button>
      ))}
    </div>
  );
}
