import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-300', bg: 'bg-amber-500/[0.12]' },
  confirmed: { label: 'Confirmada', color: 'text-blue-300', bg: 'bg-blue-500/[0.12]' },
  preparing: { label: 'Preparando', color: 'text-violet-300', bg: 'bg-violet-500/[0.12]' },
  ready: { label: 'Lista', color: 'text-emerald-300', bg: 'bg-emerald-500/[0.12]' },
  delivered: { label: 'Entregada', color: 'text-gray-400', bg: 'bg-white/[0.06]' },
  cancelled: { label: 'Cancelada', color: 'text-red-300', bg: 'bg-red-500/[0.12]' },
};
