'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList, Tag, ShoppingBag, QrCode, Settings, LogOut, Menu, X,
  ExternalLink, LayoutDashboard, Ticket, Users, BarChart3, CreditCard,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/actions/auth';

const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { href: '/app', label: 'Inicio', icon: LayoutDashboard, exact: true },
      { href: '/app/orders', label: 'Órdenes', icon: ClipboardList },
    ],
  },
  {
    title: 'Menú',
    items: [
      { href: '/app/menu/categories', label: 'Categorías', icon: Tag },
      { href: '/app/menu/products', label: 'Productos', icon: ShoppingBag },
    ],
  },
  {
    title: 'Restaurante',
    items: [
      { href: '/app/tables', label: 'Mesas & QRs', icon: QrCode },
      { href: '/app/promotions', label: 'Promociones', icon: Ticket },
      { href: '/app/staff', label: 'Equipo', icon: Users },
    ],
  },
  {
    title: 'Negocio',
    items: [
      { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/app/billing', label: 'Facturación', icon: CreditCard },
      { href: '/app/settings', label: 'Configuración', icon: Settings },
    ],
  },
];

interface DashboardNavProps {
  slug: string;
  mobile?: boolean;
}

export function DashboardNav({ slug, mobile }: DashboardNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navContent = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={cn(si > 0 && 'mt-4')}>
            {section.title && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive(item.href, (item as any).exact)
                    ? 'bg-purple-500/[0.12] text-white'
                    : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
                )}
              >
                <item.icon className={cn(
                  'w-4 h-4 transition-colors',
                  isActive(item.href, (item as any).exact) ? 'text-purple-400' : 'text-gray-600'
                )} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col gap-0.5">
        <Link
          href={`/r/${slug}`}
          target="_blank"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-white/[0.04] hover:text-gray-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-gray-600" />
          Ver menú público
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-500/[0.08] hover:text-red-400 transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4 text-gray-600" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
        >
          {open ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
            <div className="fixed top-14 left-0 right-0 bottom-0 bg-[#0a0a0a] z-50 p-4 overflow-y-auto">
              {navContent}
            </div>
          </>
        )}
      </>
    );
  }

  return navContent;
}
