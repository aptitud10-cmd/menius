import Link from 'next/link';
import CrispChat from '@/components/CrispChat';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { DashboardLocaleProvider } from '@/hooks/use-dashboard-locale';
import { AIChatWidget } from '@/components/dashboard/AIChatWidget';
import { Breadcrumbs } from '@/components/dashboard/Breadcrumbs';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { OrderNotifier } from '@/components/dashboard/OrderNotifier';
import { SidebarSoundButton } from '@/components/dashboard/SidebarSoundButton';
import { IdentifyUser } from '@/components/dashboard/IdentifyUser';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { DashToastProvider } from '@/components/dashboard/DashToast';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, restaurantId } = await getDashboardContext();

  const [{ data: profile }, { data: restaurant }, { data: { user } }, { data: subscription }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('restaurants')
      .select('name, slug, locale, currency')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase.auth.getUser(),
    supabase
      .from('subscriptions')
      .select('plan_id, status, trial_end')
      .eq('restaurant_id', restaurantId)
      .maybeSingle(),
  ]);

  const resolvedPlanId: string = (() => {
    if (!subscription) return 'free';
    if (subscription.status === 'active' || subscription.status === 'past_due') return subscription.plan_id ?? 'free';
    if (subscription.status === 'trialing' && subscription.trial_end && new Date(subscription.trial_end) > new Date()) return subscription.plan_id ?? 'starter';
    return 'free';
  })();

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
      <DashToastProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 flex overflow-x-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-[260px] bg-white border-r border-gray-200 sticky top-0 h-screen">
          {/* Logo + restaurant */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <Link href="/app" className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-gray-900 truncate">MENIUS</p>
                <p className="text-[11px] text-gray-400 truncate leading-tight">{restaurant?.name ?? 'Mi Restaurante'}</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
            <DashboardNav slug={restaurant?.slug ?? ''} planId={resolvedPlanId} />
          </div>

          <TrialBanner />

          {/* User profile + sound toggle */}
          <div className="px-4 py-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{profile?.full_name || 'Sin nombre'}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <SidebarSoundButton />
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
            <Link href="/app" className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-gray-900">MENIUS</span>
            </Link>
            <div className="flex items-center gap-2">
              <SidebarSoundButton mobile />
              <DashboardNav slug={restaurant?.slug ?? ''} mobile planId={resolvedPlanId} />
            </div>
          </header>

          <div className="md:hidden">
            <TrialBanner />
          </div>

          <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto overflow-x-hidden">
            <Breadcrumbs />
            {children}
          </main>
        </div>

        <CommandPalette slug={restaurant?.slug ?? ''} />
        <AIChatWidget />
        <CrispChat />
        <OrderNotifier restaurantId={restaurantId} currency={restaurant?.currency || 'USD'} />
        <IdentifyUser
          userId={userId}
          email={user?.email ?? undefined}
          name={profile?.full_name ?? undefined}
          restaurantId={restaurantId}
          restaurantName={restaurant?.name ?? undefined}
        />
      </div>
      </DashToastProvider>
    </DashboardLocaleProvider>
  );
}
