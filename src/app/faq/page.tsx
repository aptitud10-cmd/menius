import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  getFaqCategories,
  getFaqPageText,
  extractFaqText,
} from "@/lib/faq-data";
import { resolveLandingV2Locale } from "@/lib/landing-v2-copy";
import { SUPPORT_CONTACT } from "@/lib/support-contact";
import { V2Page } from "@/components/landing-v2/V2Page";
import { V2ScrollSpy } from "@/components/landing-v2/V2ScrollSpy";

export const metadata: Metadata = {
  // Sin '| MENIUS': el layout raíz lo agrega con template '%s | MENIUS'.
  title: "Preguntas Frecuentes — FAQ",
  description:
    "Respuestas a las preguntas más comunes sobre MENIUS: configuración, precios, pedidos, pagos, integraciones, soporte, seguridad y más.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — MENIUS",
    description:
      "Todo lo que necesitas saber sobre menús digitales, pedidos online y pagos con MENIUS.",
    type: "website",
  },
};

/**
 * FAQ (fase 2 del rediseño): las 7 categorías en una sola página con anclas
 * (Google y Ctrl+F ven todo). Desktop: lista de categorías fija con
 * scroll-spy. Tablet/celular: chips fijos arriba. Acordeón <details> sin JS.
 */
export default async function FaqPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);

  const categories = getFaqCategories(locale);
  const pt = getFaqPageText(locale);
  const totalQuestions = categories.reduce(
    (acc, cat) => acc + cat.questions.length,
    0,
  );

  // JSON-LD schema for SEO (all questions)
  const allQuestions = categories.flatMap((cat) => cat.questions);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQuestions.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: extractFaqText(q.a) },
    })),
  };

  return (
    <V2Page locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <main id="main-content">
        <header className="ph ph-split">
          <div className="wrap">
            <div>
              <span className="stamp label">{pt.badge}</span>
              <h1>{pt.title}</h1>
            </div>
            <p className="lead">
              {totalQuestions}
              {pt.subtitleSuffix}
            </p>
          </div>
        </header>

        <div className="faqp">
          <div className="wrap faqp-grid">
            <nav className="cats" aria-label={pt.categoriesLabel} data-toc>
              <h2>{pt.categories}</h2>
              <ul>
                {categories.map((cat, i) => (
                  <li key={cat.id}>
                    <a href={`#${cat.id}`} aria-current={i === 0 ? "true" : undefined}>
                      {cat.title}
                      <b>{cat.questions.length}</b>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <nav className="chips" aria-label={pt.categoriesLabel}>
                {categories.map((cat, i) => (
                  <a key={cat.id} href={`#${cat.id}`} aria-current={i === 0 ? "true" : undefined}>
                    {cat.title} <b>{cat.questions.length}</b>
                  </a>
                ))}
              </nav>

              {categories.map((cat, ci) => (
                <section className="cat" id={cat.id} key={cat.id} aria-labelledby={`faq-${cat.id}`}>
                  <div className="cat-h">
                    <h2 id={`faq-${cat.id}`}>{cat.title}</h2>
                    <span>{pt.questions(cat.questions.length)}</span>
                  </div>
                  {cat.questions.map((item, qi) => (
                    <details className="q" key={item.q} open={ci === 0 && qi === 0}>
                      <summary>{item.q}</summary>
                      <div className="a">{item.a}</div>
                    </details>
                  ))}
                </section>
              ))}

              <section className="ask band-dark" aria-labelledby="faq-ask">
                <div>
                  <h2 id="faq-ask">{pt.ctaTitle}</h2>
                  <p>{pt.ctaSubtitle}</p>
                </div>
                <div className="acts">
                  <a className="big" href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
                  <Link className="tlink" href="/demo">{pt.ctaDemo}</Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <V2ScrollSpy ids={categories.map((c) => c.id)} />
    </V2Page>
  );
}
