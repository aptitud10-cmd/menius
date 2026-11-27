import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { getLandingV2Copy, resolveLandingV2Locale } from '@/lib/landing-v2-copy';
import { V2Page } from '@/components/landing-v2/V2Page';

export const metadata: Metadata = {
  title: 'Demo',
  description: 'Explore live demos of MENIUS digital menus. Try the full experience — menu, cart, checkout & order tracking.',
  alternates: { canonical: '/demo' },
};

const t = {
  es: {
    badge: 'Demos en vivo',
    title: 'Explora MENIUS en acción',
    subtitle: 'Elige un restaurante de ejemplo y prueba la plataforma completa: menú, carrito, pago y seguimiento del pedido.',
    cards: [
      {
        slug: 'la-casa-del-sabor',
        name: 'La Casa del Sabor',
        lang: 'Español',
        desc: 'Demo completa de un restaurante mexicano: menú en español, opciones de cada plato, carrito y pago.',
        cta: 'Ver menú en vivo',
        shot: '/landing/v2/demo-casa-v1.webp',
        alt: 'Página de pedidos de La Casa del Sabor, en español',
      },
      {
        slug: 'the-grill-house',
        name: 'The Grill House',
        lang: 'English',
        desc: 'Demo completa de un restaurante estadounidense: menú en inglés, opciones de cada plato, carrito y pago.',
        cta: 'Ver menú en vivo (inglés)',
        shot: '/landing/v2/store-menu-v1.webp',
        alt: 'Página de pedidos de The Grill House, en inglés',
      },
    ],
    poweredBy: 'Ambas demos funcionan con datos de ejemplo. No se procesan pagos reales.',
    cta: '¿Listo para digitalizar tu restaurante?',
  },
  en: {
    badge: 'Live Demos',
    title: 'Explore MENIUS in action',
    subtitle: 'Choose a sample restaurant to see the full platform — menu, cart, checkout & order tracking.',
    cards: [
      {
        slug: 'the-grill-house',
        name: 'The Grill House',
        lang: 'English',
        desc: 'Full American grill demo with an English menu, add-ons, cart & checkout.',
        cta: 'View live menu',
        shot: '/landing/v2/store-menu-v1.webp',
        alt: 'The Grill House ordering page',
      },
      {
        slug: 'la-casa-del-sabor',
        name: 'La Casa del Sabor',
        lang: 'Español',
        desc: 'Full Mexican restaurant demo with a Spanish menu, add-ons, cart & checkout.',
        cta: 'View live menu (Spanish)',
        shot: '/landing/v2/demo-casa-v1.webp',
        alt: 'La Casa del Sabor ordering page, in Spanish',
      },
    ],
    poweredBy: 'Both demos use sample data. No real payments are processed.',
    cta: 'Ready to digitize your restaurant?',
  },
} as const;

export default async function DemoSelectorPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  const s = t[locale];
  const tryPro = getLandingV2Copy(locale).nav.tryPro;

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph">
          <div className="wrap">
            <span className="stamp label">{s.badge}</span>
            <h1>{s.title}</h1>
            <p className="lead">{s.subtitle}</p>
          </div>
        </header>

        <section className="demos" aria-label={s.badge}>
          <div className="wrap">
            <div className="demo-grid">
              {s.cards.map((card) => (
                <Link key={card.slug} className="demo-card" href={`/${card.slug}`}>
                  <div className="tile">
                    <div className="phone">
                      <div className="scr">
                        <Image src={card.shot} alt={card.alt} width={600} height={1298} quality={80} sizes="(max-width: 640px) 216px, (max-width: 1100px) 226px, 274px" />
                      </div>
                    </div>
                  </div>
                  <div className="body">
                    <p className="lang-tag">{card.lang}</p>
                    <h2>{card.name}</h2>
                    <p>{card.desc}</p>
                    <span className="tlink">{card.cta} →</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="demo-foot">
              <p>{s.poweredBy}</p>
              <div className="row">
                <span className="q">{s.cta}</span>
                <Link className="btn btn-primary" href="/signup">{tryPro}</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </V2Page>
  );
}
