import { Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { Order } from '@/types';
import { type CounterText, kindLabel, orderKind } from './ui';

/**
 * Tipo de pedido: ícono + palabra en el color del tipo, sin cápsula (nunca solo
 * color — WCAG 1.4.1). Delivery = azul + moto · Recoger = índigo + bolsa ·
 * Mesa = tinta + cubiertos. Estos colores se reservan SOLO para el tipo de pedido.
 */
export function KindTag({ order, T, size = 'md', color }: {
  order: Order; T: CounterText; size?: 'md' | 'lg';
  /** Fuerza el color (p. ej. sobre el destello de la alerta, donde el azul no se lee). */
  color?: string;
}) {
  const kind = orderKind(order);
  const Icon = kind.key === 'delivery' ? Bike : kind.key === 'pickup' ? ShoppingBag : UtensilsCrossed;
  const lg = size === 'lg';
  return (
    <span
      className={lg
        ? 'inline-flex items-center gap-2 text-[22px] font-semibold whitespace-nowrap'
        : 'inline-flex items-center gap-1.5 text-[16px] font-semibold whitespace-nowrap'}
      style={{ color: color ?? kind.color, transition: 'color .4s' }}
    >
      <Icon className={lg ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]'} strokeWidth={2.2} aria-hidden />
      {kindLabel(order, T)}
    </span>
  );
}
