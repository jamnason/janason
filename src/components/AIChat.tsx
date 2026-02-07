'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Zap, User, Bot, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMonitor } from '@/context/MonitorContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isStatus?: boolean;
}

export default function AIChat() {
  const { t } = useTranslation();
  const { addLog } = useMonitor();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize welcome message when translation is ready
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: '1', text: t('chat.welcome'), sender: 'bot' }]);
    }
  }, [t, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.sender === 'bot') {
          return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + '\n[已停止生成]' }];
        }
        return prev;
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    addLog({
      type: 'api',
      module: 'chat',
      message: `发送 AI 聊天请求: "${input.substring(0, 20)}..."`
    });

    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: messages.concat(userMsg).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '服务器响应异常' }));
        addLog({
          type: 'error',
          module: 'chat',
          message: `AI 聊天请求失败: ${errorData.message || response.status}`,
          status: response.status
        });
        throw new Error(errorData.message || errorData.error || 'AI 助手连接失败');
      }

      addLog({
        type: 'api',
        module: 'chat',
        message: 'AI 响应成功，开始流式输出',
        status: 200,
        duration: Date.now() - startTime
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let hasAddedBotMessage = false;
      let toolCallBuffer = '';
      let isCapturingToolCall = false;

      if (reader) {
        try {
          let fullStreamContent = ''; // 全量缓冲区，用于处理被切分的标识符
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullStreamContent += chunk;
            
            // 如果已经触发了导航，停止处理后续内容
            if (typeof window !== 'undefined' && (window as any).isNavigating) {
              continue;
            }

            // 1. 工具调用检测 (流式)
            const toolMarker = '__TOOL_CALL__';
            const endMarker = '@@END_TOOL_CALL@@';
            
            if (fullStreamContent.includes(toolMarker)) {
              const startIndex = fullStreamContent.indexOf(toolMarker);
              const afterMarker = fullStreamContent.substring(startIndex + toolMarker.length);
              const endIndex = afterMarker.indexOf(endMarker);
              
              if (endIndex !== -1) {
                const jsonStr = afterMarker.substring(0, endIndex);
                try {
                  const toolData = JSON.parse(jsonStr);
                  handleToolCall(toolData);
                  
                  // 提取成功后显示一条状态消息
                  const searchMsg = toolData.function?.arguments 
                    ? `正在为您搜索: ${JSON.parse(toolData.function.arguments).query || '相关内容'}...`
                    : "正在为您检索插件...";
                    
                  setMessages(prev => {
                    // 移除之前的 bot 回复，只保留状态消息
                    const nonBotMsgs = prev.filter(m => m.sender !== 'bot' || m.isStatus);
                    return [...nonBotMsgs, { 
                      id: 'tool-' + Date.now(), 
                      text: `🔍 ${searchMsg}`, 
                      sender: 'bot',
                      isStatus: true 
                    }];
                  });
                  
                  // 标记已处理，防止重复
                  fullStreamContent = fullStreamContent.substring(startIndex + toolMarker.length + endIndex + endMarker.length);
                  isCapturingToolCall = false;
                } catch (e) {
                  console.error('JSON Parse Error:', jsonStr, e);
                  // 如果 JSON 不完整，继续累积
                }
              } else {
                // 标识符不完整，标记为正在捕获
                isCapturingToolCall = true;
              }
            }
            
            // 2. 普通文本处理（只有在没有捕获工具调用时才显示）
            if (!isCapturingToolCall) {
              // 移除已处理的工具调用部分后的内容作为文本显示
              accumulatedText = fullStreamContent.replace(/__TOOL_CALL__.*?@@END_TOOL_CALL@@/g, '');
              if (accumulatedText.trim()) {
                updateMessages(accumulatedText, hasAddedBotMessage, setMessages, (val) => hasAddedBotMessage = val);
              }
            }
          }
          
          // --- 兜底逻辑：如果 AI 回复已经结束，且没有触发工具调用，但内容暗示了搜索意图 ---
          if (typeof window !== 'undefined' && !(window as any).isNavigating) {
            const searchKeywords = ['正在为您搜索', '为您找到', '检索相关插件', '跳转到'];
            const hasSearchIntent = searchKeywords.some(kw => accumulatedText.includes(kw));
            
            if (hasSearchIntent) {
              console.log('Fallback: Search intent detected in text but no tool call. Forcing search...');
              handleToolCall({
                function: {
                  name: 'search_plugins',
                  arguments: JSON.stringify({ query: input || accumulatedText.substring(0, 20) })
                }
              });
            }
          }
        } catch (streamError: any) {
          if (streamError.name === 'AbortError') {
             addLog({
               type: 'system',
               module: 'chat',
               message: 'AI 回答已停止'
             });
             console.log('Stream aborted');
             return;
          }
          console.error('Stream reading error:', streamError);
          accumulatedText += '\n\n[回答中断，请检查网络连接]';
          updateBotMessage(accumulatedText);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog({
          type: 'system',
          module: 'chat',
          message: 'AI 请求已取消'
        });
        return;
      }
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        text: `抱歉，遇到了一点问题：${error.message}`, 
        sender: 'bot' 
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const updateBotMessage = (text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender === 'bot') {
        return [...prev.slice(0, -1), { ...last, text }];
      }
      return prev;
    });
  };

  const updateMessages = (
    text: string, 
    hasAdded: boolean, 
    setMsgs: any, 
    setHasAdded: (val: boolean) => void
  ) => {
    if (!text.trim()) return;
    if (!hasAdded) {
      setMsgs((prev: any) => [...prev, { id: 'bot-' + Date.now(), text, sender: 'bot' }]);
      setHasAdded(true);
    } else {
      setMsgs((prev: any) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === 'bot') {
          return [...prev.slice(0, -1), { ...last, text }];
        }
        return prev;
      });
    }
  };

  const handleToolCall = (toolData: any) => {
    // 检查是否已经触发过跳转，防止重复执行
    if (typeof window !== 'undefined' && (window as any).isNavigating) return;

    try {
      if (toolData.function?.name === 'search_plugins') {
        const args = typeof toolData.function.arguments === 'string' 
          ? JSON.parse(toolData.function.arguments) 
          : toolData.function.arguments || {};
        
        const params = new URLSearchParams(searchParams.toString());
        if (args.query) params.set('q', args.query);
        // 强制设置 category 为 search
        params.set('category', 'search');
        if (args.sort) params.set('sort', args.sort);

        const newSearchString = params.toString();
        // 跳转到分类导航位置，这样用户能看到“我的搜索”被选中
        const searchUrl = `/?${newSearchString}#category-nav`;
        console.log('AI Triggering Navigation to:', searchUrl);
        
        addLog({
          type: 'system',
          module: 'search',
          message: `AI 触发搜索 (跳转中): ${args.query || '当前分类'}`,
          details: { url: searchUrl, args }
        });
        
        // 设置全局导航状态，防止并发流多次触发
        if (typeof window !== 'undefined') {
          (window as any).isNavigating = true;
        }
        
        // 强制导航逻辑：在跳转前清理资源
        setTimeout(() => {
          // 1. 立即中止当前的 AI 请求流
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }

          // 2. 构造干净的搜索 URL
          const cleanParams = new URLSearchParams();
          if (args.query) cleanParams.set('q', args.query);
          cleanParams.set('category', 'search');
          if (args.sort) cleanParams.set('sort', args.sort);

          const finalUrl = `/?${cleanParams.toString()}#category-nav`;
          
          console.log('CRITICAL: Executing navigation to:', finalUrl);
          
          // 3. 使用 location.replace 确保跳转被执行且不留下中间历史记录
          window.location.replace(finalUrl);
          
          // 4. 兜底逻辑：如果 location.replace 失败，100ms 后尝试 assign
          setTimeout(() => {
            if (window.location.search !== `?${cleanParams.toString()}`) {
              window.location.assign(finalUrl);
            }
          }, 100);
        }, 30);
      }
    } catch (e) {
      console.error('Tool execution error', e);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-10 right-10 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-2xl shadow-indigo-300 transition-all hover:scale-110 hover:rotate-3 hover:bg-indigo-700 active:scale-95"
        >
          {isOpen ? <X size={28} /> : <Zap size={28} fill="currentColor" />}
          {!isOpen && (
            <div className="absolute -top-12 right-0 hidden w-48 rounded-xl bg-gray-900 px-4 py-2 text-center text-xs font-bold text-white group-hover:block animate-in fade-in slide-in-from-bottom-2">
              {t('chat.online')}
              <div className="absolute bottom-0 right-6 translate-y-full border-8 border-transparent border-t-gray-900" />
            </div>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 sm:bottom-28 sm:right-10 z-50 flex h-[calc(100vh-120px)] w-[calc(100vw-32px)] sm:h-[600px] sm:w-[400px] flex-col overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-indigo-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Zap size={22} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white">{t('nav.title')}</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                    </span>
                    {t('chat.online')}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-2 transition hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.isStatus ? (
                      <div className="flex w-full items-center justify-center py-2">
                        <div className="rounded-full bg-indigo-50 px-4 py-1.5 text-[11px] font-black tracking-wider text-indigo-600 shadow-sm ring-1 ring-indigo-100/50">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex max-w-[80%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow-sm'}`}>
                          {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white text-gray-700'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                        <Bot size={16} />
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-2.5 shadow-sm">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                        <span className="text-xs font-bold text-gray-400">正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 bg-gray-50/50 p-6">
              <div className="relative flex items-center gap-3">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('chat.placeholder')}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-5 pr-24 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  {isLoading && (
                    <button 
                      onClick={handleStop}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-all hover:bg-red-100"
                      title="停止生成"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  )}
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:bg-gray-300"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-300">
                Powered by Advanced AI Models
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
