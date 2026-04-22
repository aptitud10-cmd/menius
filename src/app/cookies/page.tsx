import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';

export const metadata: Metadata = {
  title: 'Política de Cookies — MENIUS',
  description: 'Política de cookies de MENIUS. Qué cookies usamos y por qué.',
  alternates: { canonical: '/cookies' },
};

const proseClass = 'prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-th:bg-white/[0.04] prose-th:text-gray-300 prose-th:text-[13px] prose-td:text-gray-400 prose-td:text-[13px] prose-td:border-b prose-td:border-white/[0.06] prose-code:text-emerald-300 prose-code:bg-emerald-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none';

function ContentEs() {
  return (
    <div className={proseClass}>
      <h2>1. ¿Qué son las Cookies?</h2>
      <p>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (computadora, tableta o teléfono) cuando visitas un sitio web. Las cookies permiten que el sitio web recuerde tus acciones y preferencias durante un periodo de tiempo.</p>

      <h2>2. Cookies que Utilizamos</h2>
      <h3>2.1 Cookies Estrictamente Necesarias</h3>
      <p>Estas cookies son esenciales para el funcionamiento de la Plataforma. Sin ellas, no podrías iniciar sesión ni usar las funciones básicas. <strong>No requieren tu consentimiento</strong> ya que son necesarias para proveer el servicio.</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table>
          <thead><tr><th>Cookie</th><th>Proveedor</th><th>Propósito</th><th>Duración</th></tr></thead>
          <tbody>
            <tr><td><code>sb-access-token</code></td><td>Supabase</td><td>Token de autenticación para mantener tu sesión activa</td><td>1 hora</td></tr>
            <tr><td><code>sb-refresh-token</code></td><td>Supabase</td><td>Token de refresco para renovar tu sesión sin necesidad de iniciar sesión nuevamente</td><td>7 días</td></tr>
            <tr><td><code>menius-cookie-consent</code></td><td>MENIUS</td><td>Recuerda tu preferencia sobre cookies</td><td>365 días</td></tr>
          </tbody>
        </table>
      </div>

      <h3>2.2 Cookies Funcionales</h3>
      <p>Estas cookies mejoran la funcionalidad de la Plataforma recordando tus preferencias.</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table>
          <thead><tr><th>Cookie</th><th>Proveedor</th><th>Propósito</th><th>Duración</th></tr></thead>
          <tbody>
            <tr><td><code>menius-cart</code></td><td>MENIUS</td><td>Almacena el contenido del carrito de compras en el menú público (localStorage)</td><td>Sesión</td></tr>
          </tbody>
        </table>
      </div>

      <h3>2.3 Cookies de Terceros para Pagos</h3>
      <p>Cuando realizas un pago, Stripe puede establecer cookies propias para procesar la transacción de forma segura y prevenir fraudes.</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table>
          <thead><tr><th>Cookie</th><th>Proveedor</th><th>Propósito</th><th>Más información</th></tr></thead>
          <tbody>
            <tr><td><code>__stripe_mid</code></td><td>Stripe</td><td>Identificador de sesión para procesamiento de pagos</td><td><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">Stripe Cookie Policy</a></td></tr>
            <tr><td><code>__stripe_sid</code></td><td>Stripe</td><td>Identificador de sesión para prevención de fraude</td><td><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">Stripe Cookie Policy</a></td></tr>
          </tbody>
        </table>
      </div>

      <h2>3. Cookies de Análisis y Marketing</h2>
      <p><strong>Actualmente, MENIUS no utiliza cookies de análisis (como Google Analytics) ni cookies de marketing o publicidad.</strong> Si en el futuro implementamos este tipo de cookies, actualizaremos esta política y solicitaremos tu consentimiento antes de instalarlas.</p>

      <h2>4. Cómo Gestionar las Cookies</h2>
      <p>Puedes controlar las cookies de varias formas:</p>
      <ul>
        <li><strong>Banner de consentimiento:</strong> al visitar MENIUS por primera vez, puedes aceptar o configurar tus preferencias de cookies.</li>
        <li><strong>Configuración del navegador:</strong> la mayoría de los navegadores te permiten bloquear o eliminar cookies. Consulta la documentación de tu navegador:
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
            <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
          </ul>
        </li>
      </ul>
      <p><strong>Nota:</strong> si bloqueas las cookies estrictamente necesarias, es posible que no puedas iniciar sesión ni usar ciertas funciones de la Plataforma.</p>

      <h2>5. Tecnologías Similares</h2>
      <p>Además de cookies, utilizamos <strong>localStorage</strong> del navegador para almacenar temporalmente datos como el contenido del carrito de compras en el menú público. Estos datos permanecen en tu dispositivo y no se envían a nuestros servidores hasta que confirmas un pedido.</p>

      <h2>6. Cambios a esta Política</h2>
      <p>Podemos actualizar esta Política de Cookies en cualquier momento. Si realizamos cambios significativos (como agregar cookies de análisis o marketing), te notificaremos y solicitaremos tu consentimiento nuevamente.</p>

      <h2>7. Contacto</h2>
      <p>Si tienes preguntas sobre nuestra Política de Cookies:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:soporte@menius.app">soporte@menius.app</a></li>
        <li><strong>Sitio web:</strong> <a href="https://menius.app">menius.app</a></li>
      </ul>
    </div>
  );
}

function ContentEn() {
  return (
    <div className={proseClass}>
      <h2>1. What Are Cookies?</h2>
      <p>Cookies are small text files stored on your device (computer, tablet, or phone) when you visit a website. Cookies allow the website to remember your actions and preferences over a period of time.</p>

      <h2>2. Cookies We Use</h2>
      <h3>2.1 Strictly Necessary Cookies</h3>
      <p>These cookies are essential for the Platform to function. Without them, you would not be able to sign in or use basic features. <strong>They do not require your consent</strong> as they are necessary to provide the service.</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table>
          <thead><tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td><code>sb-access-token</code></td><td>Supabase</td><td>Authentication token to keep your session active</td><td>1 hour</td></tr>
            <tr><td><code>sb-refresh-token</code></td><td>Supabase</td><td>Refresh token to renew your session without signing in again</td><td>7 days</td></tr>
            <tr><td><code>menius-cookie-consent</code></td><td>MENIUS</td><td>Remembers your cookie preference</td><td>365 days</td></tr>
          </tbody>
        </table>
      </div>

      <h3>2.2 Functional Cookies</h3>
      <p>These cookies enhance the Platform&apos;s functionality by remembering your preferences.</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table>
          <thead><tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td><code>menius-cart</code></td><td>MENIUS</td><td>Stores shopping cart contents in the public menu (localStorage)</td><td>Session</td></tr>
          </tbody>
        </table>
      </div>

      <h3>2.3 Third-Party Cookies for Payments</h3>
      <p>When you make a payment, Stripe may set its own cookies to process the transaction securely and prevent fraud.</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table>
          <thead><tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>More Info</th></tr></thead>
          <tbody>
            <tr><td><code>__stripe_mid</code></td><td>Stripe</td><td>Session identifier for payment processing</td><td><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">Stripe Cookie Policy</a></td></tr>
            <tr><td><code>__stripe_sid</code></td><td>Stripe</td><td>Session identifier for fraud prevention</td><td><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">Stripe Cookie Policy</a></td></tr>
          </tbody>
        </table>
      </div>

      <h2>3. Analytics and Marketing Cookies</h2>
      <p><strong>Currently, MENIUS does not use analytics cookies (such as Google Analytics) or marketing/advertising cookies.</strong> If we implement such cookies in the future, we will update this policy and request your consent before installing them.</p>

      <h2>4. How to Manage Cookies</h2>
      <p>You can control cookies in several ways:</p>
      <ul>
        <li><strong>Consent banner:</strong> when visiting MENIUS for the first time, you can accept or configure your cookie preferences.</li>
        <li><strong>Browser settings:</strong> most browsers allow you to block or delete cookies. Check your browser&apos;s documentation:
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
          </ul>
        </li>
      </ul>
      <p><strong>Note:</strong> if you block strictly necessary cookies, you may not be able to sign in or use certain features of the Platform.</p>

      <h2>5. Similar Technologies</h2>
      <p>In addition to cookies, we use the browser&apos;s <strong>localStorage</strong> to temporarily store data such as shopping cart contents in the public menu. This data remains on your device and is not sent to our servers until you confirm an order.</p>

      <h2>6. Changes to This Policy</h2>
      <p>We may update this Cookie Policy at any time. If we make significant changes (such as adding analytics or marketing cookies), we will notify you and request your consent again.</p>

      <h2>7. Contact</h2>
      <p>If you have questions about our Cookie Policy:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:soporte@menius.app">soporte@menius.app</a></li>
        <li><strong>Website:</strong> <a href="https://menius.app">menius.app</a></li>
      </ul>
    </div>
  );
}

function getHero(locale: LandingLocale) {
  if (locale === 'en') return { badge: 'Legal', title: 'Cookie Policy', date: 'Last updated: February 16, 2026' };
  return { badge: 'Legal', title: 'Política de Cookies', date: 'Última actualización: 16 de febrero de 2026' };
}

export default async function CookiesPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  const hero = getHero(locale);

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav locale={locale} />

      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-5">{hero.badge}</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-3">{hero.title}</h1>
          <p className="text-sm text-gray-500">{hero.date}</p>
        </div>
      </section>

      <div className="separator-gradient max-w-3xl mx-auto" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        {locale === 'en' ? <ContentEn /> : <ContentEs />}
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
