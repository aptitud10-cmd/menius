'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell, ShoppingBag, CreditCard, Star, AlertTriangle, Gift, X, Check } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { cn } from '@/lib/utils';

interface DashNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  new_order:        { icon: ShoppingBag,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  order_cancelled:  { icon: AlertTriangle,  color: 'text-red-500',     bg: 'bg-red-50' },
  payment_received: { icon: CreditCard,     color: 'text-blue-600',    bg: 'bg-blue-50' },
  review_received:  { icon: Star,           color: 'text-amber-500',   bg: 'bg-amber-50' },
  subscription:     { icon: CreditCard,     color: 'text-violet-600',  bg: 'bg-violet-50' },
  milestone:        { icon: Gift,           color: 'text-pink-500',    bg: 'bg-pink-50' },
  system:           { icon: Bell,           color: 'text-gray-500',    bg: 'bg-gray-100' },
  low_stock:        { icon: AlertTriangle,  color: 'text-orange-500',  bg: 'bg-orange-50' },
};

function timeAgo(dateStr: string, t: { notif_bell_justNow: string; notif_bell_minutesAgo: string; notif_bell_hoursAgo: string }) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return t.notif_bell_justNow;
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t.notif_bell_minutesAgo}`;
  return `${Math.floor(diff / 3600)} ${t.notif_bell_hoursAgo}`;
}

interface NotificationBellProps {
  restaurantId: string;
}

export function NotificationBell({ restaurantId }: NotificationBellProps) {
  const { t } = useDashboardLocale();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number }>({ top: 0, right: 16 });
  const [notifications, setNotifications] = useState<DashNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('dashboard_notifications')
      .select('id, type, title, body, action_url, is_read, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data as DashNotification[]);
      setUnreadCount(data.filter((n: DashNotification) => !n.is_read).length);
    }
  }, [restaurantId]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling fallback every 30 seconds
  useEffect(() => {
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Realtime subscription — postgres_changes on dashboard_notifications
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`dash-notifs:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dashboard_notifications',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setTimeout(fetchNotifications, 2000);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, fetchNotifications]);

  // Mark all as read when panel opens
  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    const supabase = getSupabaseBrowser();
    await supabase
      .from('dashboard_notifications')
      .update({ is_read: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [notifications, restaurantId]);

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        markAllRead();
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setPanelPos({
            top: rect.bottom + 8,
            right: Math.max(16, window.innerWidth - rect.right),
          });
        }
      }
      return !prev;
    });
  }, [markAllRead]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        aria-label={t.notif_bell_title}
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          open ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden"
          style={{ top: panelPos.top, right: panelPos.right, maxHeight: '420px', maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">{t.notif_bell_title}</p>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">{t.notif_bell_empty}</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_ICONS[notif.type] ?? TYPE_ICONS.system;
                const IconCmp = cfg.icon;
                const content = (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors',
                      !notif.is_read ? 'bg-emerald-50/40' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                      <IconCmp className={cn('w-4 h-4', cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-[13px] leading-snug', !notif.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.created_at, t)}</p>
                    </div>
                  </div>
                );

                return notif.action_url ? (
                  <Link key={notif.id} href={notif.action_url} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notif.id}>{content}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
              <Link
                href="/app/orders"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {t.notif_viewOrders} →
              </Link>
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Check className="w-3 h-3" />
                {t.notif_bell_markRead}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
