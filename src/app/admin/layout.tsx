import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  manifest: '/manifest-admin.json',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    redirect('/login');
  }

  const supabase = createClient();
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
