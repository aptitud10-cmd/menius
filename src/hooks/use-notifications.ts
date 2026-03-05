'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundStore } from '@/store/sound';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(ctx: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.35) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now + start);
  gain.gain.setValueAtTime(vol, now + start);
  gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now + start);
  osc.stop(now + start + dur + 0.05);
}

function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  playTone(ctx, 587.33, 0, 0.15);
  playTone(ctx, 880, 0.15, 0.25);
}

function playUrgentChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  playTone(ctx, 880, 0, 0.1, 'triangle', 0.4);
  playTone(ctx, 880, 0.15, 0.1, 'triangle', 0.4);
  playTone(ctx, 1046.5, 0.3, 0.2, 'triangle', 0.4);
}

function playSuccessDing() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  playTone(ctx, 1046.5, 0, 0.15, 'sine', 0.25);
  playTone(ctx, 1318.5, 0.12, 0.2, 'sine', 0.2);
}

interface UseNotificationsOptions {
  defaultTitle?: string;
}

export function useNotifications(opts: UseNotificationsOptions = {}) {
  const { defaultTitle = 'MENIUS' } = opts;
  const soundEnabled = useSoundStore((s) => s.soundEnabled);
  const setSoundEnabled = useSoundStore((s) => s.setSoundEnabled);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const originalTitleRef = useRef(defaultTitle);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    const granted = result === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  const playSound = useCallback((variant: 'normal' | 'urgent' | 'success' = 'normal') => {
    if (!soundEnabled) return;
    try {
      if (variant === 'urgent') playUrgentChime();
      else if (variant === 'success') playSuccessDing();
      else playChime();
    } catch (err) {
      console.error('[useNotifications] playSound failed:', err);
    }
  }, [soundEnabled]);

  const updateTabTitle = useCallback((count: number) => {
    setPendingCount(count);
    if (typeof document === 'undefined') return;

    if (count > 0) {
      document.title = `(${count}) Nueva${count > 1 ? 's' : ''} orden${count > 1 ? 'es' : ''} — ${originalTitleRef.current}`;
    } else {
      document.title = originalTitleRef.current;
    }
  }, []);

  const flashTabTitle = useCallback((message: string, durationMs = 8000) => {
    if (typeof document === 'undefined') return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    let showMessage = true;
    intervalRef.current = setInterval(() => {
      document.title = showMessage ? message : originalTitleRef.current;
      showMessage = !showMessage;
    }, 1000);

    setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (pendingCount > 0) {
        document.title = `(${pendingCount}) Nueva${pendingCount > 1 ? 's' : ''} orden${pendingCount > 1 ? 'es' : ''} — ${originalTitleRef.current}`;
      } else {
        document.title = originalTitleRef.current;
      }
    }, durationMs);
  }, [pendingCount]);

  const sendBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if (!hasPermission) return;
    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'menius-order',
      });
      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
        };
      }
      setTimeout(() => notification.close(), 8000);
    } catch (err) {
      console.error('[useNotifications] sendBrowserNotification failed:', err);
    }
  }, [hasPermission]);

  const notifyNewOrder = useCallback((orderNumber: string, total: string, orderType?: string) => {
    playSound(orderType === 'delivery' ? 'urgent' : 'normal');
    flashTabTitle(`🔔 Nueva orden #${orderNumber}`);
    sendBrowserNotification(
      orderType === 'delivery' ? '🚚 Delivery' : '🍽️ Nueva orden',
      `Orden #${orderNumber} — ${total}`,
    );
  }, [playSound, flashTabTitle, sendBrowserNotification]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
    pendingCount,
    hasPermission,
    requestPermission,
    playSound,
    updateTabTitle,
    notifyNewOrder,
    sendBrowserNotification,
  };
}
