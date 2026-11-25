import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import type { LandingLocale } from "@/lib/landing-translations";
import { SUPPORT_CONTACT } from "@/lib/support-contact";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "How MENIUS works to make its website, restaurant menus and ordering pages usable by everyone, and how to report an accessibility barrier.",
  alternates: { canonical: "/accessibility" },
};

const proseClass =
  "prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300";

const UPDATED = { es: "25 de noviembre de 2026", en: "November 25, 2026" };

function Contact({ en }: { en: boolean }) {
  return (
    <ul>
      <li>
        <strong>Email:</strong>{" "}
        <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
      </li>
      {SUPPORT_CONTACT.phoneE164 && (
        <li>
          <strong>{en ? "Phone or text:" : "Teléfono o mensaje:"}</strong>{" "}
          <a href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
        </li>
      )}
    </ul>
  );
}

function ContentEs() {
  return (
    <div className={proseClass}>
      <h2>Nuestro compromiso</h2>
      <p>
        Queremos que cualquier persona, incluidas las personas con discapacidad, pueda usar MENIUS: este sitio, los
        menús y las páginas de pedidos de los restaurantes, y el panel de los restaurantes. Trabajamos para cumplir
        las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1, nivel AA.
      </p>

      <h2>Qué hacemos</h2>
      <ul>
        <li>Diseñamos las páginas para que se puedan usar con teclado y con lectores de pantalla como VoiceOver y TalkBack.</li>
        <li>Cuidamos el contraste del texto, el tamaño de los botones en el celular y que los formularios tengan etiquetas claras.</li>
        <li>Antes de publicar cambios importantes revisamos las páginas con herramientas automáticas de accesibilidad y a mano.</li>
        <li>Cuando alguien nos reporta una barrera, la tratamos como un error a corregir.</li>
      </ul>

      <h2>Limitaciones conocidas</h2>
      <ul>
        <li>
          Las fotos, los nombres y las descripciones de los platos los cargan los restaurantes. Algunas fotos pueden no
          tener una descripción completa.
        </li>
        <li>Los mapas de terceros (Google Maps) pueden no ser totalmente accesibles. La dirección siempre aparece también como texto.</li>
      </ul>

      <h2>¿Encontraste una barrera?</h2>
      <p>
        Escríbenos o llámanos y cuéntanos en qué página estabas y qué no pudiste hacer. Respondemos en un máximo de 5
        días hábiles.
      </p>
      <Contact en={false} />
      <p>
        Si no puedes completar un pedido en la página de un restaurante, llama directamente al restaurante: su teléfono
        aparece en su menú. Si no lo encuentras, te ayudamos a contactarlo.
      </p>

      <h2>Revisión</h2>
      <p>Revisamos esta declaración al menos una vez al año.</p>
    </div>
  );
}

function ContentEn() {
  return (
    <div className={proseClass}>
      <h2>Our commitment</h2>
      <p>
        We want everyone, including people with disabilities, to be able to use MENIUS: this website, restaurants&apos;
        menus and ordering pages, and the restaurant dashboard. We work to meet the Web Content Accessibility
        Guidelines (WCAG) 2.1, level AA.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>We design pages to work with a keyboard and with screen readers such as VoiceOver and TalkBack.</li>
        <li>We check text contrast, button sizes on phones, and clear labels on forms.</li>
        <li>Before we publish major changes, we review pages with automated accessibility tools and by hand.</li>
        <li>When someone reports a barrier, we treat it as a bug to fix.</li>
      </ul>

      <h2>Known limitations</h2>
      <ul>
        <li>Dish photos, names and descriptions are added by each restaurant. Some photos may not have a full description.</li>
        <li>Third-party maps (Google Maps) may not be fully accessible. The address is always shown as text too.</li>
      </ul>

      <h2>Found a barrier?</h2>
      <p>
        Email, call or text us and tell us which page you were on and what you couldn&apos;t do. We reply within 5
        business days.
      </p>
      <Contact en />
      <p>
        If you can&apos;t finish an order on a restaurant&apos;s page, call the restaurant directly: its phone number is on
        its menu. If you can&apos;t find it, we&apos;ll help you reach them.
      </p>

      <h2>Review</h2>
      <p>We review this statement at least once a year.</p>
    </div>
  );
}

export default async function AccessibilityPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("menius_locale")?.value === "en" ? "en" : "es") as LandingLocale;
  const en = locale === "en";

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav locale={locale} />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-5">Legal</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-3">
            {en ? "Accessibility Statement" : "Declaración de accesibilidad"}
          </h1>
          <p className="text-sm text-gray-500">
            {en ? `Last updated: ${UPDATED.en}` : `Última actualización: ${UPDATED.es}`}
          </p>
        </div>
      </section>

      <div className="separator-gradient max-w-3xl mx-auto" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        {en ? <ContentEn /> : <ContentEs />}
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
