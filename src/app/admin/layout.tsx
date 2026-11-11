import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Auth-gated per request. Explicit, because the root layout no longer reads
// cookies (that made every route dynamic and broke the menu's ISR): without
// ADMIN_EMAIL at build time this layout redirects before touching cookies()
// and Next would freeze /admin as a static redirect to /login.
export const dynamic = 'force-dynamic';

export const metadata = {
  manifest: '/manifest-admin.json',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== adminEmail) {
    redirect('/login');
  }

  return (
    <>
      {children}
      <script dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw-admin.js', { scope: '/admin' })
              .catch(() => {});
          }
        `,
      }} />
    </>
  );
}
