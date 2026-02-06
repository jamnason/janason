'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'zh' | 'en' | 'jp' | 'kr';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    'nav.title': 'AI 插件中心',
    'nav.subtitle': '发现与连接',
    'nav.search': '搜索 AI 插件、工具、代码...',
    'nav.submit': '提交插件',
    'filter.all': '全部插件',
    'filter.stars': '星数最高',
    'filter.latest': '最新发布',
    'filter.functional': '功能型',
    'filter.entertainment': '趣味类',
    'filter.search': '我的搜索',
    'hero.title': '发现 GitHub 上的',
    'hero.title_highlight': 'AI 宝藏',
    'hero.subtitle': '汇集全球顶尖创作者的 AI 插件与开源项目。实时更新数据，AI 助手深度解析，带你直达智能开发的未来。',
    'grid.loading': '正在为您寻找更多宝藏...',
    'grid.end': '你已经到达了宇宙的尽头',
    'grid.back_to_top': '返回顶部 ↑',
    'grid.verified': '认证插件',
    'grid.community': '社区项目',
    'grid.explore': '去探索',
    'chat.welcome': '你好！我是你的 AI 插件助手。你可以问我关于 GitHub 上的 AI 插件、工具或任何开发相关的问题。',
    'chat.placeholder': '输入你的问题...',
    'chat.thinking': '正在思考...',
    'chat.online': '在线解析中',
    'error.search': '搜索出错了',
    'error.retry': '请尝试更换关键词或稍后再试',
    'error.empty': '没有找到相关插件',
    'error.empty_hint': '试试其他的关键词或分类吧',
    'count.label': '已找到',
    'count.unit': '个项目',
    'search.results_for': '搜索结果',
    'search.clear': '清除',
    'search.items_found': '个结果',
  },
  en: {
    'nav.title': 'AI Plugin Hub',
    'nav.subtitle': 'Discover & Connect',
    'nav.search': 'Search AI plugins...',
    'nav.submit': 'Submit Plugin',
    'hero.title': 'Discover',
    'hero.title_highlight': 'AI Treasures',
    'hero.subtitle': 'A collection of AI plugins and open-source projects from top creators worldwide. Real-time data, AI-powered analysis, leading you to the future of intelligent development.',
    'filter.all': 'All Projects',
    'filter.stars': 'Most Stars',
    'filter.latest': 'Recently Updated',
    'filter.functional': 'Functional',
    'filter.entertainment': 'Entertainment',
    'filter.search': 'My Search',
    'grid.loading': 'Discovering more treasures...',
    'grid.end': "You've reached the end of the universe",
    'grid.back_to_top': 'Back to Top ↑',
    'grid.verified': 'Verified Plugin',
    'grid.community': 'Community Project',
    'grid.explore': 'EXPLORE',
    'chat.welcome': 'Hello! I am your AI Plugin Assistant. You can ask me about AI plugins, tools, or any development-related questions on GitHub.',
    'chat.placeholder': 'Type your question...',
    'chat.thinking': 'Thinking...',
    'chat.online': 'AI Online',
    'error.search': 'Search Failed',
    'error.retry': 'Please try different keywords or try again later',
    'error.empty': 'No Plugins Found',
    'error.empty_hint': 'Try other keywords or categories',
    'count.label': 'Found',
    'count.unit': 'projects',
    'search.results_for': 'Results for',
    'search.clear': 'Clear',
    'search.items_found': 'items found',
  },
  jp: {
    'nav.title': 'AI プラグインハブ',
    'nav.subtitle': '発見と接続',
    'nav.search': 'AI プラグインを検索...',
    'nav.submit': 'プラグインを提出',
    'hero.title': 'GitHub で',
    'hero.title_highlight': 'AI の宝物',
    'hero.subtitle': '世界中のトップクリエイターによる AI プラグインとオープンソースプロジェクトのコレクション。リアルタイムデータ、AI 分析により、インテリジェントな開発の未来へ導きます。',
    'filter.all': 'すべてのプロジェクト',
    'filter.stars': 'スター数順',
    'filter.latest': '最新の更新',
    'filter.functional': '実用的',
    'filter.entertainment': 'エンターテインメント',
    'filter.search': '検索',
    'grid.loading': 'さらなる宝物を探索中...',
    'grid.end': '宇宙の果てに到達しました',
    'grid.back_to_top': 'トップに戻る ↑',
    'grid.verified': '認証済み',
    'grid.community': 'コミュニティ',
    'grid.explore': '探索する',
    'chat.welcome': 'こんにちは！私はあなたの AI プラグインアシスタントです。GitHub 上の AI プラグイン、工具、または開発に関する質問にお答えします。',
    'chat.placeholder': '質問を入力してください...',
    'chat.thinking': '考え中...',
    'chat.online': 'オンライン解析中',
    'error.search': '検索に失敗しました',
    'error.retry': 'キーワードを変更するか、後でもう一度お試しください',
    'error.empty': 'プラグ인が見つかりませんでした',
    'error.empty_hint': '他のキーワードやカテゴリを試してみてください',
    'count.label': '見つかりました',
    'count.unit': '個のプロジェクト',
    'search.results_for': '検索結果',
    'search.clear': 'クリア',
    'search.items_found': '件の結果',
  },
  kr: {
    'nav.title': 'AI 플러그인 허브',
    'nav.subtitle': '발견 및 연결',
    'nav.search': 'AI 플러그인 검색...',
    'nav.submit': '플러그인 제출',
    'hero.title': 'GitHub에서',
    'hero.title_highlight': 'AI 보물',
    'hero.subtitle': '전 세계 최고의 크리에이터들이 만든 AI 플러그인 및 오픈 소스 프로젝트 모음입니다. 실시간 데이터와 AI 분석을 통해 지능형 개발의 미래로 안내합니다.',
    'filter.all': '모든 프로젝트',
    'filter.stars': '최고 별점',
    'filter.latest': '최근 업데이트',
    'filter.functional': '실용적',
    'filter.entertainment': '흥미/오락',
    'filter.search': '검색',
    'grid.loading': '더 많은 보물을 찾는 중...',
    'grid.end': '우주의 끝에 도달했습니다',
    'grid.back_to_top': '맨 위로 ↑',
    'grid.verified': '인증된 플러그인',
    'grid.community': '커뮤니티 프로젝트',
    'grid.explore': '탐색하기',
    'chat.welcome': '안녕하세요! 저는 당신의 AI 플러그인 도우미입니다. GitHub의 AI 플러그인, 도구 또는 개발 관련 질문을 해주세요.',
    'chat.placeholder': '질문을 입력하세요...',
    'chat.thinking': '생각 중...',
    'chat.online': '온라인 분석 중',
    'error.search': '검색 실패',
    'error.retry': '다른 키워드를 시도하거나 나중에 다시 시도하십시오',
    'error.empty': '플러그인을 찾을 수 없습니다',
    'error.empty_hint': '다른 키워드나 카테고리를 시도해보세요',
    'count.label': '찾았습니다',
    'count.unit': '개의 프로젝트',
    'search.results_for': '검색 결과',
    'search.clear': '초기화',
    'search.items_found': '개의 결과',
  }
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('app-language') as Language;
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
