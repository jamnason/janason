'use client';

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { useTranslation } from "@/context/TranslationContext";

export default function SearchInput() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isPending, startTransition] = useTransition();

  // 当 URL 中的查询参数改变时，同步输入框内容
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
      params.set('category', 'search');
    } else {
      params.delete('q');
      params.delete('category');
    }
    
    startTransition(() => {
      router.push(`/?${params.toString()}#category-nav`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isPending ? 'text-indigo-500' : 'text-gray-400'}`} size={18} />
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('nav.search')}
        className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 py-2.5 pl-12 pr-4 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
      />
      {isPending && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}
    </form>
  );
}
