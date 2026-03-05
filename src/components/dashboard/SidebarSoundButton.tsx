'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useSoundStore } from '@/store/sound';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface SidebarSoundButtonProps {
  mobile?: boolean;
}

export function SidebarSoundButton({ mobile = false }: SidebarSoundButtonProps) {
  const soundEnabled = useSoundStore((s) => s.soundEnabled);
  const setSoundEnabled = useSoundStore((s) => s.setSoundEnabled);
  const { t } = useDashboardLocale();
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (!soundEnabled) return;
    const interval = setInterval(() => {
      setShaking(true);
      setTimeout(() => setShaking(false), 700);
    }, 6000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  if (mobile) {
    return (
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        title={soundEnabled ? t.notif_mute : t.notif_unmute}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
          soundEnabled
            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
      >
        {soundEnabled ? (
          <Bell className={`w-4 h-4 ${shaking ? 'bell-shake' : ''}`} />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => setSoundEnabled(!soundEnabled)}
      title={soundEnabled ? t.notif_mute : t.notif_unmute}
      className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-lg transition-all duration-200 group ${
        soundEnabled
          ? 'text-emerald-600 hover:bg-emerald-50'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
          soundEnabled ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-gray-200'
        }`}
      >
        {soundEnabled ? (
          <Bell className={`w-3.5 h-3.5 ${shaking ? 'bell-shake' : ''}`} />
        ) : (
          <BellOff className="w-3.5 h-3.5" />
        )}
      </div>
      <span className="text-[12px] font-medium truncate">
        {soundEnabled ? t.notif_mute : t.notif_unmute}
      </span>
    </button>
  );
}
