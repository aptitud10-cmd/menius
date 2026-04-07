import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DevTool from './DevTool';

export const metadata = { title: 'Dev Tool — Menius Admin' };

export default async function DevToolPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) redirect('/login');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) redirect('/login');

  return <DevTool />;
}
