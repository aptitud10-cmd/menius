
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { V2LegalDoc } from "@/components/landing-v2/V2LegalDoc";
import { resolveLandingV2Locale, type LandingV2Locale } from "@/lib/landing-v2-copy";
import { privacyPolicyElement } from "@/components/legal/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad de MENIUS. Cómo recopilamos, usamos y protegemos tus datos.",
  alternates: { canonical: "/privacy" },
};

function getHero(locale: LandingV2Locale) {
  if (locale === "en")
    return {
      title: "Privacy Policy",
      date: "Last updated: November 25, 2026",
    };
  return {
    title: "Política de Privacidad",
    date: "Última actualización: 25 de noviembre de 2026",
  };
}

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
  const hero = getHero(locale);

  return (
    <V2LegalDoc
      locale={locale}
      doc="privacy"
      title={hero.title}
      updated={hero.date}
      content={privacyPolicyElement(locale)}
    />
  );
}
