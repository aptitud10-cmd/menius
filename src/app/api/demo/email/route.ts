import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/notifications/email';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limit: one email per address per process lifetime.
// Resets on cold start — good enough for a landing page demo.
const sent = new Set<string>();

interface DemoItem {
  name: string;
  qty: number;
  lineTotal: number;
  variant?: string;
}

function fmtUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function buildHtml(items: DemoItem[], total: number): string {
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #374151;">
            <span style="font-weight: 600; color: #111827;">${item.qty}&times;</span>
            &nbsp;${item.name}${item.variant ? `<span style="color: #9ca3af;"> (${item.variant})</span>` : ''}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #111827; font-weight: 600; text-align: right; white-space: nowrap;">
            ${fmtUsd(item.lineTotal)}
          </td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>It works — Menius</title>
</head>
<body style="margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #f4f4f5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td style="background: #111827; border-radius: 16px 16px 0 0; padding: 32px 40px 28px;">
              <p style="margin: 0 0 16px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280; font-weight: 600;">MENIUS</p>
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; line-height: 1.2;">
                Your order just went through.
              </h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #9ca3af; line-height: 1.5;">
                And this email arrived in seconds — automatically.
              </p>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background: #ffffff; padding: 32px 40px;">

              <!-- What happened -->
              <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
                You just experienced the full Menius flow: you browsed a menu, added items, placed an order, and received this confirmation — exactly the way your customers would, from any restaurant you create on Menius.
              </p>

              <!-- Order receipt -->
              <div style="background: #f9fafb; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
                <p style="margin: 0 0 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">
                  Order #DEMO-0042 &nbsp;·&nbsp; The Grill House
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  ${itemRows}
                  <tr>
                    <td style="padding: 14px 0 0; font-size: 15px; font-weight: 700; color: #111827;">Total</td>
                    <td style="padding: 14px 0 0; font-size: 15px; font-weight: 700; color: #111827; text-align: right;">${fmtUsd(total)}</td>
                  </tr>
                </table>
              </div>

              <!-- Insight -->
              <div style="border-left: 3px solid #05c8a7; padding: 4px 0 4px 16px; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                  <strong style="color: #111827;">This is exactly what your customers see</strong> when they order from your restaurant — your brand, your menu, your orders landing directly in your dashboard. No commissions. No third-party apps.
                </p>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <a href="https://menius.app/signup"
                       style="display: inline-block; background: #111827; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 12px; letter-spacing: 0.01em;">
                      Launch my restaurant — it&rsquo;s free &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                Sent by <strong style="color: #6b7280;">Menius</strong> · Digital menus &amp; point of sale for restaurants in Latin America<br />
                <a href="https://menius.app" style="color: #05c8a7; text-decoration: none;">menius.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: unknown;
      items?: unknown;
      total?: unknown;
    };

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Rate limit: skip silently if already sent to this address this session
    if (sent.has(email)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const items: DemoItem[] = Array.isArray(body.items)
      ? (body.items as DemoItem[]).slice(0, 20)
      : [];
    const total = typeof body.total === 'number' ? body.total : 0;

    const html = buildHtml(items, total);

    await sendEmail({
      to: email,
      subject: 'Your order just went through — this is Menius',
      html,
    });

    sent.add(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[demo/email]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
