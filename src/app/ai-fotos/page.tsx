import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { V2Page } from '@/components/landing-v2/V2Page';
import '@/components/landing-v2/lv2-help.css';
import { getLandingV2Copy, resolveLandingV2Locale, type LandingV2Locale } from '@/lib/landing-v2-copy';
import { TRIAL_DAYS } from '@/lib/plans';
import { AiPhotoTry, type AiPhotoExample, type AiPhotoTryText } from './AiPhotoTry';

/**
 * /ai-fotos (fase 3 del rediseño). Lo que hace la función de verdad
 * (verificado en el código):
 * - Panel: Menú → Productos → un plato → "Generar con IA" (POST
 *   /api/ai/generate-image) crea la foto desde el nombre, la descripción y la
 *   categoría, con una referencia de estilo por categoría. "Fotos con IA" en
 *   Productos lo hace para todos los platos sin foto.
 * - Incluido en Pro (y en la prueba); el plan Free no lo tiene.
 * - El servicio de fotos profesionales ($10/plato, setup) es otra cosa: parte
 *   de fotos reales de tus platos (mismo texto que /setup-profesional).
 * Sin tiempos prometidos y sin nombres de proveedores.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  return locale === 'en'
    ? {
        title: 'AI photos for your menu',
        description: 'In your MENIUS dashboard, AI creates a photo of a dish from its name, description and category. Included in Pro. Send us phone photos of your real dishes and we enhance them for $10 per dish (optional).',
        alternates: { canonical: '/ai-fotos' },
      }
    : {
        title: 'Fotos con IA para tu menú',
        description: 'En tu panel de MENIUS, la IA crea la foto de un plato a partir de su nombre, su descripción y su categoría. Incluido en Pro. Si nos mandas fotos de tus platos reales sacadas con el celular, las mejoramos por $10 por plato (opcional).',
        alternates: { canonical: '/ai-fotos' },
      };
}

type Card = { tag?: string; title: string; for: string; price: string; priceWord: boolean; unit: string; items: string[]; link: { href: string; label: string } };

const T: Record<LandingV2Locale, {
  badge: string;
  h1: string;
  h1Voice: string;
  lead: string;
  tryHere: string;
  findTitle: string;
  find: { b: string; p: string }[];
  cmpTitle: string;
  cmpLead: string;
  cards: Card[];
  tryText: AiPhotoTryText;
  examples: AiPhotoExample[];
  endTitle: string;
  endText: string;
  endSetup: string;
}> = {
  en: {
    badge: 'AI photos',
    h1: 'A dish without a photo?',
    h1Voice: 'Create one with AI.',
    lead: 'In your dashboard, MENIUS creates a photo of a dish from its name, description and category. It’s included in Pro at no extra cost. Use it for the dishes you haven’t photographed yet.',
    tryHere: 'Try it here',
    findTitle: 'Where it is in your dashboard',
    find: [
      { b: 'One dish', p: 'Menu → Products → open the dish → Generate with AI. The photo shows up on the dish; save it, or create another one.' },
      { b: 'Several dishes at once', p: 'Menu → Products → AI Photos. It creates a photo for each dish that doesn’t have one.' },
      { b: 'Included in Pro', p: `Also during the ${TRIAL_DAYS}-day free trial. Not on the Free plan.` },
    ],
    cmpTitle: 'Two different things',
    cmpLead: 'The AI photo in your dashboard and our photo service aren’t the same. Choose what fits each dish.',
    cards: [
      {
        title: 'AI photo in your dashboard',
        for: 'You create it yourself, from the dish’s name.',
        price: 'Included',
        priceWord: true,
        unit: 'in Pro',
        items: [
          'Made from the dish’s name, description and category',
          'Dishes in the same category keep a similar look',
          'It’s an illustration, not a photo of your plate: check that it looks like what you serve',
          'Replace it with your own photo whenever you have one',
        ],
        link: { href: '#try', label: 'Try it below' },
      },
      {
        tag: 'Optional',
        title: 'Professional photos',
        for: 'You send us phone photos; we do the rest.',
        price: '$10',
        priceWord: false,
        unit: 'per dish',
        items: [
          'You send us photos of your dishes, taken with your phone',
          'We enhance them with AI so they look like a professional shoot',
          'Optional: you choose which dishes',
        ],
        link: { href: '/setup-profesional', label: 'See Professional Setup' },
      },
    ],
    tryText: {
      title: 'Try it with one of your dishes',
      lead: 'Write the name of a dish and see the kind of photo the AI creates.',
      note: 'Without an account you can try 2 times per hour. In your dashboard, the AI also uses the dish’s description and category.',
      label: 'Dish name',
      placeholder: 'Bacon cheeseburger with fries',
      create: 'Create photo',
      creating: 'Creating the photo…',
      exampleCap: 'Created with AI in the MENIUS dashboard.',
      resultCap: 'Created with AI just now.',
      open: 'Open full size',
      again: 'Create another photo',
      errEmpty: 'Write the name of the dish.',
      errLimit: 'You’ve used the 2 free tries for this hour. Create your account to keep going in your dashboard.',
      errDefault: 'We couldn’t create the photo. Try a different dish name, or try again in a few minutes.',
      errNetwork: 'Network error. Check your connection and try again.',
    },
    examples: [
      { src: '/landing/v2/ai-example-omelette-v1.webp', name: 'Chicken and peppers omelette', alt: 'AI photo of an omelette with chicken, peppers and onions, home fries and toast' },
      { src: '/landing/v2/ai-example-burrito-v1.webp', name: 'Breakfast burrito', alt: 'AI photo of a breakfast burrito with chorizo and scrambled eggs, with home fries' },
    ],
    endTitle: `${TRIAL_DAYS} days of Pro, free.`,
    endText: 'AI photos are included. No card, no contract.',
    endSetup: 'Or let us do it: Professional Setup',
  },
  es: {
    badge: 'Fotos con IA',
    h1: '¿Un plato sin foto?',
    h1Voice: 'Créala con IA.',
    lead: 'En tu panel, MENIUS crea la foto de un plato a partir de su nombre, su descripción y su categoría. Está incluido en Pro, sin costo extra. Úsala para los platos que todavía no has fotografiado.',
    tryHere: 'Pruébalo aquí',
    findTitle: 'Dónde está en tu panel',
    find: [
      { b: 'Un plato', p: 'Menú → Productos → abre el plato → Generar con IA. La foto aparece en el plato; guárdala o crea otra.' },
      { b: 'Varios platos a la vez', p: 'Menú → Productos → Fotos con IA. Crea una foto para cada plato que no tiene.' },
      { b: 'Incluido en Pro', p: `También durante la prueba gratis de ${TRIAL_DAYS} días. No está en el plan Free.` },
    ],
    cmpTitle: 'Dos cosas distintas',
    cmpLead: 'La foto con IA de tu panel y nuestro servicio de fotos no son lo mismo. Elige lo que le sirve a cada plato.',
    cards: [
      {
        title: 'Foto con IA en tu panel',
        for: 'La creas tú, desde el nombre del plato.',
        price: 'Incluida',
        priceWord: true,
        unit: 'en Pro',
        items: [
          'Se hace con el nombre, la descripción y la categoría del plato',
          'Los platos de una misma categoría mantienen un estilo parecido',
          'Es una ilustración, no una foto de tu plato: revisa que se parezca a lo que sirves',
          'Cámbiala por tu propia foto cuando la tengas',
        ],
        link: { href: '#try', label: 'Pruébala abajo' },
      },
      {
        tag: 'Opcional',
        title: 'Fotos profesionales',
        for: 'Nos mandas fotos del celular; nosotros hacemos el resto.',
        price: '$10',
        priceWord: false,
        unit: 'por plato',
        items: [
          'Nos mandas fotos de tus platos, sacadas con el celular',
          'Las mejoramos con IA para que se vean como una sesión profesional',
          'Opcional: tú eliges qué platos',
        ],
        link: { href: '/setup-profesional', label: 'Ver el Setup profesional' },
      },
    ],
    tryText: {
      title: 'Pruébalo con uno de tus platos',
      lead: 'Escribe el nombre de un plato y mira el tipo de foto que crea la IA.',
      note: 'Sin cuenta puedes probar 2 veces por hora. En tu panel, la IA también usa la descripción y la categoría del plato.',
      label: 'Nombre del plato',
      placeholder: 'Hamburguesa con tocino y papas',
      create: 'Crear foto',
      creating: 'Creando la foto…',
      exampleCap: 'Creadas con IA en el panel de MENIUS.',
      resultCap: 'Recién creada con IA.',
      open: 'Ver en tamaño completo',
      again: 'Crear otra foto',
      errEmpty: 'Escribe el nombre del plato.',
      errLimit: 'Ya usaste las 2 pruebas gratis de esta hora. Crea tu cuenta para seguir desde tu panel.',
      errDefault: 'No pudimos crear la foto. Prueba con otro nombre de plato o inténtalo de nuevo en unos minutos.',
      errNetwork: 'Error de red. Revisa tu conexión e inténtalo de nuevo.',
    },
    examples: [
      { src: '/landing/v2/ai-example-omelette-v1.webp', name: 'Omelette de pollo y pimientos', alt: 'Foto con IA de un omelette con pollo, pimientos y cebolla, papas y pan tostado' },
      { src: '/landing/v2/ai-example-burrito-v1.webp', name: 'Burrito de desayuno', alt: 'Foto con IA de un burrito de desayuno con chorizo y huevo revuelto, con papas' },
    ],
    endTitle: `${TRIAL_DAYS} días de Pro, gratis.`,
    endText: 'Las fotos con IA están incluidas. Sin tarjeta, sin contrato.',
    endSetup: 'O deja que lo hagamos nosotros: Setup profesional',
  },
};

export default async function AiFotosPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  const t = T[locale];
  const tryPro = getLandingV2Copy(locale).nav.tryPro;

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph help-hero">
          <div className="wrap">
            <div>
              <span className="stamp label">{t.badge}</span>
              <h1>
                {t.h1} <span className="voice">{t.h1Voice}</span>
              </h1>
              <p className="lead">{t.lead}</p>
              <div className="row">
                <Link className="btn btn-primary" href="/signup">{tryPro}</Link>
                <a className="tlink" href="#try">{t.tryHere}</a>
              </div>
            </div>
            <aside className="find" aria-labelledby="af-h">
              <h2 id="af-h">{t.findTitle}</h2>
              <ol>
                {t.find.map((f, i) => (
                  <li key={f.b}>
                    <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <b>{f.b}</b>
                      <p>{f.p}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </header>

        <section className="chap tight alt" aria-labelledby="ac-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="ac-h" className="h-a">{t.cmpTitle}</h2>
              <p className="lead">{t.cmpLead}</p>
            </div>
            <div className="pkgs two">
              {t.cards.map((c) => (
                <article key={c.title} className="pkg">
                  {c.tag && <span className="tag stamp label">{c.tag}</span>}
                  <h3>{c.title}</h3>
                  <p className="for">{c.for}</p>
                  <div className="price">
                    <b className={c.priceWord ? 'word' : undefined}>{c.price}</b>
                    <span>{c.unit}</span>
                  </div>
                  <ul>
                    {c.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                  <div className="go">
                    {c.link.href.startsWith('#')
                      ? <a className="tlink" href={c.link.href}>{c.link.label}</a>
                      : <Link className="tlink" href={c.link.href}>{c.link.label}</Link>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="chap tight" id="try" aria-labelledby="at-h">
          <div className="wrap">
            <AiPhotoTry t={t.tryText} examples={t.examples} headingId="at-h" />

            <section className="ask band-dark" aria-labelledby="ae-h">
              <div>
                <h2 id="ae-h">{t.endTitle}</h2>
                <p>{t.endText}</p>
              </div>
              <div className="acts">
                <Link className="btn btn-primary" href="/signup">{tryPro}</Link>
                <Link className="tlink" href="/setup-profesional">{t.endSetup}</Link>
              </div>
            </section>
          </div>
        </section>
      </main>
    </V2Page>
  );
}
