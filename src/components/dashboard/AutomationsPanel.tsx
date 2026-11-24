'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, Eye, HeartHandshake, Loader2, MailCheck, Repeat, Send, ShieldCheck, X } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { LifecycleKind } from '@/lib/marketing/lifecycle';

interface Props {
  notificationsEnabled: boolean;
  hasEmail: boolean;
}

interface Status {
  enabled: LifecycleKind[];
  hasAddress: boolean;
  currency: string;
  audience: { withEmail: number; optedIn: number; unsubscribed: number };
  last30: { sent: number; sentByKind: Record<LifecycleKind, number>; returnedOrders: number; returnedRevenue: number };
}

const COPY = {
  es: {
    title: 'Emails que traen clientes de vuelta',
    intro: 'Se envían solos, con el nombre de tu restaurante, a partir de lo que cada cliente pidió de verdad. Solo a quien marcó "Quiero recibir ofertas" al pedir.',
    optedIn: 'Aceptan ofertas',
    ofEmail: (n: number) => `de ${n} con email`,
    sent: 'Enviados',
    last30: 'últimos 30 días',
    returned: 'Volvieron a pedir',
    returnedSub: (money: string) => `${money} en pedidos`,
    on: 'Activa',
    off: 'Apagada',
    preview: 'Ver ejemplo',
    sentN: (n: number) => `${n} enviados en 30 días`,
    noAddress: 'Para prender estas automatizaciones, carga la dirección del restaurante en Ajustes. La ley (CAN-SPAM) exige una dirección física en todo email de ofertas.',
    notifOff: 'Los avisos por email están apagados en Ajustes → Notificaciones: no sale ningún email hasta que los prendas.',
    error: 'No se pudo guardar. Inténtalo de nuevo.',
    rulesTitle: 'Reglas que cuidan a tus clientes (y que no te marquen como spam)',
    rules: [
      'Solo a quien aceptó recibir ofertas; se puede dar de baja con un toque.',
      'Máximo un email de ofertas por semana por persona.',
      'Si vuelve a pedir, la secuencia se corta sola.',
      'Llega a la hora en que esa persona suele pedir, nunca de noche.',
      'Después de 75 días sin pedir, no se le escribe más.',
    ],
    alwaysTitle: 'Avisos del pedido (siempre activos)',
    always: ['Recibo del pedido', 'Hora para recoger o entregar', 'Listo / en camino', 'Pedido de reseña (uno por semana como mucho)'],
    inbox: 'Así se ve en la bandeja de entrada',
    close: 'Cerrar',
    sendTest: 'Enviarme una prueba',
    sendingTest: 'Enviando…',
    testSent: (to: string) => `Enviado a ${to}. Revisa tu bandeja (y Promociones, si usas Gmail).`,
    testError: 'No se pudo enviar la prueba. Inténtalo en un rato.',
    testLimit: 'Llegaste al máximo de pruebas por hora.',
    kinds: {
      second_visit: {
        title: '¿Repetimos?',
        when: '7 a 10 días después del primer pedido',
        desc: 'Le muestra su plato con foto y un botón que vuelve a armar el pedido en un toque, más 3 platos populares que todavía no probó.',
      },
      usual: {
        title: 'Lo de siempre',
        when: 'Cuando un cliente frecuente se atrasa respecto a su ritmo',
        desc: 'Si alguien pide cada 10 días y ya van 15, le recuerda su pedido de siempre. Un toque y está en el carrito.',
      },
      winback: {
        title: 'Te extrañamos',
        when: 'A los 45 días sin pedir, una sola vez',
        desc: 'Un mensaje cálido con lo nuevo del menú (o lo más pedido). Es el último: después no se insiste.',
      },
    },
  },
  en: {
    title: 'Emails that bring customers back',
    intro: "Sent automatically under your restaurant's name, based on what each customer actually ordered. Only to people who checked \"Email me offers\" when ordering.",
    optedIn: 'Accept offers',
    ofEmail: (n: number) => `of ${n} with email`,
    sent: 'Sent',
    last30: 'last 30 days',
    returned: 'Ordered again',
    returnedSub: (money: string) => `${money} in orders`,
    on: 'On',
    off: 'Off',
    preview: 'See example',
    sentN: (n: number) => `${n} sent in 30 days`,
    noAddress: "To turn these on, add your restaurant's address in Settings. The law (CAN-SPAM) requires a physical address in every offers email.",
    notifOff: 'Email notifications are off in Settings → Notifications: no email goes out until you turn them on.',
    error: "Couldn't save. Please try again.",
    rulesTitle: 'Rules that protect your customers (and keep you out of spam)',
    rules: [
      'Only to people who agreed to receive offers; one tap to unsubscribe.',
      'At most one offers email per person per week.',
      'If they order again, the sequence stops on its own.',
      'Arrives around the time that person usually orders, never at night.',
      'After 75 days without ordering, we stop writing.',
    ],
    alwaysTitle: 'Order updates (always on)',
    always: ['Order receipt', 'Pickup or delivery time', 'Ready / on the way', 'Review request (at most one a week)'],
    inbox: 'How it looks in the inbox',
    close: 'Close',
    sendTest: 'Send me a test',
    sendingTest: 'Sending…',
    testSent: (to: string) => `Sent to ${to}. Check your inbox (and Promotions, if you use Gmail).`,
    testError: "Couldn't send the test. Try again in a bit.",
    testLimit: "You've reached the hourly limit for tests.",
    kinds: {
      second_visit: {
        title: 'Order again?',
        when: '7 to 10 days after the first order',
        desc: 'Shows their dish with a photo and a button that rebuilds the order in one tap, plus 3 popular dishes they haven’t tried.',
      },
      usual: {
        title: 'The usual',
        when: 'When a regular falls behind their own rhythm',
        desc: 'If someone orders every 10 days and it’s been 15, it reminds them of their usual. One tap and it’s in the cart.',
      },
      winback: {
        title: 'We miss you',
        when: 'After 45 days without ordering, only once',
        desc: 'A warm note with what’s new on the menu (or what’s popular). It’s the last one: no chasing after that.',
      },
    },
  },
};

const ICONS: Record<LifecycleKind, typeof Repeat> = { second_visit: Repeat, usual: CalendarClock, winback: HeartHandshake };
const ORDER: LifecycleKind[] = ['second_visit', 'usual', 'winback'];

export function AutomationsPanel({ notificationsEnabled }: Props) {
  const { locale } = useDashboardLocale();
  const c = locale === 'en' ? COPY.en : COPY.es;
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState<LifecycleKind | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [preview, setPreview] = useState<LifecycleKind | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/tenant/marketing-automations')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Status) => alive && setStatus(d))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback(async (kind: LifecycleKind, enabled: boolean) => {
    setSaving(kind);
    setSaveError(false);
    try {
      const r = await fetch('/api/tenant/marketing-automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, enabled }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { enabled: LifecycleKind[] };
      setStatus((s) => (s ? { ...s, enabled: d.enabled } : s));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(null);
    }
  }, []);

  if (loadError) {
    return <p className="text-sm text-red-600">{c.error}</p>;
  }
  if (!status) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const blocked = !status.hasAddress;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">{c.intro}</p>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
          <Stat label={c.optedIn} value={String(status.audience.optedIn)} sub={c.ofEmail(status.audience.withEmail)} />
          <Stat label={c.sent} value={String(status.last30.sent)} sub={c.last30} />
          <Stat
            label={c.returned}
            value={String(status.last30.returnedOrders)}
            sub={c.returnedSub(formatPrice(status.last30.returnedRevenue, status.currency))}
            accent
          />
        </div>
      </section>

      {(blocked || !notificationsEnabled) && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
          {blocked ? c.noAddress : c.notifOff}
        </p>
      )}
      {saveError && <p className="text-sm text-red-600">{c.error}</p>}

      <section className="space-y-3">
        {ORDER.map((kind) => {
          const k = c.kinds[kind];
          const Icon = ICONS[kind];
          const on = status.enabled.includes(kind);
          const busy = saving === kind;
          return (
            <div
              key={kind}
              className={cn(
                'rounded-2xl border bg-white p-4 sm:p-5 transition-colors',
                on ? 'border-emerald-200' : 'border-gray-200',
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                    on ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900">{k.title}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{k.when}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={k.title}
                      disabled={busy || (!on && blocked)}
                      onClick={() => toggle(kind, !on)}
                      className={cn(
                        'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50',
                        on ? 'bg-emerald-500' : 'bg-gray-300',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                          on ? 'translate-x-6' : 'translate-x-1',
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{k.desc}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setPreview(kind)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 min-h-[44px] sm:min-h-0"
                    >
                      <Eye className="w-4 h-4" /> {c.preview}
                    </button>
                    <span className={cn('text-xs font-medium', on ? 'text-emerald-700' : 'text-gray-400')}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : on ? c.on : c.off}
                      {status.last30.sentByKind[kind] > 0 && ` · ${c.sentN(status.last30.sentByKind[kind])}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> {c.rulesTitle}
          </p>
          <ul className="mt-3 space-y-2">
            {c.rules.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <MailCheck className="w-4 h-4 text-emerald-600" /> {c.alwaysTitle}
          </p>
          <ul className="mt-3 space-y-2">
            {c.always.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {preview && <PreviewDialog kind={preview} locale={locale === 'en' ? 'en' : 'es'} copy={c} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-3 sm:p-4 min-w-0', accent ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-200')}>
      <p className="text-[10.5px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 leading-tight">{label}</p>
      <p className={cn('text-xl sm:text-2xl font-bold mt-1 tabular-nums', accent ? 'text-emerald-800' : 'text-gray-900')}>{value}</p>
      <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-snug">{sub}</p>
    </div>
  );
}

function PreviewDialog({
  kind,
  locale,
  copy,
  onClose,
}: {
  kind: LifecycleKind;
  locale: 'es' | 'en';
  copy: (typeof COPY)['es'] | (typeof COPY)['en'];
  onClose: () => void;
}) {
  const [lang, setLang] = useState<'es' | 'en'>(locale);
  const [email, setEmail] = useState<{ subject: string; preheader: string; html: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [test, setTest] = useState<{ state: 'idle' | 'sending' | 'sent' | 'error' | 'limit'; to?: string }>({ state: 'idle' });

  const sendTest = async () => {
    setTest({ state: 'sending' });
    try {
      const r = await fetch('/api/tenant/marketing-automations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, locale: lang }),
      });
      if (r.status === 429) return setTest({ state: 'limit' });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { sentTo: string };
      setTest({ state: 'sent', to: d.sentTo });
    } catch {
      setTest({ state: 'error' });
    }
  };

  useEffect(() => {
    let alive = true;
    setEmail(null);
    setFailed(false);
    fetch(`/api/tenant/marketing-automations/preview?kind=${kind}&locale=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setEmail(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [kind, lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.kinds[kind].title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[560px] max-h-[92vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900 truncate">{copy.kinds[kind].title}</p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
              {(['en', 'es'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn('px-2.5 py-1.5 rounded-md', lang === l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
                >
                  {l === 'en' ? 'English' : 'Español'}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} aria-label={copy.close} className="p-2 -mr-2 text-gray-500 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {email && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{copy.inbox}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{email.subject}</p>
            <p className="text-sm text-gray-500 truncate">{email.preheader}</p>
          </div>
        )}

        <div className="flex-1 min-h-[60vh] bg-[#F2F4F3]">
          {failed ? (
            <p className="p-6 text-sm text-red-600">{copy.error}</p>
          ) : email ? (
            <iframe title={email.subject} srcDoc={email.html} sandbox="" className="w-full h-full min-h-[60vh] border-0" />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[60vh] text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={sendTest}
            disabled={!email || test.state === 'sending'}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 flex-shrink-0"
          >
            {test.state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {test.state === 'sending' ? copy.sendingTest : copy.sendTest}
          </button>
          <p
            aria-live="polite"
            className={cn('text-xs leading-snug', test.state === 'error' || test.state === 'limit' ? 'text-red-600' : 'text-gray-500')}
          >
            {test.state === 'sent' && test.to ? copy.testSent(test.to) : test.state === 'error' ? copy.testError : test.state === 'limit' ? copy.testLimit : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
