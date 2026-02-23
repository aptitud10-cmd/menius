'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, ClipboardList, Monitor, Tag, ShoppingBag,
  QrCode, Contact2, Ticket, Users, BarChart3, Megaphone, CreditCard,
  Settings, Plus, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  keywords?: string;
}

const NAV_ITEMS: PaletteItem[] = [
  { id: 'home', label: 'Inicio', section: 'Navegación', icon: LayoutDashboard, href: '/app' },
  { id: 'orders', label: 'Órdenes', section: 'Navegación', icon: ClipboardList, href: '/app/orders', keywords: 'pedidos' },
  { id: 'kds', label: 'Cocina (KDS)', section: 'Navegación', icon: Monitor, href: '/app/kds', keywords: 'kitchen display' },
  { id: 'categories', label: 'Categorías', section: 'Navegación', icon: Tag, href: '/app/menu/categories' },
  { id: 'products', label: 'Productos', section: 'Navegación', icon: ShoppingBag, href: '/app/menu/products', keywords: 'menu platos' },
  { id: 'tables', label: 'Mesas & QRs', section: 'Navegación', icon: QrCode, href: '/app/tables' },
  { id: 'customers', label: 'Clientes', section: 'Navegación', icon: Contact2, href: '/app/customers' },
  { id: 'promotions', label: 'Promociones', section: 'Navegación', icon: Ticket, href: '/app/promotions', keywords: 'descuentos cupones' },
  { id: 'staff', label: 'Equipo', section: 'Navegación', icon: Users, href: '/app/staff', keywords: 'empleados personal' },
  { id: 'analytics', label: 'Analytics', section: 'Navegación', icon: BarChart3, href: '/app/analytics', keywords: 'estadisticas reportes' },
  { id: 'marketing', label: 'Marketing', section: 'Navegación', icon: Megaphone, href: '/app/marketing' },
  { id: 'billing', label: 'Facturación', section: 'Navegación', icon: CreditCard, href: '/app/billing', keywords: 'plan suscripcion pago' },
  { id: 'settings', label: 'Configuración', section: 'Navegación', icon: Settings, href: '/app/settings', keywords: 'ajustes config' },
];

const ACTION_ITEMS: PaletteItem[] = [
  { id: 'new-product', label: 'Crear producto', section: 'Acciones', icon: Plus, href: '/app/menu/products', keywords: 'nuevo agregar plato' },
  { id: 'new-category', label: 'Crear categoría', section: 'Acciones', icon: Plus, href: '/app/menu/categories', keywords: 'nueva agregar' },
  { id: 'new-table', label: 'Crear mesa', section: 'Acciones', icon: Plus, href: '/app/tables', keywords: 'nueva agregar qr' },
];

const ALL_ITEMS = [...NAV_ITEMS, ...ACTION_ITEMS];

export function CommandPalette({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) {
        setQuery('');
        setActiveIdx(0);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? ALL_ITEMS.filter(item => {
        const searchable = `${item.label} ${item.keywords || ''} ${item.section}`.toLowerCase();
        return q.split(' ').every(word => searchable.includes(word));
      })
    : ALL_ITEMS;

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const select = (item: PaletteItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      select(filtered[activeIdx]);
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  if (!open) return null;

  const sections = Array.from(new Set(filtered.map(i => i.section)));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        style={{ animation: 'fadeIn 0.1s ease-out both' }}
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl z-[61] border border-gray-200"
        style={{ animation: 'scaleIn 0.1s ease-out both' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar o ir a..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            sections.map(section => {
              const items = filtered.filter(i => i.section === section);
              return (
                <div key={section}>
                  <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {section}
                  </p>
                  {items.map(item => {
                    const globalIdx = filtered.indexOf(item);
                    const isActive = globalIdx === activeIdx;
                    return (
                      <button
                        key={item.id}
                        data-active={isActive}
                        onClick={() => select(item)}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        <item.icon className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isActive ? 'text-emerald-500' : 'text-gray-400',
                        )} />
                        <span className="flex-1">{item.label}</span>
                        {item.href && (
                          <span className="text-[10px] text-gray-300 font-mono">
                            {item.href.replace('/app', '')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-gray-200 font-mono">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-gray-200 font-mono">↵</kbd> ir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-gray-200 font-mono">esc</kbd> cerrar
          </span>
        </div>
      </div>
    </>
  );
}
