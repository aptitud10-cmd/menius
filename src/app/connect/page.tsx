import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ConnectScreen } from '@/components/device/ConnectScreen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connect tablet — MENIUS Counter',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/**
 * The Counter tablet's sign-in screen: shows a pairing code + QR that the owner
 * approves from their own phone (/app/link). Already signed in → straight to the
 * Counter, so reopening the app never lands here twice.
 */
export default async function ConnectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/counter');

  const cookieStore = await cookies();
  const locale = cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es';
  return <ConnectScreen locale={locale} />;
}
