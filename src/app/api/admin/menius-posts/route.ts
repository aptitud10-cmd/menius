export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim().toLowerCase());

async function isAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

const PLATFORMS: Record<string, { maxLen: number; style: string }> = {
  instagram: { maxLen: 2200, style: 'visual, emoji-rich, hashtag-heavy, engaging captions' },
  facebook: { maxLen: 2000, style: 'conversational, informative, link-friendly' },
  twitter: { maxLen: 280, style: 'concise, punchy, one strong hook' },
  linkedin: { maxLen: 3000, style: 'professional, thought-leadership, industry insights' },
  tiktok: { maxLen: 300, style: 'trendy, casual, Gen-Z friendly, hook in first line' },
};

const POST_TYPES: Record<string, string> = {
  product_launch: 'Announce a new MENIUS feature or capability',
  pain_point: 'Address a common restaurant pain point that MENIUS solves (commissions, no website, paper menus, etc.)',
  comparison: 'Compare MENIUS vs competitors (Rappi, UberEats, etc.) highlighting 0% commission',
  testimonial: 'Create a realistic testimonial-style post from a happy restaurant owner',
  educational: 'Teach restaurant owners a tip about digital menus, QR codes, or online ordering',
  stat: 'Share a compelling industry statistic about restaurants and digital transformation',
  behind_scenes: 'Show behind-the-scenes of building MENIUS (founder story, tech stack, etc.)',
  promotion: 'Promote the free 14-day trial or a special offer',
};

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 503 });

    const { platform, postType, language, customContext } = await request.json();

    const platformConfig = PLATFORMS[platform] || PLATFORMS.instagram;
    const typeDesc = POST_TYPES[postType] || POST_TYPES.product_launch;
    const lang = language === 'en' ? 'English' : 'Spanish';

    const prompt = `You are a world-class SaaS marketing copywriter for MENIUS — a digital menu and restaurant management platform.

ABOUT MENIUS:
- All-in-one SaaS for restaurants: digital QR menu, real-time orders, kitchen display (KDS), AI assistant, CRM, analytics, marketing tools
- Pricing: Starter $39/mo, Pro $66/mo, Business $124/mo — ALL with 0% commission per order
- Key differentiator: Unlike Rappi/UberEats/DoorDash that charge 15-30% per order, MENIUS charges a flat monthly fee
- 14-day free trial, no credit card required
- Built with cutting-edge tech: Next.js, Supabase, Stripe, Google Gemini AI
- Features: AI image generation for products, OCR menu import from photo, WhatsApp notifications, email campaigns, promotions, customer CRM
- Website: https://menius.app
- Target: Restaurant owners worldwide (primary markets: USA, Latin America, Spain)

TASK: Generate a ${platform} post.
Platform style: ${platformConfig.style}
Max length: ${platformConfig.maxLen} characters
Post type: ${typeDesc}
Language: ${lang}
${customContext ? `Additional context: ${customContext}` : ''}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "caption": "The main post text with emojis and formatting",
  "hashtags": "#menius #digitalMenu #restaurant (10-15 relevant hashtags)",
  "hook": "A one-line attention grabber for the first line",
  "cta": "A clear call-to-action (e.g. Try free at menius.app)",
  "imageIdea": "Brief description of what the accompanying image/video should show",
  "bestTimeToPost": "Suggested day and time to post this",
  "tip": "One marketing tip for maximizing engagement with this post"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 1500 },
        }),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response', raw }, { status: 500 });
    }

    const post = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ post, platform, postType, language });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
