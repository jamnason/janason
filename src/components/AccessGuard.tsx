'use client';

import { useState, useEffect } from 'react';
import { Lock, Loader2, AlertCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = localStorage.getItem('site_authorized');
    if (auth === 'true') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthorized(true);
        localStorage.setItem('site_authorized', 'true');
      } else {
        setError('密码错误，请重试');
      }
    } catch (err) {
      setError('系统错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized === null) return null;

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md px-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-200">
            <Zap size={40} fill="currentColor" />
          </div>
          
          <h1 className="mb-2 text-2xl font-black text-gray-900">私密访问保护</h1>
          <p className="mb-8 text-sm font-medium text-gray-500">
            这是一个个人项目。请输入访问密码以继续。
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入访问密码"
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-4 pl-12 pr-4 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-black text-white transition-all hover:bg-indigo-600 disabled:opacity-50 active:scale-95 shadow-xl shadow-gray-200 hover:shadow-indigo-100"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                '验证并进入'
              )}
            </button>
          </form>

          <p className="mt-12 text-[10px] font-bold uppercase tracking-widest text-gray-300">
            GitHub AI Plugin Hub &copy; 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
