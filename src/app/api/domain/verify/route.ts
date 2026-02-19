import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('default_restaurant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.default_restaurant_id) {
      return NextResponse.json({ error: 'Sin restaurante' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('custom_domain')
      .eq('id', profile.default_restaurant_id)
      .maybeSingle();

    const domain = restaurant?.custom_domain;
    if (!domain) {
      return NextResponse.json({ verified: false, error: 'No hay dominio configurado' });
    }

    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`, {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return NextResponse.json({ verified: false, error: 'Error al consultar DNS' });
      }

      const data = await res.json();
      const answers: any[] = data.Answer ?? [];

      const pointsToVercel = answers.some(
        (a: any) => a.type === 5 && typeof a.data === 'string' &&
          a.data.replace(/\.$/, '').endsWith('vercel-dns.com')
      );

      if (pointsToVercel) {
        await supabase
          .from('restaurants')
          .update({ domain_verified: true })
          .eq('id', profile.default_restaurant_id);

        return NextResponse.json({ verified: true });
      }

      return NextResponse.json({
        verified: false,
        error: `El CNAME de ${domain} aún no apunta a cname.vercel-dns.com. La propagación puede tardar hasta 48 horas.`,
      });
    } catch {
      return NextResponse.json({ verified: false, error: 'No se pudo verificar el DNS. Intenta de nuevo.' });
    }
  } catch (err) {
    console.error('[domain/verify POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
