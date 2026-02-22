import Link from 'next/link';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { DashboardLocaleProvider } from '@/hooks/use-dashboard-locale';
import { AIChatWidget } from '@/components/dashboard/AIChatWidget';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, restaurantId } = await getDashboardContext();

  const [{ data: profile }, { data: restaurant }, { data: { user } }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('restaurants')
      .select('name, slug, locale')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!restaurant) redirect('/onboarding/create-restaurant');

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const defaultLocale = (restaurant?.locale === 'en' ? 'en' : 'es') as 'es' | 'en';

  return (
    <DashboardLocaleProvider defaultLocale={defaultLocale}>
      <div className="min-h-screen bg-gray-50 text-gray-900 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-[260px] bg-white border-r border-gray-200 sticky top-0 h-screen">
          {/* Logo + restaurant */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <Link href="/app" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-gray-900 truncate">MENIUS</p>
                <p className="text-[11px] text-gray-400 truncate leading-tight">{restaurant?.name ?? 'Mi Restaurante'}</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
            <DashboardNav slug={restaurant?.slug ?? ''} />
          </div>

          {/* User profile */}
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{profile?.full_name || 'Sin nombre'}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
            <Link href="/app" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              <span className="text-sm font-bold tracking-tight text-gray-900">MENIUS</span>
            </Link>
            <DashboardNav slug={restaurant?.slug ?? ''} mobile />
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>

        <AIChatWidget />
      </div>
    </DashboardLocaleProvider>
  );
}
