'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={40} />
      </div>
      <h1 className="mb-3 text-3xl font-black text-gray-900">出错了</h1>
      <p className="mb-8 max-w-md font-medium text-gray-500">
        抱歉，应用程序遇到了一些问题。请尝试刷新页面或返回首页。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 font-bold text-white transition hover:bg-indigo-700 active:scale-95"
        >
          <RefreshCcw size={18} />
          重试一下
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-3 font-bold text-gray-600 transition hover:bg-gray-50 active:scale-95"
        >
          <Home size={18} />
          返回首页
        </Link>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 max-w-2xl overflow-auto rounded-xl bg-gray-100 p-4 text-left text-xs font-mono text-gray-600">
          {error.message}
          {error.stack && <pre className="mt-2 opacity-50">{error.stack}</pre>}
        </div>
      )}
    </div>
  );
}
