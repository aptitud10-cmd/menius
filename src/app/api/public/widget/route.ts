import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug')?.trim();

  if (!slug) {
    return new NextResponse('/* menius-widget: missing ?slug= */', {
      status: 400,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limited = await checkRateLimitAsync(`widget:${ip}`, { limit: 30, windowSec: 60 });
  if (!limited.allowed) {
    return new NextResponse('/* menius-widget: rate limited */', {
      status: 429,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  // Verify restaurant exists
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('restaurants')
      .select('slug, name')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) {
      return new NextResponse(`/* menius-widget: restaurant "${slug}" not found */`, {
        status: 404,
        headers: { 'Content-Type': 'application/javascript' },
      });
    }
  } catch {
    return new NextResponse('/* menius-widget: internal error */', {
      status: 500,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  const menuUrl = `${APP_URL}/${slug}`;

  const js = `
(function() {
  if (document.getElementById('menius-widget-btn')) return;

  var btn = document.createElement('a');
  btn.id = 'menius-widget-btn';
  btn.href = '${menuUrl}';
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg><span>Ver Men\u00fa</span>';

  var style = document.createElement('style');
  style.textContent = '#menius-widget-btn{position:fixed;bottom:24px;right:24px;z-index:99999;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:#05c8a7;color:#000;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:700;border-radius:50px;text-decoration:none;box-shadow:0 4px 20px rgba(5,200,167,0.4);transition:transform 0.2s,box-shadow 0.2s}#menius-widget-btn:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(5,200,167,0.5)}#menius-widget-btn svg{flex-shrink:0}';
  document.head.appendChild(style);
  document.body.appendChild(btn);
})();
`.trim();

  return new NextResponse(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
