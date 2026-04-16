'use client';

import { useState, useCallback, useMemo } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, Users, Phone, Mail, Check, X, AlertCircle, ChevronLeft, ChevronRight, Settings, List, Grid3X3, Bell } from 'lucide-react';

type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  reserved_date: string;
  reserved_time: string;
  notes?: string;
  status: ReservationStatus;
  created_at: string;
}

interface ReservationsManagerProps {
  restaurantId: string;
  initialReservations: Reservation[];
  settings: Record<string, any>;
}

const STATUS_CONFIG: Record<ReservationStatus, { label_es: string; label_en: string; color: string; bg: string }> = {
  pending:   { label_es: 'Pendiente',   label_en: 'Pending',   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  confirmed: { label_es: 'Confirmada',  label_en: 'Confirmed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled: { label_es: 'Cancelada',   label_en: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  no_show:   { label_es: 'No asistió',  label_en: 'No-show',   color: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200' },
};

function formatDate(dateStr: string, locale: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function ReservationsManager({ restaurantId, initialReservations, settings }: ReservationsManagerProps) {
  const { locale } = useDashboardLocale();
  const isEs = locale === 'es';
  const supabase = getSupabaseBrowser();

  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(settings.reservations_enabled ?? false);
  const [savingSettings, setSavingSettings] = useState(false);

  const todayReservations = reservations.filter(r => r.reserved_date === selectedDate);

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const todayCount = reservations.filter(r => r.reserved_date === new Date().toISOString().split('T')[0]).length;

  const updateStatus = useCallback(async (id: string, status: ReservationStatus) => {
    setUpdating(id);
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (!error) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));

      // Auto-send confirmation notification when status becomes 'confirmed'
      if (status === 'confirmed') {
        const reservation = reservations.find(r => r.id === id);
        if (reservation && (reservation.customer_email || reservation.customer_phone)) {
          fetch('/api/reservations/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservationId: id,
              status: 'confirmed',
              restaurantId,
              customerName: reservation.customer_name,
              customerEmail: reservation.customer_email,
              customerPhone: reservation.customer_phone,
              date: reservation.reserved_date,
              time: reservation.reserved_time,
              partySize: reservation.party_size,
            }),
          }).catch(() => {});
        }
      }
    }
    setUpdating(null);
  }, [supabase, restaurantId, reservations]);

  const saveSettings = useCallback(async () => {
    setSavingSettings(true);
    await supabase
      .from('restaurants')
      .update({ reservations_enabled: enabled })
      .eq('id', restaurantId);
    setSavingSettings(false);
    setShowSettings(false);
  }, [supabase, restaurantId, enabled]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEs ? 'Reservaciones' : 'Reservations'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEs ? 'Gestiona las mesas reservadas de tu restaurante' : 'Manage your restaurant table reservations'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              <List className="w-3.5 h-3.5" />
              {isEs ? 'Lista' : 'List'}
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              {isEs ? 'Calendario' : 'Calendar'}
            </button>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {isEs ? 'Ajustes' : 'Settings'}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{isEs ? 'Configuración de Reservaciones' : 'Reservation Settings'}</h3>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-900">{isEs ? 'Activar reservaciones' : 'Enable reservations'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEs ? 'Los clientes podrán reservar mesa desde tu menú público' : 'Customers can book a table from your public menu'}
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={cn('relative w-11 h-6 rounded-full transition-colors', enabled ? 'bg-emerald-500' : 'bg-gray-200')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', enabled && 'translate-x-5')} />
            </button>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {savingSettings ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar' : 'Save')}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">{isEs ? 'Pendientes' : 'Pending'}</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">{isEs ? 'Hoy' : 'Today'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{todayCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 font-medium">{isEs ? 'Próximas (7 días)' : 'Next 7 days'}</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {reservations.filter(r => {
              const d = new Date(r.reserved_date);
              const now = new Date();
              const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
              return diff >= 0 && diff <= 7 && r.status !== 'cancelled';
            }).length}
          </p>
        </div>
      </div>

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <CalendarGrid
          reservations={reservations}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          locale={locale}
        />
      )}

      {/* Date navigation */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-gray-900">
            {formatDate(selectedDate, locale)}
          </p>
          {selectedDate === new Date().toISOString().split('T')[0] && (
            <p className="text-xs text-emerald-600 font-medium">{isEs ? 'Hoy' : 'Today'}</p>
          )}
        </div>
        <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Reservations for selected date */}
      {todayReservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {isEs ? 'No hay reservaciones para este día' : 'No reservations for this day'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayReservations.map(r => {
            const cfg = STATUS_CONFIG[r.status];
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{r.customer_name}</p>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', cfg.bg, cfg.color)}>
                        {locale === 'es' ? cfg.label_es : cfg.label_en}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(r.reserved_time)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        {r.party_size} {isEs ? 'personas' : 'guests'}
                      </span>
                      {r.customer_phone && (
                        <a href={`tel:${r.customer_phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Phone className="w-3.5 h-3.5" />
                          {r.customer_phone}
                        </a>
                      )}
                      {r.customer_email && (
                        <a href={`mailto:${r.customer_email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Mail className="w-3.5 h-3.5" />
                          {r.customer_email}
                        </a>
                      )}
                    </div>
                    {r.notes && (
                      <p className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1">
                        📝 {r.notes}
                      </p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateStatus(r.id, 'confirmed')}
                        disabled={updating === r.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isEs ? 'Confirmar' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, 'cancelled')}
                        disabled={updating === r.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        {isEs ? 'Rechazar' : 'Reject'}
                      </button>
                    </div>
                  )}
                  {r.status === 'confirmed' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(r.customer_email || r.customer_phone) && (
                        <button
                          onClick={() => {
                            fetch('/api/reservations/notify', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                reservationId: r.id,
                                status: 'reminder',
                                restaurantId,
                                customerName: r.customer_name,
                                customerEmail: r.customer_email,
                                customerPhone: r.customer_phone,
                                date: r.reserved_date,
                                time: r.reserved_time,
                                partySize: r.party_size,
                              }),
                            }).catch(() => {});
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                          title={isEs ? 'Enviar recordatorio' : 'Send reminder'}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(r.id, 'no_show')}
                        disabled={updating === r.id}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        No-show
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All upcoming (not today) */}
      {reservations.filter(r => r.reserved_date > selectedDate).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {isEs ? 'Próximas reservaciones' : 'Upcoming reservations'}
          </p>
          <div className="space-y-2">
            {reservations
              .filter(r => r.reserved_date > selectedDate && r.status !== 'cancelled')
              .slice(0, 10)
              .map(r => {
                const cfg = STATUS_CONFIG[r.status];
                return (
                  <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-[10px] text-gray-400 uppercase">{formatDate(r.reserved_date, locale).split(',')[0]}</p>
                      <p className="text-sm font-bold text-gray-900">{new Date(r.reserved_date + 'T12:00:00').getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.customer_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatTime(r.reserved_time)}</span>
                        <span>·</span>
                        <span>{r.party_size} {isEs ? 'pers.' : 'guests'}</span>
                      </div>
                    </div>
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
                      {locale === 'es' ? cfg.label_es : cfg.label_en}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calendar Grid component ─────────────────────────────────────────────────

function CalendarGrid({ reservations, selectedDate, onSelectDate, locale }: {
  reservations: Reservation[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  locale: string;
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push(dateStr);
    }
    return cells;
  }, [calMonth]);

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (!map.has(r.reserved_date)) map.set(r.reserved_date, []);
      map.get(r.reserved_date)!.push(r);
    }
    return map;
  }, [reservations]);

  const today = new Date().toISOString().split('T')[0];
  const dayNames = locale === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthLabel = calMonth.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <p className="text-sm font-bold text-gray-900 capitalize">{monthLabel}</p>
        <button
          onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const rsvs = reservationsByDate.get(dateStr) ?? [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const pending = rsvs.filter(r => r.status === 'pending').length;
          const confirmed = rsvs.filter(r => r.status === 'confirmed').length;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'relative flex flex-col items-center justify-start py-1.5 min-h-[52px] rounded-lg text-xs font-semibold transition-colors',
                isSelected ? 'bg-[#05c8a7] text-white' : isToday ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50 text-gray-700'
              )}
            >
              <span>{parseInt(dateStr.split('-')[2], 10)}</span>
              {rsvs.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                  {pending > 0 && (
                    <span className={cn('px-1 py-0.5 rounded text-[9px] font-bold', isSelected ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700')}>
                      {pending}P
                    </span>
                  )}
                  {confirmed > 0 && (
                    <span className={cn('px-1 py-0.5 rounded text-[9px] font-bold', isSelected ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700')}>
                      {confirmed}C
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 mt-3 text-center">
        {locale === 'es' ? 'P = Pendiente · C = Confirmada' : 'P = Pending · C = Confirmed'}
      </p>
    </div>
  );
}
