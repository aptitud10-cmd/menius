import Link from 'next/link';
import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Política de Cookies — MENIUS',
  description: 'Política de cookies de MENIUS. Qué cookies usamos y por qué.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <p className="text-sm text-purple-400 uppercase tracking-[0.2em] font-medium mb-5">Legal</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-3">
            Política de Cookies
          </h1>
          <p className="text-sm text-gray-500">Última actualización: 16 de febrero de 2026</p>
        </div>
      </section>

      <div className="separator-gradient max-w-3xl mx-auto" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-th:bg-white/[0.04] prose-th:text-gray-300 prose-th:text-[13px] prose-td:text-gray-400 prose-td:text-[13px] prose-td:border-b prose-td:border-white/[0.06] prose-code:text-purple-300 prose-code:bg-purple-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">

          <h2>1. ¿Qué son las Cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (computadora, tableta o teléfono) cuando visitas un sitio web. Las cookies permiten que el sitio web recuerde tus acciones y preferencias durante un periodo de tiempo.
          </p>

          <h2>2. Cookies que Utilizamos</h2>

          <h3>2.1 Cookies Estrictamente Necesarias</h3>
          <p>
            Estas cookies son esenciales para el funcionamiento de la Plataforma. Sin ellas, no podrías iniciar sesión ni usar las funciones básicas. <strong>No requieren tu consentimiento</strong> ya que son necesarias para proveer el servicio.
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Proveedor</th>
                  <th>Propósito</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>sb-access-token</code></td>
                  <td>Supabase</td>
                  <td>Token de autenticación para mantener tu sesión activa</td>
                  <td>1 hora</td>
                </tr>
                <tr>
                  <td><code>sb-refresh-token</code></td>
                  <td>Supabase</td>
                  <td>Token de refresco para renovar tu sesión sin necesidad de iniciar sesión nuevamente</td>
                  <td>7 días</td>
                </tr>
                <tr>
                  <td><code>menius-cookie-consent</code></td>
                  <td>MENIUS</td>
                  <td>Recuerda tu preferencia sobre cookies</td>
                  <td>365 días</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.2 Cookies Funcionales</h3>
          <p>
            Estas cookies mejoran la funcionalidad de la Plataforma recordando tus preferencias.
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Proveedor</th>
                  <th>Propósito</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>menius-cart</code></td>
                  <td>MENIUS</td>
                  <td>Almacena el contenido del carrito de compras en el menú público (localStorage)</td>
                  <td>Sesión</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.3 Cookies de Terceros para Pagos</h3>
          <p>
            Cuando realizas un pago, Stripe puede establecer cookies propias para procesar la transacción de forma segura y prevenir fraudes.
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Proveedor</th>
                  <th>Propósito</th>
                  <th>Más información</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>__stripe_mid</code></td>
                  <td>Stripe</td>
                  <td>Identificador de sesión para procesamiento de pagos</td>
                  <td><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">Stripe Cookie Policy</a></td>
                </tr>
                <tr>
                  <td><code>__stripe_sid</code></td>
                  <td>Stripe</td>
                  <td>Identificador de sesión para prevención de fraude</td>
                  <td><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">Stripe Cookie Policy</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>3. Cookies de Análisis y Marketing</h2>
          <p>
            <strong>Actualmente, MENIUS no utiliza cookies de análisis (como Google Analytics) ni cookies de marketing o publicidad.</strong> Si en el futuro implementamos este tipo de cookies, actualizaremos esta política y solicitaremos tu consentimiento antes de instalarlas.
          </p>

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
          <p>
            <strong>Nota:</strong> si bloqueas las cookies estrictamente necesarias, es posible que no puedas iniciar sesión ni usar ciertas funciones de la Plataforma.
          </p>

          <h2>5. Tecnologías Similares</h2>
          <p>
            Además de cookies, utilizamos <strong>localStorage</strong> del navegador para almacenar temporalmente datos como el contenido del carrito de compras en el menú público. Estos datos permanecen en tu dispositivo y no se envían a nuestros servidores hasta que confirmas un pedido.
          </p>

          <h2>6. Cambios a esta Política</h2>
          <p>
            Podemos actualizar esta Política de Cookies en cualquier momento. Si realizamos cambios significativos (como agregar cookies de análisis o marketing), te notificaremos y solicitaremos tu consentimiento nuevamente.
          </p>

          <h2>7. Contacto</h2>
          <p>Si tienes preguntas sobre nuestra Política de Cookies:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:soportemenius@gmail.com">soportemenius@gmail.com</a></li>
            <li><strong>Sitio web:</strong> <a href="https://menius.app">menius.app</a></li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-black overflow-hidden">
        <div className="separator-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 bg-black pt-10 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                <p className="text-[13px] text-gray-600 mt-4 leading-relaxed max-w-[200px]">Menús digitales y pedidos en línea para restaurantes.</p>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/#funciones" className="text-[13px] text-gray-600 hover:text-white transition-colors">Funciones</Link></li>
                  <li><Link href="/#precios" className="text-[13px] text-gray-600 hover:text-white transition-colors">Precios</Link></li>
                  <li><Link href="/r/demo" className="text-[13px] text-gray-600 hover:text-white transition-colors">Demo en vivo</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-[13px] text-gray-600 hover:text-white transition-colors">Blog</Link></li>
                  <li><Link href="/faq" className="text-[13px] text-gray-600 hover:text-white transition-colors">FAQ</Link></li>
                  <li><a href="mailto:soportemenius@gmail.com" className="text-[13px] text-gray-600 hover:text-white transition-colors">Soporte</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/privacy" className="text-[13px] text-gray-600 hover:text-white transition-colors">Privacidad</Link></li>
                  <li><Link href="/terms" className="text-[13px] text-gray-600 hover:text-white transition-colors">Términos</Link></li>
                  <li><Link href="/cookies" className="text-[13px] text-gray-600 hover:text-white transition-colors">Cookies</Link></li>
                </ul>
              </div>
            </div>
            <div className="separator-gradient mt-12" />
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-gray-700" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
              <p className="text-[11px] text-gray-700">
                Hecho en{' '}
                <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">Scuart Digital</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
