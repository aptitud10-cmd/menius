import { describe, it, expect, beforeAll } from 'vitest';
import {
  allowedByHistory,
  cadenceDays,
  canReceiveMarketing,
  enabledKinds,
  isSendTime,
  localHour,
  pickLifecycle,
  preferredSendHour,
  usualDueDays,
} from '@/lib/marketing/lifecycle';
import { buildLifecycleEmail, type LifecycleEmailInput } from '@/lib/marketing/emails';
import { choosePicks, summarizeOrder, type OrderItemRow } from '@/lib/marketing/lifecycle-data';

const DAY = 24 * 3600_000;
const NOW = Date.parse('2026-11-24T16:00:00Z');
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();
const orders = (...daysAgo: number[]) => daysAgo.map((d, i) => ({ id: `o${i}`, createdAt: ago(d) }));

describe('consentimiento', () => {
  it('solo con marketing_opt_in y sin baja', () => {
    expect(canReceiveMarketing(['marketing_opt_in'])).toBe(true);
    expect(canReceiveMarketing(['marketing_opt_in', 'unsubscribed'])).toBe(false);
    expect(canReceiveMarketing([])).toBe(false);
    expect(canReceiveMarketing(null)).toBe(false);
  });
  it('automatizaciones prendidas desde restaurants.tags (jsonb)', () => {
    expect(enabledKinds(['mkt:usual', 'setup_email_sent', 'mkt:winback'])).toEqual(['usual', 'winback']);
    expect(enabledKinds(null)).toEqual([]);
    expect(enabledKinds({})).toEqual([]);
  });
});

describe('qué email le toca', () => {
  it('un solo pedido: "¿repetimos?" entre los días 7 y 21', () => {
    expect(pickLifecycle(orders(6), NOW)).toBeNull();
    expect(pickLifecycle(orders(7), NOW)).toEqual({ kind: 'second_visit', anchorOrderId: 'o0' });
    expect(pickLifecycle(orders(20), NOW)?.kind).toBe('second_visit');
    expect(pickLifecycle(orders(30), NOW)).toBeNull();
  });
  it('cliente frecuente: "lo de siempre" cuando se atrasa respecto a SU ritmo', () => {
    // Pide cada 10 días → le toca a los 15.
    expect(cadenceDays(orders(14, 24, 34))).toBeCloseTo(10, 5);
    expect(usualDueDays(10)).toBe(15);
    expect(pickLifecycle(orders(14, 24, 34), NOW)).toBeNull();
    expect(pickLifecycle(orders(15, 25, 35), NOW)?.kind).toBe('usual');
    // Pide todos los días → nunca antes de 10.
    expect(usualDueDays(1)).toBe(10);
    expect(pickLifecycle(orders(9, 10, 11), NOW)).toBeNull();
    expect(pickLifecycle(orders(10, 11, 12), NOW)?.kind).toBe('usual');
  });
  it('45 a 75 días: "te extrañamos"; después, silencio', () => {
    expect(pickLifecycle(orders(45, 60), NOW)?.kind).toBe('winback');
    expect(pickLifecycle(orders(50), NOW)?.kind).toBe('winback');
    expect(pickLifecycle(orders(75, 90), NOW)).toBeNull();
    expect(pickLifecycle(orders(200), NOW)).toBeNull();
  });
  it('sin pedidos no hay nada', () => {
    expect(pickLifecycle([], NOW)).toBeNull();
  });
});

describe('topes', () => {
  const pick = { kind: 'usual' as const, anchorOrderId: 'o0' };
  it('el mismo email no sale dos veces para el mismo último pedido', () => {
    expect(allowedByHistory(pick, [{ orderId: 'o0', event: 'mkt_usual', createdAt: ago(30) }], NOW)).toBe(false);
    // Para otro pedido anterior sí cuenta como historia vieja, no bloquea.
    expect(allowedByHistory(pick, [{ orderId: 'o1', event: 'mkt_usual', createdAt: ago(30) }], NOW)).toBe(true);
  });
  it('máximo uno de marketing cada 7 días', () => {
    expect(allowedByHistory(pick, [{ orderId: 'o1', event: 'mkt_second_visit', createdAt: ago(6) }], NOW)).toBe(false);
    expect(allowedByHistory(pick, [{ orderId: 'o1', event: 'mkt_second_visit', createdAt: ago(8) }], NOW)).toBe(true);
  });
  it('no a menos de 3 días de un pedido de reseña', () => {
    expect(allowedByHistory(pick, [{ orderId: 'o0', event: 'review_request_email', createdAt: ago(2) }], NOW)).toBe(false);
    expect(allowedByHistory(pick, [{ orderId: 'o0', event: 'review_request_email', createdAt: ago(4) }], NOW)).toBe(true);
  });
});

describe('hora de envío', () => {
  it('una hora antes de la que suele pedir, dentro de 10–18', () => {
    expect(preferredSendHour([13, 13, 19])).toBe(12);
    expect(preferredSendHour([8])).toBe(10);
    expect(preferredSendHour([23, 23])).toBe(18);
    expect(preferredSendHour([])).toBe(11);
  });
  it('no se escribe antes de su hora ni después de las 19:59', () => {
    expect(isSendTime(11, 12)).toBe(false);
    expect(isSendTime(12, 12)).toBe(true);
    expect(isSendTime(19, 12)).toBe(true);
    expect(isSendTime(20, 12)).toBe(false);
  });
  it('hora local del restaurante', () => {
    expect(localHour(Date.parse('2026-11-24T16:30:00Z'), 'America/New_York')).toBe(11);
    expect(localHour(Date.parse('2026-11-24T16:30:00Z'), 'Zona/Inventada')).toBe(16);
  });
});

describe('platos', () => {
  const row = (product_id: string, name: string, qty: number, total: number, image: string | null): OrderItemRow => ({
    order_id: 'o0', product_id, qty, line_total: total, product_name: name,
    products: { name, image_url: image, hide_image: false, price: total / qty },
  });
  it('agrupa el mismo plato y elige como foto el más caro que tenga foto', () => {
    const s = summarizeOrder([row('a', 'Coffee', 1, 3, null), row('b', 'Burger', 1, 14, 'https://x/b.jpg'), row('b', 'Burger', 1, 14, 'https://x/b.jpg')]);
    expect(s.lastItems).toEqual([{ qty: 2, name: 'Burger' }, { qty: 1, name: 'Coffee' }]);
    expect(s.heroDish?.imageUrl).toBe('https://x/b.jpg');
  });
  it('sugerencias: nunca algo que ya pidió; en "te extrañamos", lo nuevo primero', () => {
    const p = (id: string, created: number) => ({ id, name: id, price: 10, image_url: `https://x/${id}.jpg`, hide_image: false, created_at: ago(created) });
    const pool = { popular: [p('a', 300), p('b', 300), p('c', 300), p('d', 300)], newest: [p('n1', 5), p('n2', 9), p('a', 300)] };
    const second = choosePicks(pool, 'second_visit', new Set(['a']), ago(10));
    expect(second.picks.map((d) => d.name)).toEqual(['b', 'c', 'd']);
    const win = choosePicks(pool, 'winback', new Set(), ago(50));
    expect(win).toMatchObject({ picksAreNew: true });
    expect(win.picks.map((d) => d.name)).toEqual(['n1', 'n2']);
    expect(choosePicks(pool, 'usual', new Set(), ago(20)).picks).toEqual([]);
  });
});

describe('emails', () => {
  beforeAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  });
  const input = (kind: LifecycleEmailInput['kind'], locale: 'es' | 'en' = 'en'): LifecycleEmailInput => ({
    kind,
    locale,
    restaurant: { name: 'Buccaneer Diner', address: '93-01 Astoria Blvd, NY', phone: '+17184295188', logoUrl: null, timezone: 'America/New_York', brandColor: null, currency: 'USD', canReply: true },
    customerName: 'Maria <b>Lopez</b>',
    menuUrl: 'https://menius.app/buccaneer',
    repeatUrl: 'https://menius.app/buccaneer?repeat=abc&t=def',
    unsubscribeUrl: 'https://menius.app/api/unsubscribe?c=1&s=2',
    lastItems: [{ qty: 1, name: 'Cheeseburger Deluxe' }, { qty: 2, name: 'Coffee' }],
    heroDish: { name: 'Cheeseburger Deluxe', price: null, imageUrl: 'https://x/b.jpg' },
    picks: [{ name: 'Gyro', price: 12.5, imageUrl: 'https://x/g.jpg' }],
    picksAreNew: false,
  });

  for (const kind of ['second_visit', 'usual', 'winback'] as const) {
    for (const locale of ['en', 'es'] as const) {
      it(`${kind}/${locale}: baja, dirección, botón de repetir y asunto limpio`, () => {
        const e = buildLifecycleEmail(input(kind, locale));
        expect(e.html).toContain('/api/unsubscribe?c=1&amp;s=2');
        expect(e.html).toContain('93-01 Astoria Blvd');
        expect(e.html).toContain('repeat=abc&amp;t=def');
        // Sin emojis ni HTML en el asunto.
        expect(Array.from(e.subject).some((ch) => (ch.codePointAt(0) ?? 0) >= 0x2600)).toBe(false);
        expect(e.subject).not.toContain('<');
        // El nombre del cliente se escapa en el cuerpo.
        expect(e.html).not.toContain('<b>Lopez</b>');
      });
    }
  }
  it('"te extrañamos" promete que es el último', () => {
    expect(buildLifecycleEmail(input('winback')).html).toContain("This is the only reminder we'll send");
    expect(buildLifecycleEmail(input('winback', 'es')).html).toContain('Es el único recordatorio');
  });
});
