'use client';

import Link from 'next/link';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Search size={48} />
        </div>
      </div>
      <h1 className="mb-3 text-4xl font-black text-gray-900">404</h1>
      <h2 className="mb-4 text-xl font-bold text-gray-700">找不到页面</h2>
      <p className="mb-8 max-w-md font-medium text-gray-500">
        您访问的页面不存在或已被移除。您可以尝试搜索您感兴趣的内容。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 font-bold text-white transition hover:bg-indigo-700 active:scale-95"
        >
          <Home size={18} />
          回到首页
        </Link>
        <button
          onClick={handleBack}
          className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-3 font-bold text-gray-600 transition hover:bg-gray-50 active:scale-95"
        >
          <ArrowLeft size={18} />
          返回上一页
        </button>
      </div>
    </div>
  );
}
