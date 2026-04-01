'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList, Tag, ShoppingBag, QrCode, Settings, LogOut, Menu, X,
  ExternalLink, LayoutDashboard, Ticket, Users, BarChart3, CreditCard, Monitor, Contact2, Megaphone, Shield, Image, Star, Store, Boxes, Key, Gift, Building2, LifeBuoy, CalendarDays, Globe, Lock,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/actions/auth';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { DashboardTranslations } from '@/lib/dashboard-translations';

// Plan hierarchy: free < starter < pro < business
const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3 };
function meetsMin(planId: string, minPlan: string) {
  return (PLAN_RANK[planId] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  minPlan?: string; // minimum plan required to access
  badge?: string;   // badge text (e.g. 'Pro', 'Business')
};

function buildNavSections(t: DashboardTranslations, locale: string): { title: string | null; items: NavItem[] }[] {
  return [
    {
      title: null,
      items: [
        { href: '/app', label: t.nav_home, icon: LayoutDashboard, exact: true },
        { href: '/app/orders', label: t.nav_orders, icon: ClipboardList },
        { href: '/kds', label: t.nav_kds, icon: Monitor, minPlan: 'pro', badge: 'Pro' },
        { href: '/app/counter', label: t.nav_counter, icon: Store },
      ],
    },
    {
      title: t.nav_menu,
      items: [
        { href: '/app/menu/categories', label: t.nav_categories, icon: Tag },
        { href: '/app/menu/products', label: t.nav_products, icon: ShoppingBag },
        { href: '/app/menu/inventory', label: t.nav_inventory, icon: Boxes },
        { href: '/app/media', label: t.nav_gallery, icon: Image },
      ],
    },
    {
      title: t.nav_restaurant,
      items: [
        { href: '/app/tables', label: t.nav_tables, icon: QrCode },
        { href: '/app/reservations', label: locale === 'es' ? 'Reservaciones' : 'Reservations', icon: CalendarDays, minPlan: 'starter', badge: 'Starter' },
        { href: '/app/customers', label: t.nav_customers, icon: Contact2, minPlan: 'starter', badge: 'Starter' },
        { href: '/app/reviews', label: t.nav_reviews, icon: Star, minPlan: 'pro', badge: 'Pro' },
        { href: '/app/promotions', label: t.nav_promotions, icon: Ticket, minPlan: 'pro', badge: 'Pro' },
        { href: '/app/loyalty', label: t.nav_loyalty, icon: Gift, minPlan: 'pro', badge: 'Pro' },
        { href: '/app/staff', label: t.nav_staff, icon: Users, minPlan: 'starter', badge: 'Starter' },
      ],
    },
    {
      title: t.nav_business,
      items: [
        { href: '/app/analytics', label: t.nav_analytics, icon: BarChart3, minPlan: 'starter', badge: 'Starter' },
        { href: '/app/marketing', label: t.nav_marketing, icon: Megaphone, minPlan: 'pro', badge: 'Pro' },
        { href: '/app/business', label: locale === 'es' ? 'Mi Negocio' : 'My Business', icon: LayoutDashboard },
        { href: '/app/branches', label: t.nav_branches, icon: Building2, minPlan: 'business', badge: 'Business' },
        { href: '/app/billing', label: t.nav_billing, icon: CreditCard },
        { href: '/app/settings', label: t.nav_settings, icon: Settings },
        { href: '/app/settings/api-keys', label: 'API Keys', icon: Key, minPlan: 'business', badge: 'Business' },
        { href: '/app/settings/data', label: t.nav_dataPrivacy, icon: Shield },
      ],
    },
  ];
}

interface DashboardNavProps {
  slug: string;
  mobile?: boolean;
  planId?: string;
}

export function DashboardNav({ slug, mobile, planId = 'free' }: DashboardNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t, locale, setLocale } = useDashboardLocale();

  const navSections = useMemo(() => buildNavSections(t, locale), [t, locale]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navContent = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 flex flex-col gap-1">
        {navSections.map((section, si) => (
          <div key={si} className={cn(si > 0 && 'mt-5')}>
            {section.title && (
              <p className="dash-label px-3 mb-2">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, (item as any).exact);
                const locked = item.minPlan ? !meetsMin(planId, item.minPlan) : false;
                if (locked) {
                  return (
                    <Link
                      key={item.href}
                      href="/app/billing"
                      onClick={() => setOpen(false)}
                      title={item.badge ? `${item.badge} plan required` : 'Upgrade required'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-gray-400 hover:bg-gray-50 hover:text-gray-600 group"
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      <span className="flex-1 opacity-60">{item.label}</span>
                      <span className="flex items-center gap-1">
                        {item.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 leading-none">
                            {item.badge}
                          </span>
                        )}
                        <Lock className="w-3 h-3 text-gray-300 group-hover:text-violet-400 transition-colors" />
                      </span>
                    </Link>
                  );
                }
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
          href={`/${slug}`}
          target="_blank"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ExternalLink className="w-[18px] h-[18px] text-gray-400" />
          {t.nav_viewMenu}
        </Link>
        <Link
          href="/support"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <LifeBuoy className="w-[18px] h-[18px] text-gray-400" />
          {t.nav_support}
        </Link>
        <button
          onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full text-left"
          title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        >
          <Globe className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" />
          <span className="flex-1">
            {locale === 'es' ? 'Idioma · Español' : 'Language · English'}
          </span>
          <span className="text-[11px] text-gray-400 font-normal">
            {locale === 'es' ? '→ EN' : '→ ES'}
          </span>
        </button>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <LogOut className="w-[18px] h-[18px] text-gray-400" />
          {t.nav_logout}
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
          aria-label={open ? t.nav_closeMenu : t.nav_openMenu}
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
