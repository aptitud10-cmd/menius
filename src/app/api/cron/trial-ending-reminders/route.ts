export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildTrialEndingEmail } from "@/lib/notifications/email";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron:trial-ending-reminders");

// Runs daily. Finds restaurants whose trial ends in exactly 3 days and sends a warning.
// This is independent of Stripe webhooks — restaurants on trial without a Stripe subscription
// never receive the `customer.subscription.trial_will_end` webhook, so we must handle it here.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDb = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";

  try {
    // Everything still on trial that ends within the next 3 days and hasn't been
    // warned yet. The `trial_ending_reminder_sent_at is null` filter below is
    // what makes this send once, so the window can be a range instead of a
    // needle — and it has to be.
    //
    // This used to target trial_end in [now+71h, now+73h]: a 2-hour slot checked
    // by a cron that fires once a day at 11:00 UTC. Only trials ending between
    // 10:00 and 12:00 UTC were ever seen; the other 21 hours of the day were
    // never warned at all. Measured against prod: 7 of 8 real trials fell
    // outside it (07:56, 13:02, 01:21, 02:14, 13:21, 14:00, 16:43 UTC) — every
    // one of them expired in silence and then got auto-canceled by
    // billing-reconciliation. That is the whole trial→paid funnel leaking.
    const windowEnd = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: subs } = await adminDb
      .from("subscriptions")
      .select(
        "restaurant_id, trial_end, restaurants(name, slug, locale, notification_email)",
      )
      .eq("status", "trialing")
      // Floor at now: an already-expired trial shouldn't be told it has 3 days
      // left. billing-reconciliation flips those to canceled anyway.
      .gte("trial_end", new Date().toISOString())
      .lte("trial_end", windowEnd)
      .is("trial_ending_reminder_sent_at", null);

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        message: "No trials ending within 3 days",
        sent: 0,
      });
    }

    const billingUrl = `${appUrl}/app/billing`;

    // A trial we can't email is a customer about to churn unnoticed, so say so
    // instead of dropping it from the list without a trace.
    const unreachable = subs.filter(
      (sub) => !(sub.restaurants as { notification_email?: string } | null)?.notification_email,
    );
    for (const sub of unreachable) {
      logger.error("Trial ending but restaurant has no notification_email", {
        restaurantId: sub.restaurant_id,
        trialEnd: sub.trial_end,
      });
    }

    const results = await Promise.allSettled(
      subs
        .filter((sub) => !!(sub.restaurants as any)?.notification_email)
        .map((sub) => {
          const rest = sub.restaurants as unknown as {
            name: string;
            slug: string;
            locale: string;
            notification_email: string;
          };
          const en = rest.locale === "en";
          // Real remaining days, not a hardcoded 3. The window now spans up to
          // 3 days out, so a trial ending tomorrow would otherwise be told it
          // has 3 days left — telling an owner the wrong expiry date is worse
          // than the silence this fix replaces. Ceil so "in 4 hours" reads as
          // 1 day, never 0.
          const msLeft = new Date(sub.trial_end as string).getTime() - Date.now();
          const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
          const dayWord = en
            ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}`
            : `${daysLeft} día${daysLeft === 1 ? "" : "s"}`;
          return sendEmail({
            to: rest.notification_email,
            subject: en
              ? `Your MENIUS trial ends in ${dayWord} — ${rest.name}`
              : `Tu prueba de MENIUS termina en ${dayWord} — ${rest.name}`,
            html: buildTrialEndingEmail({
              ownerName: rest.name,
              restaurantName: rest.name,
              daysLeft,
              billingUrl,
              locale: rest.locale,
            }),
          }).then(async (ok) => {
            // sendEmail NEVER rejects — it returns a boolean. Stamping
            // sent_at unconditionally marked failed sends as delivered and
            // the trial was never reminded. Only stamp on real success.
            if (!ok) {
              logger.error("Trial ending reminder failed to send", {
                restaurantSlug: rest.slug,
              });
              return false;
            }
            await adminDb
              .from("subscriptions")
              .update({
                trial_ending_reminder_sent_at: new Date().toISOString(),
              })
              .eq("restaurant_id", sub.restaurant_id);
            logger.info("Trial ending reminder sent", {
              restaurantSlug: rest.slug,
            });
            return true;
          });
        }),
    );

    const sentCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        logger.error("Failed to send trial ending reminder", {
          index: i,
          error:
            r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    });

    return NextResponse.json({
      message: `Sent ${sentCount} trial ending reminders`,
      sent: sentCount,
    });
  } catch (err) {
    logger.error("Trial ending reminders cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
