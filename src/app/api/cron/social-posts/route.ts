export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, buildSocialPostDigestEmail, type SocialPostDigestItem } from '@/lib/notifications/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('cron-social-posts');

const CRON_SECRET = process.env.CRON_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/* ──────────────────────────────────────
   Content pillars — rotate automatically
   ────────────────────────────────────── */
const POST_TYPES = [
  'pain_point',
  'comparison',
  'testimonial',
  'educational',
  'stat',
  'promotion',
  'product_launch',
  'behind_scenes',
] as const;

const POST_TYPE_DESCRIPTIONS: Record<string, string> = {
  pain_point: 'Address a real restaurant pain point that MENIUS solves. Focus on the emotional and financial toll of paying 15-30% commissions to delivery apps, or struggling with paper menus, or losing customers because they have no online presence.',
  comparison: 'Compare MENIUS vs a specific competitor. Pick ONE from: Rappi (30% commission), UberEats (25-30%), DoorDash (15-30%), iFood (27%), or generic "delivery apps". Use concrete numbers and a clear "switch" CTA.',
  testimonial: 'Write a realistic testimonial from a fictional but believable restaurant owner. Include their name, restaurant type, city, and specific results (e.g. "saved $2,400/month", "orders increased 40%"). Make it feel genuine, not scripted.',
  educational: 'Teach restaurant owners something valuable: how QR menus increase average ticket by 20%, why 73% of diners check menus online before visiting, how to reduce food waste with real-time stock, digital marketing tips for restaurants.',
  stat: 'Lead with a compelling industry statistic and connect it to MENIUS. Use real data points: "67% of restaurants fail in the first year", "Restaurant profit margins average 3-5%", "Digital menus reduce order errors by 95%".',
  promotion: 'Promote MENIUS free trial. Emphasize: 14 days free, no credit card, 0% commission forever, setup in 2 minutes, AI generates product images. Create urgency without being pushy.',
  product_launch: 'Spotlight a specific MENIUS feature as if it just launched. Pick from: AI image generation, WhatsApp order notifications, QR code generator, customer CRM, marketing automation, analytics dashboard, OCR menu import.',
  behind_scenes: 'Share a behind-the-scenes moment of building MENIUS. Topics: why we built it (founder frustrated with restaurant tech), the tech stack (Next.js, Supabase, Stripe, Gemini AI), a user story, a milestone, or a lesson learned.',
};

/* ──────────────────────────────────────
   Platform configurations
   ────────────────────────────────────── */
const PLATFORMS = [
  {
    id: 'instagram',
    style: `Write for INSTAGRAM. Use line breaks for readability. Start with a powerful hook (first line people see before "...more"). Use 3-5 emojis spread naturally. End the caption with a clear CTA. Add exactly 15 relevant hashtags on a separate line.
Max 2200 characters for caption (excluding hashtags).`,
  },
  {
    id: 'facebook',
    style: `Write for FACEBOOK. Conversational and informative tone. Include a link mention to menius.app naturally. Use 1-3 emojis max. Ask a question to drive comments. Shorter than Instagram — aim for 100-200 words. Add 3-5 hashtags at the end.`,
  },
  {
    id: 'linkedin',
    style: `Write for LINKEDIN. Professional thought-leadership tone. Start with a contrarian or surprising statement to stop the scroll. Use short paragraphs (1-2 sentences each). Share data or insights. End with a question or invitation for discussion. Add 3-5 hashtags. No emojis or max 1.`,
  },
] as const;

/* ──────────────────────────────────────
   Master prompt (RCTC Framework)
   ────────────────────────────────────── */
function buildMasterPrompt(platform: typeof PLATFORMS[number], postType: string, language: 'es' | 'en'): string {
  const lang = language === 'en' ? 'English' : 'Spanish';
  const typeDesc = POST_TYPE_DESCRIPTIONS[postType] || POST_TYPE_DESCRIPTIONS.pain_point;

  return `ROLE: You are the Head of Growth Marketing at MENIUS, a $10M ARR SaaS company. You have 15 years of experience in B2B SaaS marketing and deep expertise in the restaurant industry. You write posts that get 10x more engagement than average because you understand both the platform algorithm and the restaurant owner's psychology.

CONTEXT — ABOUT MENIUS:
- All-in-one digital platform for restaurants: QR digital menu, real-time online ordering, kitchen display system (KDS), AI assistant, customer CRM, analytics, marketing automation
- Pricing: Starter $39/mo, Pro $66/mo, Business $124/mo
- CRITICAL DIFFERENTIATOR: 0% commission per order. Unlike Rappi (30%), UberEats (25-30%), DoorDash (15-30%), MENIUS charges a flat monthly fee. A restaurant doing $10,000/mo in delivery saves $2,500-3,000/mo vs delivery apps.
- 14-day free trial, no credit card required
- Setup takes 2 minutes — AI can generate product images and even import a menu from a photo (OCR)
- Features: AI image generation (Gemini), WhatsApp order notifications, QR code generator, customer CRM with order history, email marketing, SMS campaigns, promotions engine, analytics dashboard, multi-language menus (ES/EN), custom domains
- Tech stack: Next.js, Supabase, Stripe, Google Gemini AI, Vercel, Cloudflare
- Website: https://menius.app
- Target audience: Restaurant owners, cafe owners, food truck operators, bar owners (primarily USA and Latin America)

TASK: Create ONE social media post.
Post type: ${typeDesc}
${platform.style}
Language: ${lang}

QUALITY CONSTRAINTS:
1. NEVER use these overused words/phrases: "revolutionize", "game-changer", "unlock", "empower", "leverage", "dive in", "at the end of the day", "it's not just about", "in today's world"
2. Vary sentence length — mix short punchy sentences with longer ones
3. Use SPECIFIC numbers and examples, not vague claims
4. Write like a real human sharing genuine advice, not a marketing robot
5. The hook (first line) MUST stop the scroll — use a bold claim, surprising stat, or provocative question
6. Include ONE clear call-to-action pointing to menius.app
7. If writing in Spanish, use Latin American Spanish (not Spain Spanish). Use "tú" not "usted" for direct address.
8. Sound natural for the platform — Instagram is visual/casual, Facebook is conversational, LinkedIn is professional

RESPOND IN THIS EXACT JSON FORMAT (nothing else):
{
  "caption": "The full post text (with emojis if platform allows, with line breaks as \\n)",
  "hashtags": "#menius #digitalMenu ... (platform-appropriate count)",
  "hook": "Just the first line / attention grabber",
  "cta": "The call-to-action text",
  "imageIdea": "Detailed description of the ideal image: subject, composition, colors, text overlay, style",
  "bestTimeToPost": "Specific day and time recommendation",
  "tip": "One actionable tip for maximizing engagement with this specific post"
}`;
}

/* ──────────────────────────────────────
   Image generation
   ────────────────────────────────────── */
async function generateMarketingImage(imageIdea: string, apiKey: string): Promise<string | null> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `Generate a professional SaaS marketing graphic for social media.

DESIGN BRIEF: ${imageIdea}

STYLE REQUIREMENTS:
- Clean, modern SaaS aesthetic (inspired by Stripe, Linear, Vercel marketing)
- Primary brand color: emerald green (#059669) with dark backgrounds (#0a0a0a, #111827)
- Secondary accent: white text, subtle gray gradients
- Square format (1:1 aspect ratio, 1080x1080 pixels ideal)
- Include bold headline text overlay if the idea mentions a message or stat
- If text is included, make it large, legible, and well-contrasted
- Include "menius.app" subtly in the bottom-right corner as a small watermark
- NO stock photo cliches (no handshakes, no generic happy people)
- Professional gradient backgrounds, abstract shapes, or clean device mockups
- If showing a phone/tablet, show a realistic restaurant menu interface
- High contrast, crisp edges, modern typography`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as any,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData) {
          return (part as any).inlineData.data as string;
        }
      }
    }
    return null;
  } catch (err) {
    logger.error('Image generation failed', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

async function uploadImage(base64: string, platform: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(base64, 'base64');
    const fileName = `social/${platform}-${Date.now()}.png`;

    const { error } = await supabase.storage
      .from('menius-posts')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      logger.error('Image upload failed', { error: error.message });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('menius-posts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    logger.error('Upload error', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/* ──────────────────────────────────────
   Save to database
   ────────────────────────────────────── */
async function savePost(post: {
  platform: string;
  post_type: string;
  language: string;
  hook: string;
  caption: string;
  hashtags: string;
  cta: string;
  image_url: string | null;
  image_idea: string;
  best_time: string;
  tip: string;
  status: string;
  source: string;
}) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('menius_posts').insert(post);
    if (error) logger.error('DB save failed', { error: error.message });
  } catch (err) {
    logger.error('Save error', { error: err instanceof Error ? err.message : String(err) });
  }
}

/* ──────────────────────────────────────
   Determine which post type to use
   ────────────────────────────────────── */
function getPostTypeForRun(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return POST_TYPES[dayOfYear % POST_TYPES.length];
}

/* ──────────────────────────────────────
   Generate one post (text + image)
   ────────────────────────────────────── */
async function generatePost(
  platform: typeof PLATFORMS[number],
  postType: string,
  language: 'es' | 'en',
  apiKey: string,
): Promise<SocialPostDigestItem | null> {
  try {
    const prompt = buildMasterPrompt(platform, postType, language);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 2000 },
        }),
      },
    );

    if (!res.ok) {
      logger.error(`Gemini text failed for ${platform.id}`, { status: res.status });
      return null;
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error(`Could not parse response for ${platform.id}`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    let imageUrl: string | null = null;
    if (parsed.imageIdea) {
      const imageBase64 = await generateMarketingImage(parsed.imageIdea, apiKey);
      if (imageBase64) {
        imageUrl = await uploadImage(imageBase64, platform.id);
      }
    }

    await savePost({
      platform: platform.id,
      post_type: postType,
      language,
      hook: parsed.hook ?? '',
      caption: parsed.caption ?? '',
      hashtags: parsed.hashtags ?? '',
      cta: parsed.cta ?? '',
      image_url: imageUrl,
      image_idea: parsed.imageIdea ?? '',
      best_time: parsed.bestTimeToPost ?? '',
      tip: parsed.tip ?? '',
      status: 'sent',
      source: 'auto',
    });

    return {
      platform: platform.id,
      hook: parsed.hook ?? '',
      caption: parsed.caption ?? '',
      hashtags: parsed.hashtags ?? '',
      cta: parsed.cta ?? '',
      image_url: imageUrl,
      image_idea: parsed.imageIdea,
      best_time: parsed.bestTimeToPost,
      tip: parsed.tip,
    };
  } catch (err) {
    logger.error(`Post generation failed for ${platform.id}`, { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/* ──────────────────────────────────────
   Main cron handler
   ────────────────────────────────────── */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  const postType = getPostTypeForRun();
  const languages: Array<'es' | 'en'> = ['es', 'en'];
  const language = languages[new Date().getDay() % 2];

  logger.info(`Starting social post generation: type=${postType}, lang=${language}`);

  const postResults = await Promise.allSettled(
    PLATFORMS.map(platform => generatePost(platform, postType, language, apiKey)),
  );
  const generatedPosts: SocialPostDigestItem[] = postResults
    .filter((r): r is PromiseFulfilledResult<SocialPostDigestItem> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  if (generatedPosts.length > 0) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = buildSocialPostDigestEmail(generatedPosts, dateStr);

    if (!ADMIN_EMAIL) {
      logger.warn('ADMIN_EMAIL env var is not set — skipping digest email');
    } else {
      const adminEmails = ADMIN_EMAIL.split(',').map(e => e.trim()).filter(Boolean);
      for (const email of adminEmails) {
        await sendEmail({
          to: email,
          subject: `📱 MENIUS Social Posts Ready — ${dateStr}`,
          html,
        });
      }
      logger.info(`Generated ${generatedPosts.length} posts, email sent to ${adminEmails.join(', ')}`);
    }
  } else {
    logger.error('No posts were generated');
  }

  return NextResponse.json({
    success: true,
    postsGenerated: generatedPosts.length,
    postType,
    language,
    platforms: generatedPosts.map(p => p.platform),
  });
}
