import { Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { Order } from '@/types';
import { type CounterText, kindLabel, orderKind } from './ui';

/**
 * Tipo de pedido: color + ícono + palabra (nunca solo color — WCAG 1.4.1).
 * Delivery = azul + moto · Recoger = violeta + bolsa · Mesa = negro + cubiertos.
 * Estos tres colores se reservan SOLO para el tipo de pedido.
 */
export function KindTag({ order, T, size = 'md' }: { order: Order; T: CounterText; size?: 'md' | 'lg' }) {
  const kind = orderKind(order);
  const Icon = kind.key === 'delivery' ? Bike : kind.key === 'pickup' ? ShoppingBag : UtensilsCrossed;
  const lg = size === 'lg';
  return (
    <span
      className={lg
        ? 'inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-[17px] font-extrabold tracking-wide whitespace-nowrap'
        : 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[14px] font-extrabold tracking-wide whitespace-nowrap'}
      style={{ background: kind.color, color: kind.fg }}
    >
      <Icon className={lg ? 'w-5 h-5' : 'w-4 h-4'} strokeWidth={2.5} aria-hidden />
      {kindLabel(order, T)}
    </span>
  );
}
