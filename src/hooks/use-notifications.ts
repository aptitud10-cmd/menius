'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const notes = [
    { freq: 587.33, start: 0, duration: 0.15 },
    { freq: 880, start: 0.15, duration: 0.25 },
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.35, now + start);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });
}

interface UseNotificationsOptions {
  defaultTitle?: string;
}

export function useNotifications(opts: UseNotificationsOptions = {}) {
  const { defaultTitle = 'MENIUS' } = opts;
  const [soundEnabled, setSoundEnabled] = useState(true);
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

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      playChime();
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

  const notifyNewOrder = useCallback((orderNumber: string, total: string) => {
    playSound();
    flashTabTitle(`🔔 Nueva orden #${orderNumber}`);
    sendBrowserNotification(
      '🍽️ Nueva orden',
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
