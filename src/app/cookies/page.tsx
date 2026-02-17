import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies — MENIUS',
  description: 'Política de cookies de MENIUS. Qué cookies usamos y por qué.',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-brand-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 font-heading">
          Política de Cookies
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: 16 de febrero de 2026</p>

        <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">

          <h2>1. ¿Qué son las Cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (computadora, tableta o teléfono) cuando visitas un sitio web. Las cookies permiten que el sitio web recuerde tus acciones y preferencias durante un periodo de tiempo.
          </p>

          <h2>2. Cookies que Utilizamos</h2>

          <h3>2.1 Cookies Estrictamente Necesarias</h3>
          <p>
            Estas cookies son esenciales para el funcionamiento de la Plataforma. Sin ellas, no podrías iniciar sesión ni usar las funciones básicas. <strong>No requieren tu consentimiento</strong> ya que son necesarias para proveer el servicio.
          </p>

          <div className="overflow-x-auto">
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

          <div className="overflow-x-auto">
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

          <div className="overflow-x-auto">
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
            <li><strong>Email:</strong> <a href="mailto:privacy@menius.app">privacy@menius.app</a></li>
            <li><strong>Sitio web:</strong> <a href="https://menius.app">menius.app</a></li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-950 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacidad</Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Términos</Link>
          </div>
          <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} MENIUS</p>
        </div>
      </footer>
    </div>
  );
}
