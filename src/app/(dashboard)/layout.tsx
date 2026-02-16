import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

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
    .select('name, slug')
    .eq('id', profile.default_restaurant_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 p-4">
        <Link href="/app/orders" className="text-lg font-bold tracking-tight mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
          <span className="text-brand-600">MEN</span>IUS
        </Link>
        <p className="text-xs text-gray-400 mb-6 truncate">{restaurant?.name ?? 'Mi Restaurante'}</p>

        <DashboardNav slug={restaurant?.slug ?? ''} />

        <div className="mt-auto pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{profile.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <Link href="/app/orders" className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            <span className="text-brand-600">MEN</span>IUS
          </Link>
          <DashboardNav slug={restaurant?.slug ?? ''} mobile />
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
