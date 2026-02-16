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
  pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirmed: { label: 'Confirmada', color: 'text-blue-700', bg: 'bg-blue-100' },
  preparing: { label: 'Preparando', color: 'text-violet-700', bg: 'bg-violet-100' },
  ready: { label: 'Lista', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  delivered: { label: 'Entregada', color: 'text-gray-600', bg: 'bg-gray-100' },
  cancelled: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-100' },
};
