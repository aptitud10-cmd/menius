'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Tag, ShoppingBag, QrCode, Settings, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/actions/auth';

const NAV_ITEMS = [
  { href: '/app/orders', label: 'Órdenes', icon: ClipboardList },
  { href: '/app/menu/categories', label: 'Categorías', icon: Tag },
  { href: '/app/menu/products', label: 'Productos', icon: ShoppingBag },
  { href: '/app/tables', label: 'Mesas & QRs', icon: QrCode },
];

interface DashboardNavProps {
  slug: string;
  mobile?: boolean;
}

export function DashboardNav({ slug, mobile }: DashboardNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1">
        <Link
          href={`/r/${slug}`}
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ver menú público
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  if (mobile) {
    return (
      <>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-100">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        {open && (
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-100 p-4 shadow-lg z-50">
            {navContent}
          </div>
        )}
      </>
    );
  }

  return navContent;
}
