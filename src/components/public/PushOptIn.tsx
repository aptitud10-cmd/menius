'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';

interface PushOptInProps {
  orderId: string;
}

export function PushOptIn({ orderId }: PushOptInProps) {
  const [state, setState] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setState('subscribed');
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setLoading(false);
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          order_id: orderId,
        }),
      });

      if (res.ok) {
        setState('subscribed');
        try { navigator?.vibrate?.(10); } catch {}
      }
    } catch (err) {
      console.error('[PushOptIn] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, loading]);

  if (state === 'unsupported' || state === 'denied') return null;

  if (state === 'subscribed') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-sm text-emerald-700 font-medium">
          Te notificaremos cuando tu pedido cambie de estado
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
    >
      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
        {loading ? (
          <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <Bell className="w-4 h-4 text-blue-600" />
        )}
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-gray-900">Activar notificaciones</p>
        <p className="text-xs text-gray-500">Recibe alertas cuando tu pedido cambie de estado</p>
      </div>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
