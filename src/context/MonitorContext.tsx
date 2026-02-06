'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'api' | 'queue' | 'error' | 'system';
  module: 'translate' | 'chat' | 'github' | 'search' | 'navigation' | 'grid';
  message: string;
  status?: number | string;
  duration?: number;
  details?: any;
}

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface MonitorContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  queueStatus: QueueStatus;
  updateQueueStatus: (status: Partial<{ [K in keyof QueueStatus]: number | ((prev: number) => number) }>) => void;
}

const MonitorContext = createContext<MonitorContextType | undefined>(undefined);

export function MonitorProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  const addLog = useCallback((log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  const updateQueueStatus = useCallback((statusUpdate: Partial<{ [K in keyof QueueStatus]: number | ((prev: number) => number) }>) => {
    setQueueStatus((prev) => {
      const next = { ...prev };
      (Object.keys(statusUpdate) as (keyof QueueStatus)[]).forEach((key) => {
        const val = statusUpdate[key];
        if (typeof val === 'function') {
          next[key] = val(prev[key]);
        } else if (typeof val === 'number') {
          next[key] = val;
        }
      });
      return next;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <MonitorContext.Provider value={{ logs, addLog, clearLogs, queueStatus, updateQueueStatus }}>
      {children}
    </MonitorContext.Provider>
  );
}

export function useMonitor() {
  const context = useContext(MonitorContext);
  if (context === undefined) {
    throw new Error('useMonitor must be used within a MonitorProvider');
  }
  return context;
}
