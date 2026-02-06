'use client';

import { useEffect, useState, useRef } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import EmptyState from "./EmptyState";
import { Github, Star, ExternalLink, Loader2, Search, Zap } from "lucide-react";
import { GithubRepo } from "@/lib/github";
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/TranslationContext';
import { useMonitor } from '@/context/MonitorContext';

interface PluginGridProps {
  initialPlugins: GithubRepo[];
  query: string;
  sort: string;
  title?: string;
  hideSearchHeader?: boolean;
}

const PluginSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-2 shadow-sm animate-pulse">
    <div className="mb-4 flex items-start justify-between">
      <div className="h-12 w-12 rounded-xl bg-gray-100" />
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-5 w-12 rounded-full bg-gray-100" />
        <div className="h-4 w-10 rounded-full bg-gray-50" />
      </div>
    </div>
    <div className="mb-2">
      <div className="h-5 w-3/4 rounded-md bg-gray-100" />
      <div className="mt-2 h-3 w-1/4 rounded-md bg-gray-50" />
    </div>
    <div className="mb-5 h-[3.75rem] w-full rounded-md bg-gray-50" />
    <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4">
      <div className="h-4 w-16 rounded-full bg-gray-50" />
      <div className="h-9 w-24 rounded-xl bg-gray-100" />
    </div>
  </div>
);

export default function PluginGrid({ initialPlugins, query, sort, title, hideSearchHeader }: PluginGridProps) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { addLog, updateQueueStatus } = useMonitor();
  const [plugins, setPlugins] = useState<GithubRepo[]>(initialPlugins);
  const pluginsRef = useRef<GithubRepo[]>(initialPlugins);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  // 当搜索条件或初始插件改变时重置状态
  useEffect(() => {
    setPlugins(initialPlugins);
    pluginsRef.current = initialPlugins;
    setPage(1);
    setHasMore(true);
    
    // 切换模块时清空翻译状态
    translationQueue.current = [];
    setTranslatingIds(new Set());
    if (activeAbortController.current) {
      activeAbortController.current.abort();
      activeAbortController.current = null;
    }
    // 注意：不要在这里直接设置 isProcessingQueue.current = false
    // 而是通过 abort 让正在进行的 processQueue 退出
    
    addLog({
      type: 'system',
      module: 'grid',
      message: `重置插件列表: ${initialPlugins.length} 个项目`
    });
  }, [initialPlugins, query, sort]);

  // 始终保持 Ref 同步最新的 plugins
  useEffect(() => {
    pluginsRef.current = plugins;
  }, [plugins]);
  
  // 翻译缓存：{ [repoId_lang]: translatedText }
  const [translatedCache, setTranslatedCache] = useState<Record<string, string>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // 初始化时从 LocalStorage 加载缓存，避免水合错误
  useEffect(() => {
    const saved = localStorage.getItem('translation_cache');
    if (saved) {
      try {
        setTranslatedCache(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse translation cache');
      }
    }
    setIsHydrated(true);
  }, []);

  // 持久化缓存到 LocalStorage
  useEffect(() => {
    if (isHydrated && Object.keys(translatedCache).length > 0) {
      localStorage.setItem('translation_cache', JSON.stringify(translatedCache));
    }
  }, [translatedCache, isHydrated]);

  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const translationQueue = useRef<number[]>([]);
  const isProcessingQueue = useRef(false);
  const currentLanguageRef = useRef(language);
  const activeAbortController = useRef<AbortController | null>(null);

  // 同步当前语言到 Ref 并处理语言切换
  useEffect(() => {
    if (currentLanguageRef.current !== language) {
      if (activeAbortController.current) {
        activeAbortController.current.abort();
        activeAbortController.current = null;
      }
      translationQueue.current = [];
      setTranslatingIds(new Set());
      // 允许新语言的 processQueue 启动
      isProcessingQueue.current = false;
    }
    currentLanguageRef.current = language;
  }, [language]);

  // 核心翻译扫描逻辑：当语言、插件列表或缓存更新时运行
  useEffect(() => {
    const lang = language;
    if (lang === 'en') {
      translationQueue.current = [];
      return;
    }

    // 找出所有需要翻译但不在队列中且未在翻译的项目
    const toTranslate = plugins.filter(repo => {
      const cacheKey = `${repo.id}_${lang}`;
      return repo.description && 
        !translatedCache[cacheKey] && 
        !translatingIds.has(repo.id) &&
        !translationQueue.current.includes(repo.id);
    });

    if (toTranslate.length === 0) return;

    // 将新发现的项目加入队列
    const newIds = toTranslate.map(r => r.id);
    translationQueue.current = [...translationQueue.current, ...newIds];
    
    updateQueueStatus({ pending: translationQueue.current.length });
    
    // 如果当前没有正在处理的队列，则启动处理
    if (!isProcessingQueue.current) {
      processQueue(lang);
    }
  }, [language, plugins, translatedCache]); // 保持依赖项稳定，不要展开 plugins

  const processQueue = async (lang: string) => {
    if (isProcessingQueue.current || translationQueue.current.length === 0) return;
    isProcessingQueue.current = true;

    const BATCH_SIZE = 10;

    try {
      while (translationQueue.current.length > 0) {
        // 关键：在循环开始前再次检查当前语言，确保不会翻译旧语言的任务
        if (currentLanguageRef.current === 'en' || currentLanguageRef.current !== lang) {
          break;
        }

        // 取出一批需要翻译的项目
        const batchIds: number[] = [];
        const batchTexts: string[] = [];
        
        // 限制批处理大小
        const currentBatchSize = Math.min(BATCH_SIZE, translationQueue.current.length);
        for (let i = 0; i < currentBatchSize; i++) {
          const id = translationQueue.current.shift();
          if (!id) continue;
          
          // 重新从最新的 plugins 状态中查找，确保数据最新
          const repo = pluginsRef.current.find(p => p.id === id);
          if (repo && repo.description && !translatedCache[`${id}_${lang}`]) {
            batchIds.push(id);
            batchTexts.push(repo.description);
          }
        }

        if (batchIds.length === 0) continue;

        setTranslatingIds(prev => {
          const next = new Set(prev);
          batchIds.forEach(id => next.add(id));
          return next;
        });
        
        updateQueueStatus({ 
          pending: translationQueue.current.length,
          processing: batchIds.length 
        });

        addLog({
          type: 'api',
          module: 'translate',
          message: `开始请求批量翻译 (${batchIds.length} 条)`,
          details: { batchIds }
        });
        
        const controller = new AbortController();
        activeAbortController.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 60000); 
        const startTime = Date.now();

        try {
          let retryCount = 0;
          const maxRetries = 2;
          let success = false;
          let resData = null;

          while (retryCount <= maxRetries && !success) {
            if (controller.signal.aborted) break;

            const res = await fetch('/api/translate', {
              method: 'POST',
              body: JSON.stringify({ items: batchTexts, targetLang: lang }),
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            }).catch(err => {
              if (err.name === 'AbortError') throw err;
              console.error('Fetch failed for /api/translate:', err);
              return { ok: false, status: 0 };
            });
            
            if (res && 'status' in res && res.status === 429) {
              retryCount++;
              addLog({
                type: 'error',
                module: 'translate',
                message: `触发频率限制 (429)，等待重试 (${retryCount}/${maxRetries})`,
                status: 429
              });
              const waitTime = Math.pow(2, retryCount) * 2000;
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }

            if (!res || !('ok' in res) || !res.ok) {
              const status = res && 'status' in res ? res.status : 'Unknown';
              addLog({
                type: 'error',
                module: 'translate',
                message: `翻译接口返回错误: ${status}`,
                status: status
              });
              throw new Error(`HTTP error! status: ${status}`);
            }
            
            resData = await (res as Response).json();
            success = true;

            addLog({
              type: 'api',
              module: 'translate',
              message: `批量翻译成功`,
              status: 200,
              duration: Date.now() - startTime
            });
          }
          
          if (resData && resData.translatedMap) {
            const newCache: Record<string, string> = {};
            batchIds.forEach((id, index) => {
              if (resData.translatedMap[index]) {
                newCache[`${id}_${lang}`] = resData.translatedMap[index];
              }
            });
            setTranslatedCache(prev => ({ ...prev, ...newCache }));
            
            updateQueueStatus({ 
              completed: (prev: number) => prev + batchIds.length,
              processing: 0
            });
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            addLog({
              type: 'system',
              module: 'translate',
              message: '翻译请求已取消（用户切换了分类或语言）'
            });
          } else {
            addLog({
              type: 'error',
              module: 'translate',
              message: `翻译失败: ${err.message}`
            });
            updateQueueStatus({ 
              failed: (prev: number) => prev + batchIds.length,
              processing: 0
            });
            console.error('Batch translation error:', err);
          }
        } finally {
          clearTimeout(timeoutId);
          if (activeAbortController.current === controller) {
            activeAbortController.current = null;
          }
          setTranslatingIds(prev => {
            const next = new Set(prev);
            batchIds.forEach(id => next.delete(id));
            return next;
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); // 减少等待时间以提高响应速度
      }
    } finally {
      isProcessingQueue.current = false;
      // 检查是否还有新加入的任务，确保使用最新的语言
      const latestLang = currentLanguageRef.current;
      if (translationQueue.current.length > 0 && latestLang !== 'en') {
        processQueue(latestLang);
      }
    }
  };
  const fetchMorePlugins = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const startTime = Date.now();

    addLog({
      type: 'api',
      module: 'github',
      message: `加载更多插件 (第 ${nextPage} 页)`
    });

    try {
      const response = await fetch(`/api/plugins?q=${encodeURIComponent(query)}&sort=${sort}&page=${nextPage}`);
      const newPlugins = await response.json();

      if (newPlugins.length === 0) {
        setHasMore(false);
        addLog({
          type: 'system',
          module: 'github',
          message: '没有更多插件可供加载'
        });
      } else {
        setPlugins(prev => [...prev, ...newPlugins]);
        setPage(nextPage);
        addLog({
          type: 'api',
          module: 'github',
          message: `成功加载 ${newPlugins.length} 个新插件`,
          status: 200,
          duration: Date.now() - startTime
        });
      }
    } catch (error: any) {
      addLog({
        type: 'error',
        module: 'github',
        message: `加载插件失败: ${error.message}`
      });
      console.error('Error fetching more plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMorePlugins();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, page, hasMore, loading, query, sort]);

  return (
    <div className="flex flex-col gap-8">
      {title && (
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-indigo-600" />
          <h2 className="text-2xl font-black text-gray-900">{title}</h2>
        </div>
      )}
      {query && !hideSearchHeader && (
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center gap-2 rounded-full bg-indigo-50 px-4 text-sm font-bold text-indigo-600">
              <Search size={14} />
              <span>{t('search.results_for')}: "{query}"</span>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="text-xs font-bold text-gray-400 transition-colors hover:text-indigo-600"
            >
              {t('search.clear')}
            </button>
          </div>
          <span className="text-xs font-medium text-gray-400">
            {plugins.length} {t('search.items_found')}
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {loading && plugins.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => <PluginSkeleton key={i} />)
        ) : (
          <AnimatePresence mode="wait">
            {plugins.map((repo, index) => (
              <motion.div 
                key={`${repo.id}-${index}`} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-2 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-50/50"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-0.5 ring-2 ring-gray-50/50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <div className="relative h-full w-full overflow-hidden rounded-[0.6rem]">
                      <Image 
                        src={repo.owner.avatar_url} 
                        alt={repo.owner.login} 
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-600 shadow-sm shadow-amber-100/50">
                      <Star size={12} fill="currentColor" />
                      <span>{repo.stargazers_count > 1000 ? `${(repo.stargazers_count / 1000).toFixed(1)}k` : repo.stargazers_count}</span>
                    </div>
                    {repo.license ? (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-black tracking-wider text-indigo-600 uppercase">
                        {repo.license.key.split('-')[0]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[9px] font-black tracking-wider text-gray-500 uppercase">
                        {t('grid.community')}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mb-2">
                  <h3 className="line-clamp-1 text-base font-black text-gray-900 transition-colors duration-300 group-hover:text-indigo-600">
                    {repo.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <div className="h-3.5 w-3.5 overflow-hidden rounded-full ring-1 ring-gray-100">
                      <Image src={repo.owner.avatar_url} alt={repo.owner.login} width={14} height={14} />
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{repo.owner.login}</span>
                  </div>
                </div>

                <p className="mb-5 line-clamp-3 min-h-[3.75rem] text-[13px] font-medium leading-relaxed text-gray-500/90">
                  {translatingIds.has(repo.id) ? (
                    <span className="flex items-center gap-2 italic text-indigo-400">
                      <Loader2 size={12} className="animate-spin" />
                      Translating...
                    </span>
                  ) : (
                    translatedCache[`${repo.id}_${language}`] || repo.description || t('hero.subtitle')
                  )}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shadow-sm ${repo.license ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {repo.license ? t('grid.verified') : t('grid.community')}
                    </span>
                  </div>
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-2 rounded-xl bg-gray-900 px-4 text-[10px] font-black text-white transition-all duration-300 hover:scale-105 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 active:scale-95"
                  >
                    <Github size={14} />
                    <span>{t('grid.explore')}</span>
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {!loading && plugins.length === 0 && (
        <EmptyState hasError={false} />
      )}

      {/* Loading & Infinite Scroll Target */}
      <div ref={observerTarget} className="flex flex-col items-center justify-center py-20">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" />
              <Loader2 className="relative animate-spin text-indigo-600" size={40} />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600/60">
              {t('grid.loading')}
            </span>
          </div>
        ) : !hasMore && plugins.length > 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-300">
              {t('grid.end')}
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              {t('grid.back_to_top')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
