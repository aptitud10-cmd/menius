import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { normalizePairingCode } from '@/lib/device-pairing';
import { LinkDeviceScreen } from '@/components/device/LinkDeviceScreen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connect a tablet — MENIUS',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * menius.app/link — where the owner approves a tablet's pairing code. The tablet's
 * QR points here with ?code=…, so a scan pre-fills it and approving is one tap.
 */
export default async function LinkPage({ searchParams }: { searchParams: { code?: string } }) {
  const code = normalizePairingCode(searchParams.code) ?? '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const back = code ? `/link?code=${code}` : '/link';
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es';

  const tenant = await getTenant();
  let restaurantName: string | null = null;
  if (tenant) {
    const { data } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', tenant.restaurantId)
      .maybeSingle();
    restaurantName = data?.name ?? null;
  }

  return (
    <LinkDeviceScreen
      locale={locale}
      initialCode={code}
      restaurantName={restaurantName}
      isOwner={!!tenant}
    />
  );
}
