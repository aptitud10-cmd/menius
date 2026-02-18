import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { DashboardLocaleProvider } from '@/hooks/use-dashboard-locale';
import { LocaleSwitcher } from '@/components/dashboard/LocaleSwitcher';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, slug, locale')
    .eq('id', profile.default_restaurant_id)
    .single();

  const initials = (profile.full_name || user.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const defaultLocale = (restaurant?.locale === 'en' ? 'en' : 'es') as 'es' | 'en';

  return (
    <DashboardLocaleProvider defaultLocale={defaultLocale}>
      <div className="min-h-screen bg-[#050505] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-60 bg-[#0a0a0a] border-r border-white/[0.06] sticky top-0 h-screen">
          <div className="p-4 pb-2">
            <Link href="/app" className="text-lg font-bold tracking-tight font-heading text-white">
              MENIUS
            </Link>
            <p className="text-xs text-gray-600 mt-1 truncate">{restaurant?.name ?? 'Mi Restaurante'}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
            <DashboardNav slug={restaurant?.slug ?? ''} />
          </div>

          <div className="p-4 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-500/[0.15] text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-300 truncate">{profile.full_name || 'Sin nombre'}</p>
                  <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
                </div>
              </div>
              <LocaleSwitcher />
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden bg-[#0a0a0a] border-b border-white/[0.06] px-4 h-14 flex items-center justify-between sticky top-0 z-30">
            <Link href="/app" className="text-lg font-bold tracking-tight font-heading text-white">
              MENIUS
            </Link>
            <div className="flex items-center gap-1">
              <LocaleSwitcher />
              <DashboardNav slug={restaurant?.slug ?? ''} mobile />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardLocaleProvider>
  );
}
