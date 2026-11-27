import type { Metadata } from "next";
import { cookies } from "next/headers";
import { resolveLandingV2Locale, type LandingV2Locale } from "@/lib/landing-v2-copy";
import PublicSupportPage from "./PublicSupportPage";

/**
 * Idioma: `?lang=` manda (el panel enlaza /support?lang=<idioma del panel>);
 * si no viene, la cookie `menius_locale` como el resto del sitio (EN por defecto).
 */
async function resolveLocale(
  searchParams?: Record<string, string>,
): Promise<LandingV2Locale> {
  const lang = searchParams?.lang;
  if (lang === "en" || lang === "es") return lang;
  const cookieStore = await cookies();
  return resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const locale = await resolveLocale(await searchParams);
  // Sin la marca: el layout raíz la agrega con template '%s | MENIUS'.
  return locale === "en"
    ? {
        title: "Support",
        description:
          "Talk to a real person by phone, WhatsApp or email, in English or Spanish. Quick guides for your menu, AI photos, the Counter tablet and card payments.",
        alternates: { canonical: "/support" },
      }
    : {
        title: "Soporte",
        description:
          "Habla con una persona real por teléfono, WhatsApp o email, en inglés o en español. Guías rápidas para tu menú, las fotos con IA, la tablet Counter y los pagos con tarjeta.",
        alternates: { canonical: "/support" },
      };
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const locale = await resolveLocale(await searchParams);
  return <PublicSupportPage locale={locale} />;
}
