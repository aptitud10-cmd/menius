'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList, Tag, ShoppingBag, QrCode, Settings, LogOut, Menu, X,
  ExternalLink, LayoutDashboard, Ticket, Users, BarChart3, CreditCard, Monitor, Contact2, Megaphone,
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
      { href: '/app/kds', label: 'Cocina (KDS)', icon: Monitor },
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
      { href: '/app/customers', label: 'Clientes', icon: Contact2 },
      { href: '/app/promotions', label: 'Promociones', icon: Ticket },
      { href: '/app/staff', label: 'Equipo', icon: Users },
    ],
  },
  {
    title: 'Negocio',
    items: [
      { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/app/marketing', label: 'Marketing', icon: Megaphone },
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
      <nav className="flex-1 flex flex-col gap-1">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={cn(si > 0 && 'mt-5')}>
            {section.title && (
              <p className="dash-label px-3 mb-2">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, (item as any).exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all relative',
                      active
                        ? 'bg-emerald-50 text-emerald-700 nav-item-active'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={cn(
                      'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                      active ? 'text-emerald-600' : 'text-gray-400'
                    )} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-0.5">
        <Link
          href={`/r/${slug}`}
          target="_blank"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ExternalLink className="w-[18px] h-[18px] text-gray-400" />
          Ver menú público
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <LogOut className="w-[18px] h-[18px] text-gray-400" />
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
          className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setOpen(false)} />
            <div className="fixed top-14 left-0 right-0 bottom-0 bg-white z-50 p-4 overflow-y-auto animate-fade-in">
              {navContent}
            </div>
          </>
        )}
      </>
    );
  }

  return navContent;
}
