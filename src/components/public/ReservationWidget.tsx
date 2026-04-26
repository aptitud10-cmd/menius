'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Users, CheckCircle } from 'lucide-react';
import { getTranslations } from '@/lib/translations';

interface ReservationWidgetProps {
  restaurantId: string;
  locale?: string;
}

export function ReservationWidget({ restaurantId, locale = 'es' }: ReservationWidgetProps) {
  const t = getTranslations(locale);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !time) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          customer_name: name.trim(),
          customer_phone: phone.trim() || undefined,
          customer_email: email.trim() || undefined,
          party_size: partySize,
          reserved_date: date,
          reserved_time: time,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDone(true);
      }
    } catch {
      setError(t.reservationConnectionError);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <section className="mt-8 mb-6">
        <div className="bg-[#e6faf7] border border-[#b3efe6] rounded-2xl p-6 text-center">
          <CheckCircle className="w-10 h-10 text-[#05c8a7] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#047a65]">
            {t.reservationSubmitted}
          </h3>
          <p className="text-sm text-[#047a65] mt-1">
            {t.reservationConfirmDesc}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 mb-6">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-[#05c8a7]" />
        {t.reserveTable}
      </h3>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            {t.labelName}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder={t.labelNamePlaceholder}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
          />
        </div>

        {/* Party size + date + time */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1.5">
              <Users className="w-3.5 h-3.5" />
              {t.labelGuests}
            </label>
            <select
              value={partySize}
              onChange={e => setPartySize(Number(e.target.value))}
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 focus:outline-none focus:border-gray-900 bg-white"
            >
              {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {t.labelDate}
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t.labelTime}
            </label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 focus:outline-none focus:border-gray-900 bg-white"
            >
              <option value="">{t.labelTimeSelect}</option>
              {Array.from({ length: 28 }, (_, i) => {
                const totalMin = 12 * 60 + i * 30;
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
                const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return (
                  <option key={val} value={val}>
                    {h12}:{String(m).padStart(2, '0')} {ampm}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {t.labelPhone}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {t.labelEmail}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            {t.labelNotes}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t.labelNotesPlaceholder}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !date || !time}
          className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t.reservationSubmitting : t.reservationBookTable}
        </button>
      </form>
    </section>
  );
}
