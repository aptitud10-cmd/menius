import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Dev Tool — Menius Admin' };

export default async function DevToolPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) redirect('/login');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !adminEmail.split(',').map(e => e.trim()).includes(user.email ?? '')) redirect('/login');

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#030712', color: '#9ca3af', fontFamily: 'monospace', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 32 }}>🛠️</span>
      <p style={{ margin: 0 }}>Dev Tool — temporalmente fuera de servicio. Vuelve pronto.</p>
    </div>
  );
}
