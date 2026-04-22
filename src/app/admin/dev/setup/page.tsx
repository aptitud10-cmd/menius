import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetupWizard from './SetupWizard';

export const metadata = { title: 'Dev Tool Setup — Menius Admin' };

export default async function SetupPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) redirect('/login');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) redirect('/login');
  return <SetupWizard />;
}
