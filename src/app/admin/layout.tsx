import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    // No admin configured — deny access
    redirect('/login');
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== adminEmail) {
    redirect('/login');
  }

  return <>{children}</>;
}
