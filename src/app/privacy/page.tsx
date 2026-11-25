
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import type { LandingLocale } from "@/lib/landing-translations";
import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad de MENIUS. Cómo recopilamos, usamos y protegemos tus datos.",
  alternates: { canonical: "/privacy" },
};

function getHero(locale: LandingLocale) {
  if (locale === "en")
    return {
      badge: "Legal",
      title: "Privacy Policy",
      date: "Last updated: November 25, 2026",
    };
  return {
    badge: "Legal",
    title: "Política de Privacidad",
    date: "Última actualización: 25 de noviembre de 2026",
  };
}

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const locale = (
    cookieStore.get("menius_locale")?.value === "en" ? "en" : "es"
  ) as LandingLocale;
  const hero = getHero(locale);

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav locale={locale} />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-5">
            {hero.badge}
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-3">
            {hero.title}
          </h1>
          <p className="text-sm text-gray-500">{hero.date}</p>
        </div>
      </section>

      <div className="separator-gradient max-w-3xl mx-auto" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        <PrivacyPolicyContent locale={locale === "en" ? "en" : "es"} />
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
