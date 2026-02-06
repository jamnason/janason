import { searchAiPlugins } from "@/lib/github";
import AIChat from "@/components/AIChat";
import CategoryFilters from "@/components/CategoryFilters";
import PluginGrid from "@/components/PluginGrid";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import EmptyState from "@/components/EmptyState";
import BackendMonitor from "@/components/BackendMonitor";
import { Search } from "lucide-react";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string | string[]; category?: string | string[]; sort?: string | string[] };
}) {
  // 更加鲁棒的参数获取函数
  const getParam = (param: string | string[] | undefined): string => {
    if (!param) return "";
    return Array.isArray(param) ? param[0] : param;
  };

  const q = getParam(searchParams.q);
  const rawCategory = getParam(searchParams.category);
  const sortParam = getParam(searchParams.sort) || "stars";
  
  // 如果有搜索词且没有指定分类，或者正在搜索，则强制进入 'search' 分类
  const category = (q.trim() && !rawCategory) ? 'search' : (rawCategory || "all");
  
  console.log('--- Page Render Debug ---');
  console.log('Raw searchParams:', JSON.stringify(searchParams));
  console.log('Processed q:', q, 'category:', category);
  
  const trimmedQuery = q.trim();

  // 1. 获取主板块内容的插件
  let mainGithubQuery = '';
  let mainSort = sortParam;
  
  if (category === 'latest') {
    mainSort = 'updated';
  }

  if (category === 'search') {
    // 简化搜索逻辑：GitHub 搜索对括号和复杂逻辑支持较敏感，使用空格分隔关键词更鲁棒
    if (trimmedQuery) {
      // 预处理：如果是自然语言长句，提取核心词
      let optimizedQuery = trimmedQuery
        .replace(/[的|个|可以|找|搜|查找|推荐|插件|工具|一下|有没有|关于]/g, ' ') // 移除中文无意义词
        .replace(/\s+/g, ' ')
        .trim();

      const lowerQuery = optimizedQuery.toLowerCase();
      // 如果用户搜索词中没包含 ai 相关词汇，简单追加 'ai' 关键词
      if (!lowerQuery.includes('ai') && !lowerQuery.includes('llm') && !lowerQuery.includes('gpt')) {
        // 如果是翻译类请求，自动补全 translate 以增加命中率
        if (lowerQuery.includes('翻译')) {
          optimizedQuery = `${optimizedQuery} translate ai`;
        } else {
          optimizedQuery = `${optimizedQuery} ai`;
        }
      }
      mainGithubQuery = optimizedQuery;
    } else {
      mainGithubQuery = 'topic:ai-plugin';
    }
  } else {
    switch (category) {
      case 'functional':
        mainGithubQuery = 'ai tool OR ai utility';
        break;
      case 'chat':
        mainGithubQuery = 'ai chat OR chatbot';
        break;
      case 'model':
        mainGithubQuery = 'llm OR lora OR checkpoint';
        break;
      case 'image':
        mainGithubQuery = 'stable diffusion OR midjourney OR "image generation"';
        break;
      case 'entertainment':
        mainGithubQuery = 'ai game OR ai fun';
        break;
      default:    
        mainGithubQuery = 'ai';
    }
  }

  // 2. 获取底部“全部插件”板块的插件 (始终保持 'all' 分类)
  const allPluginsQuery = 'ai';

  console.log('Executing fetch for main content:', mainGithubQuery);

  // 并行请求
  const [mainPlugins, allPlugins] = await Promise.all([
    searchAiPlugins(mainGithubQuery, mainSort),
    // 如果主板块已经请求了 'ai' 且没有搜索词，则直接复用结果
    (category === 'all' && !trimmedQuery) 
      ? Promise.resolve([]) 
      : searchAiPlugins(allPluginsQuery, 'stars')
  ]);

  // 复用逻辑
  const finalAllPlugins = (category === 'all' && !trimmedQuery) ? mainPlugins : allPlugins;

  const hasSearchError = category === 'search' && !!trimmedQuery && mainPlugins.length === 0;

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <Navbar pluginCount={finalAllPlugins.length} />
      
      <div className="container mx-auto flex flex-col gap-12 px-6 py-12">
        {!trimmedQuery && category === 'all' && <HeroSection />}

        {/* Category Tabs - 现在包含“我的搜索” */}
        <div id="category-nav" className="scroll-mt-24 pb-4">
          <CategoryFilters />
        </div>

        {/* 主内容板块 - 根据分类切换 */}
        <section className="space-y-8 min-h-[400px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-indigo-600" />
              <h2 className="text-2xl font-black text-gray-900">
                {category === 'search' ? (
                  <>查询结果: <span className="text-indigo-600">"{trimmedQuery || '全部'}"</span></>
                ) : (
                  category === 'all' ? '全部插件' : 
                  category === 'stars' ? '星数最高' :
                  category === 'latest' ? '最新发布' :
                  category === 'functional' ? '功能型' :
                  category === 'entertainment' ? '趣味类' : '分类浏览'
                )}
              </h2>
            </div>
            {category === 'search' && (
              <Link 
                href="/"
                className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2 text-sm font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                清空搜索
              </Link>
            )}
          </div>

          {mainPlugins.length > 0 ? (
            <PluginGrid 
              key={`main-grid-${category}-${trimmedQuery}`}
              initialPlugins={mainPlugins} 
              query={category === 'search' ? trimmedQuery : ""} 
              sort={mainSort} 
              hideSearchHeader={true}
            />
          ) : (
            <div key="empty-state" className="py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <EmptyState hasError={hasSearchError} />
            </div>
          )}
        </section>

        {/* 底部固定“全部插件”板块 - 满足用户“仍然恢复到原来可呈现全部插件的状态”的要求 */}
        {category !== 'all' && (
          <section className="mt-12 space-y-8 border-t border-gray-100 pt-12">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-gray-300" />
              <h2 className="text-2xl font-black text-gray-900">全部插件 (发现更多)</h2>
            </div>
            <PluginGrid 
              key="all-plugins-footer"
              initialPlugins={finalAllPlugins} 
              query="" 
              sort="stars" 
              hideSearchHeader={true}
            />
          </section>
        )}
      </div>

      <AIChat />
      <BackendMonitor />
    </main>
  );
}
