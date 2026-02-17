'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const NOTIFICATION_SOUND_B64 =
  'data:audio/mp3;base64,SUQzAwAAAAAAJlRQRTEAAAAcAAAAU291bmQgRWZmZWN0IC0gTm90aWZpY2F0aW9u/+NIxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+NIxDsAAADSAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

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
      const audio = new Audio(NOTIFICATION_SOUND_B64);
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch {}
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
    } catch {}
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
