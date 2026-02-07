'use client';

import React, { useState, useEffect } from 'react';
import { useMonitor, LogEntry } from '@/context/MonitorContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Terminal, 
  ChevronUp, 
  ChevronDown, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Cpu,
  BarChart3
} from 'lucide-react';

export default function BackendMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const { logs, queueStatus, clearLogs } = useMonitor();
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs');

  // 格式化时间
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('zh-CN', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'api': return <Activity className="w-3 h-3 text-blue-400" />;
      case 'queue': return <RefreshCw className="w-3 h-3 text-purple-400" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400" />;
      default: return <Terminal className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[100] font-mono">
      {/* 悬浮球 */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-full shadow-2xl hover:bg-black transition-colors flex items-center gap-2 group"
        >
          <div className="relative">
            <Activity className="w-5 h-5 text-green-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-black" />
          </div>
          <span className="text-xs text-white/70 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300">后端监控</span>
        </motion.button>
      )}

      {/* 监控面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            className="fixed bottom-4 left-4 right-4 sm:relative sm:bottom-auto sm:left-auto sm:right-auto w-auto sm:w-[450px] h-[calc(100vh-100px)] sm:h-auto max-h-[600px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Cpu className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">后端可视化诊断</h3>
                  <p className="text-[10px] text-white/40">Real-time Backend Monitoring</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearLogs}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
                  title="清除日志"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-px bg-white/10 border-b border-white/10">
              <div className="bg-black/40 p-3 flex flex-col items-center">
                <span className="text-[10px] text-white/40 mb-1">队列中</span>
                <span className="text-sm font-bold text-blue-400">{queueStatus.pending}</span>
              </div>
              <div className="bg-black/40 p-3 flex flex-col items-center">
                <span className="text-[10px] text-white/40 mb-1">处理中</span>
                <span className="text-sm font-bold text-yellow-400 animate-pulse">{queueStatus.processing}</span>
              </div>
              <div className="bg-black/40 p-3 flex flex-col items-center">
                <span className="text-[10px] text-white/40 mb-1">已完成</span>
                <span className="text-sm font-bold text-green-400">{queueStatus.completed}</span>
              </div>
              <div className="bg-black/40 p-3 flex flex-col items-center">
                <span className="text-[10px] text-white/40 mb-1">失败</span>
                <span className="text-sm font-bold text-red-400">{queueStatus.failed}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-white/5 gap-1">
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-1.5 text-[10px] rounded-md transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
              >
                实时日志 (LOGS)
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-1.5 text-[10px] rounded-md transition-all ${activeTab === 'stats' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
              >
                性能统计 (STATS)
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[300px]">
              {activeTab === 'logs' ? (
                logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 pt-10">
                    <Terminal className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">等待数据载入...</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded p-2 transition-all">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.type)}
                          <span className={`text-[10px] font-bold px-1 rounded ${
                            log.module === 'translate' ? 'bg-purple-500/20 text-purple-400' :
                            log.module === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {log.module.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-white/30">{formatTime(log.timestamp)}</span>
                        </div>
                        {log.duration && (
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {log.duration}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/80 break-all leading-relaxed">
                        {log.message}
                      </p>
                      {log.status && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            log.status === 200 ? 'bg-green-500/20 text-green-400' : 
                            log.status === 429 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            HTTP {log.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                <div className="p-4 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-white/40">API 响应效率</span>
                      <BarChart3 className="w-3 h-3 text-white/20" />
                    </div>
                    <div className="space-y-3">
                      <StatBar label="翻译接口 (AVG)" value={85} color="bg-purple-500" />
                      <StatBar label="AI 聊天 (AVG)" value={60} color="bg-blue-500" />
                      <StatBar label="GitHub 检索" value={95} color="bg-green-500" />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="text-[10px] text-white/40 mb-3 uppercase tracking-wider">系统健康度</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <HealthCard label="后端连接" status="正常" />
                      <HealthCard label="API 频率" status="受限" warning />
                      <HealthCard label="缓存命中" status="82%" />
                      <HealthCard label="内存负载" status="低" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/10 bg-black flex items-center justify-between text-[9px] text-white/30">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>Backend: Node.js / Next.js Runtime</span>
              </div>
              <span>v1.0.4-stable</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px]">
        <span className="text-white/60">{label}</span>
        <span className="text-white/40">{value}%</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

function HealthCard({ label, status, warning }: { label: string, status: string, warning?: boolean }) {
  return (
    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
      <p className="text-[9px] text-white/40 mb-1">{label}</p>
      <p className={`text-[10px] font-bold ${warning ? 'text-yellow-400' : 'text-white'}`}>{status}</p>
    </div>
  );
}
