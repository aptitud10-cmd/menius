import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import { V2Page } from "@/components/landing-v2/V2Page";
import { resolveLandingV2Locale } from "@/lib/landing-v2-copy";
import { SUPPORT_CONTACT, supportWhatsAppUrl } from "@/lib/support-contact";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = {
  title: "Professional Setup",
  description:
    "Professional setup for your restaurant: we load your menu, set up the tablet and printer and train your staff. One-time fee by menu size.",
  alternates: { canonical: "/setup-profesional" },
  openGraph: {
    title: "Professional Setup — MENIUS",
    description:
      "Professional setup for your restaurant: we load your menu, set up the tablet and printer and train your staff. One-time fee by menu size.",
    type: "website",
  },
};

const t = {
  es: {
    badge: "Servicio profesional",
    heroLine1: "Tú cocinas.",
    heroLine2: "Nosotros digitalizamos.",
    heroDesc:
      "Nuestro equipo carga tu menú, instala la tablet y la impresora, y capacita a tu equipo, para que tu restaurante quede listo para recibir pedidos en línea. Las fotos son opcionales: $10 por plato.",
    processTitle: "¿Cómo funciona?",
    processSteps: [
      {
        title: "Solicitud",
        desc: "Llena el formulario con la información de tu restaurante y elige el paquete que necesitas.",
      },
      {
        title: "Confirmación",
        desc: "Te contactamos en menos de 24 horas para confirmar detalles y coordinar el inicio.",
      },
      {
        title: "Configuración",
        desc: "Nuestro equipo configura tu menú, tu marca y todos tus productos.",
      },
      {
        title: "¡Listo!",
        desc: "Revisamos contigo el resultado, hacemos ajustes y tu restaurante queda online.",
      },
    ],
    packagesTitle: "Elige tu paquete",
    packagesDesc:
      "Pago único según el tamaño de tu menú. Gratis si eliges el plan anual. Si algo no quedó como querías, lo corregimos sin costo.",
    packages: [
      {
        id: "setup-esencial",
        name: "Setup Esencial",
        price: 299,
        tag: null as string | null,
        tagHighlight: false,
        desc: "Para menús de hasta 80 platos.",
        includes: [
          "Menú completo con categorías, opciones y extras",
          "Logo, colores y portada de tu marca",
          "Pickup, delivery con tu zona y QR para mesas",
          "Pagos con tarjeta conectados (Stripe)",
          "Tablet de pedidos e impresora configuradas",
          "Capacitación para tu equipo, en tu local o por videollamada",
        ],
        timeline: "3-5 días hábiles",
        monthly: false,
      },
      {
        id: "setup-completo",
        name: "Setup Completo",
        price: 499,
        tag: "Recomendado",
        tagHighlight: true,
        desc: "Para menús de 81 a 200 platos.",
        includes: [
          "Todo lo de Setup Esencial",
          "Dominio propio configurado",
          "Perfil de Google con botón para pedir online",
          "QR y material impreso para tus bolsas y mesas",
          "Revisión del menú contigo antes de publicar",
        ],
        timeline: "5-7 días hábiles",
        monthly: false,
      },
      {
        id: "setup-grande",
        name: "Setup Grande",
        price: 899,
        tag: null as string | null,
        tagHighlight: false,
        desc: "Para menús de más de 200 platos, como diners.",
        includes: [
          "Todo lo de Setup Completo",
          "Menús por horario (desayuno, almuerzo, cena)",
          "Platos del día y sopas que cambian",
          "Acompañamiento directo durante la primera semana",
        ],
        timeline: "1-2 semanas",
        monthly: false,
      },
      {
        id: "sitio-web",
        name: "Sitio web del restaurante",
        price: 1200,
        tag: "Opcional",
        tagHighlight: false,
        desc: "Tu propio sitio, diseñado a medida y conectado a tus pedidos.",
        includes: [
          "Diseño a medida con tu marca y tus fotos",
          "Historia, platos favoritos, horarios, ubicación y reseñas",
          "Botón de pedir conectado a tu tienda MENIUS",
          "Se ve bien en celular, tablet y computadora",
          "Dominio y hosting incluidos mientras tengas Pro",
          "2 rondas de cambios",
        ],
        timeline: "2-3 semanas",
        monthly: false,
      },
    ],
    priceOneTime: "USD · pago único",
    priceMonthly: "USD/mes",
    ctaPrefix: "Solicitar",
    formTitle: "Solicitar Setup Profesional",
    formDesc: "Llena el formulario y te contactamos en menos de 24 horas.",
    formLoading: "Cargando formulario...",
    faqTitle: "Preguntas sobre el servicio",
    heroCta: "Solicitar Setup Profesional",
    seePackages: "Ver los paquetes",
    talk: "Habla con nosotros",
    freeAnnual: "Gratis con el plan anual.",
    faqs: [
      {
        q: "¿Qué necesito para empezar?",
        a: "Solo tu menú (foto, PDF o lista) y tu logo. Nosotros nos encargamos de todo lo demás: categorías, productos, precios, QR y configuración completa.",
      },
      {
        q: "¿Cómo generan las fotos de los platos?",
        a: "Nos mandas fotos de tus platos sacadas con el celular y las mejoramos con inteligencia artificial para que se vean como una sesión profesional. Las fotos son opcionales: $10 por plato.",
      },
      {
        q: "¿Puedo hacer cambios después?",
        a: "Sí. Una vez configurado, tienes acceso completo a tu dashboard para editar cualquier cosa. Y si prefieres, nos escribes y lo cambiamos por ti: está incluido en Pro.",
      },
      {
        q: "¿Y si algo no queda bien?",
        a: "Si algo no quedó como querías, lo corregimos sin costo.",
      },
      {
        q: "¿Tengo que comprar equipo?",
        a: "No es obligatorio: MENIUS funciona en cualquier tablet, celular o computadora. Si quieres una tablet para el mostrador y una impresora de tickets, te las conseguimos al costo, sin ganancia para nosotros, y son tuyas. Para imprimir tickets se usa una tablet Android con la app MENIUS Counter.",
      },
      {
        q: "¿Necesito una suscripción mensual también?",
        a: "Sí, el servicio de setup es adicional a tu suscripción de MENIUS (plan Pro, $149/mes o $1,490/año). El setup es un pago único que cubre la configuración inicial completa, y es gratis si eliges el plan anual.",
      },
    ],
  },
  en: {
    badge: "Professional service",
    heroLine1: "You cook.",
    heroLine2: "We handle the tech.",
    heroDesc:
      "Our team loads your menu, sets up the tablet and printer, and trains your staff, so your restaurant is ready to take online orders. Photos are optional: $10 per dish.",
    processTitle: "How does it work?",
    processSteps: [
      {
        title: "Request",
        desc: "Fill out the form with your restaurant's details and pick the package you need.",
      },
      {
        title: "Confirmation",
        desc: "We contact you within 24 hours to confirm details and coordinate the start.",
      },
      {
        title: "Setup",
        desc: "Our team sets up your menu, your branding and all your products.",
      },
      {
        title: "Done!",
        desc: "We review the result with you, make adjustments, and your restaurant goes live.",
      },
    ],
    packagesTitle: "Choose your package",
    packagesDesc:
      "One-time fee based on the size of your menu. Free with the annual plan. If anything isn't right, we fix it at no cost.",
    packages: [
      {
        id: "setup-esencial",
        name: "Essential Setup",
        price: 299,
        tag: null as string | null,
        tagHighlight: false,
        desc: "For menus with up to 80 items.",
        includes: [
          "Full menu with categories, options and add-ons",
          "Your logo, colors and cover photo",
          "Pickup, delivery with your own zone, and table QR codes",
          "Card payments connected (Stripe)",
          "Order tablet and printer set up",
          "Staff training, at your restaurant or by video call",
        ],
        timeline: "3-5 business days",
        monthly: false,
      },
      {
        id: "setup-completo",
        name: "Complete Setup",
        price: 499,
        tag: "Recommended",
        tagHighlight: true,
        desc: "For menus with 81 to 200 items.",
        includes: [
          "Everything in Essential Setup",
          "Custom domain configured",
          "Google profile with an Order online button",
          "QR codes and printed inserts for bags and tables",
          "Menu review with you before going live",
        ],
        timeline: "5-7 business days",
        monthly: false,
      },
      {
        id: "setup-grande",
        name: "Large Setup",
        price: 899,
        tag: null as string | null,
        tagHighlight: false,
        desc: "For menus with more than 200 items, like diners.",
        includes: [
          "Everything in Complete Setup",
          "Menus by time of day (breakfast, lunch, dinner)",
          "Daily specials and rotating soups",
          "Hands-on support during your first week",
        ],
        timeline: "1-2 weeks",
        monthly: false,
      },
      {
        id: "sitio-web",
        name: "Restaurant website",
        price: 1200,
        tag: "Optional",
        tagHighlight: false,
        desc: "Your own website, custom-designed and connected to your orders.",
        includes: [
          "Custom design with your brand and your photos",
          "Your story, favorite dishes, hours, location and reviews",
          "Order button connected to your MENIUS store",
          "Looks great on phone, tablet and computer",
          "Domain and hosting included while you're on Pro",
          "2 rounds of changes",
        ],
        timeline: "2-3 weeks",
        monthly: false,
      },
    ],
    priceOneTime: "USD · one-time",
    priceMonthly: "USD/mo",
    ctaPrefix: "Request",
    formTitle: "Request Professional Setup",
    formDesc: "Fill out the form and we'll contact you within 24 hours.",
    formLoading: "Loading form...",
    faqTitle: "Service FAQ",
    heroCta: "Request Professional Setup",
    seePackages: "See the packages",
    talk: "Talk to us",
    freeAnnual: "Free with the annual plan.",
    faqs: [
      {
        q: "What do I need to get started?",
        a: "Just your menu (photo, PDF, or list) and your logo. We handle everything else: categories, products, prices, QR codes, and full setup.",
      },
      {
        q: "How do you generate the food photos?",
        a: "You send us phone photos of your dishes and we enhance them with AI so they look like a professional shoot. Photos are optional: $10 per dish.",
      },
      {
        q: "Can I make changes later?",
        a: "Yes. Once set up, you have full access to your dashboard to edit anything. Or just message us and we'll change it for you: it's included in Pro.",
      },
      {
        q: "What if something isn't right?",
        a: "If anything isn't right, we fix it at no cost.",
      },
      {
        q: "Do I need to buy equipment?",
        a: "It's not required: MENIUS works on any tablet, phone or computer. If you want a counter tablet and a ticket printer, we get them for you at cost, with no markup, and they're yours. Ticket printing uses an Android tablet with the MENIUS Counter app.",
      },
      {
        q: "Do I need a monthly subscription too?",
        a: "Yes, the setup service is in addition to your MENIUS subscription (Pro plan, $149/mo or $1,490/yr). The setup is a one-time payment that covers the full initial configuration, and it's free with the annual plan.",
      },
    ],
  },
} as const;

const CLOCK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export default async function SetupProfesionalPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
  const s = t[locale];
  const tiers = s.packages.filter((p) => p.id !== "sitio-web");
  const site = s.packages.find((p) => p.id === "sitio-web");
  const wa = supportWhatsAppUrl();

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph setup-hero">
          <div className="wrap">
            <div>
              <span className="stamp label">{s.badge}</span>
              <h1>
                {s.heroLine1} <span className="voice">{s.heroLine2}</span>
              </h1>
              <p className="lead">{s.heroDesc}</p>
              <div className="row">
                <a className="btn btn-primary" href="#solicitar">{s.heroCta}</a>
                <a className="tlink" href="#packages">{s.seePackages}</a>
              </div>
            </div>
            {/* Tarjeta oscura del pliegue: solo contacto + "gratis con el plan anual" (los precios van en los paquetes). */}
            <aside className="contact">
              <p className="k">{s.talk}</p>
              <a className="big" href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
              <div className="alt">
                {wa && (
                  <a className="tlink" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                )}
                <a className="tlink" href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
              </div>
              <p className="free">{s.freeAnnual}</p>
            </aside>
          </div>
        </header>

        <section className="chap tight alt" id="packages" aria-labelledby="pk-h">
          <div className="wrap">
            <div className="pk-head">
              <h2 id="pk-h" className="h-a">{s.packagesTitle}</h2>
              <p className="lead">{s.packagesDesc}</p>
            </div>
            <div className="pkgs">
              {tiers.map((pkg) => (
                <article key={pkg.id} className={pkg.tagHighlight ? "pkg rec" : "pkg"}>
                  {pkg.tag && <span className="tag stamp label">{pkg.tag}</span>}
                  <h3>{pkg.name}</h3>
                  <p className="for">{pkg.desc}</p>
                  <div className="price">
                    <b>${pkg.price.toLocaleString("en-US")}</b>
                    <span>{pkg.monthly ? s.priceMonthly : s.priceOneTime}</span>
                  </div>
                  <p className="when">{CLOCK}{pkg.timeline}</p>
                  <ul>
                    {pkg.includes.map((f, i) => (
                      <li key={f} className={i === 0 && pkg.id !== "setup-esencial" ? "inh" : undefined}>{f}</li>
                    ))}
                  </ul>
                  <div className="go">
                    <a className="btn btn-primary" href="#solicitar">
                      {s.ctaPrefix} {pkg.name}
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {site && (
              <article className="site-pkg">
                <div className="browser">
                  <div className="browser-bar">
                    <i /><i /><i />
                    <span>thegrillhouse.com</span>
                  </div>
                  <Image
                    src="/landing/v2/site-desktop-v1.webp"
                    alt={locale === "es" ? "Un sitio web de restaurante hecho con MENIUS, en computadora" : "A restaurant website made with MENIUS, on desktop"}
                    width={1600}
                    height={1000}
                    quality={78}
                    sizes="(max-width: 1100px) calc(100vw - 104px), 460px"
                  />
                </div>
                <div className="pkg site-copy">
                  {site.tag && <span className="stamp label site-tag">{site.tag}</span>}
                  <h3>{site.name}</h3>
                  <p className="for">{site.desc}</p>
                  <div className="price">
                    <b>${site.price.toLocaleString("en-US")}</b>
                    <span>{s.priceOneTime}</span>
                  </div>
                  <p className="when">{CLOCK}{site.timeline}</p>
                  <ul>
                    {site.includes.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="go">
                    <a className="tlink" href="#solicitar">
                      {s.ctaPrefix} {site.name}
                    </a>
                  </div>
                </div>
              </article>
            )}
          </div>
        </section>

        <section className="chap" id="solicitar" aria-labelledby="rq-h">
          <div className="wrap req-grid">
            <div>
              <h2 id="rq-h" className="h-b">{s.formTitle}</h2>
              <p className="lead req-lead">{s.formDesc}</p>
              <ol className="steps req-steps" aria-label={s.processTitle}>
                {s.processSteps.map((step, i) => (
                  <li key={step.title}>
                    <span className="n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <Suspense fallback={<div className="auth-card req-card"><p className="hint">{s.formLoading}</p></div>}>
              <SetupForm
                packages={s.packages.map((p) => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                }))}
                locale={locale}
              />
            </Suspense>
          </div>
        </section>

        <section className="chap tight alt" aria-labelledby="sfaq-h">
          <div className="wrap">
            <div className="sfaq">
              <h2 id="sfaq-h" className="h-b">{s.faqTitle}</h2>
              {s.faqs.map((faq, i) => (
                <details key={faq.q} className="q" open={i === 0}>
                  <summary>{faq.q}</summary>
                  <div className="a">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </V2Page>
  );
}
