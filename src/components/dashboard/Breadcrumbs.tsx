'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  app: 'Inicio',
  orders: 'Órdenes',
  kds: 'Cocina',
  menu: 'Menú',
  categories: 'Categorías',
  products: 'Productos',
  tables: 'Mesas & QRs',
  customers: 'Clientes',
  promotions: 'Promociones',
  staff: 'Equipo',
  analytics: 'Analytics',
  marketing: 'Marketing',
  billing: 'Facturación',
  settings: 'Configuración',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: LABELS[seg] || seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1.5 text-[13px] mb-5" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <Fragment key={crumb.href}>
          {i > 0 && <span className="text-gray-300 select-none">/</span>}
          {crumb.isLast ? (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
