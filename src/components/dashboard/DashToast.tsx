'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within DashToastProvider');
  return ctx;
}

const ICON_MAP = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const STYLE_MAP = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-gray-800 text-white',
};

export function DashToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++counter.current;
    setToasts(prev => [...prev.slice(-4), { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICON_MAP[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right min-w-[200px] max-w-[360px]',
                STYLE_MAP[t.variant],
              )}
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3" />
              </div>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="p-0.5 rounded hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
