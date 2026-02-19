import Link from 'next/link';
import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Política de Privacidad — MENIUS',
  description: 'Política de privacidad de MENIUS. Cómo recopilamos, usamos y protegemos tus datos.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <p className="text-sm text-purple-400 uppercase tracking-[0.2em] font-medium mb-5">Legal</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-3">
            Política de Privacidad
          </h1>
          <p className="text-sm text-gray-500">Última actualización: 16 de febrero de 2026</p>
        </div>
      </section>

      <div className="separator-gradient max-w-3xl mx-auto" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-code:text-purple-300 prose-code:bg-purple-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">

          <h2>1. Introducción</h2>
          <p>
            MENIUS (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo; o &ldquo;la Plataforma&rdquo;) es una plataforma de software como servicio (SaaS) que permite a restaurantes crear menús digitales, recibir pedidos en línea y gestionar su negocio. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información personal de nuestros usuarios.
          </p>
          <p>
            Al utilizar MENIUS, aceptas las prácticas descritas en esta política. Si no estás de acuerdo, por favor no utilices nuestros servicios.
          </p>

          <h2>2. Información que Recopilamos</h2>

          <h3>2.1 Datos de Restaurantes (Clientes Comerciales)</h3>
          <ul>
            <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, contraseña (encriptada), nombre del restaurante.</li>
            <li><strong>Datos del negocio:</strong> nombre del restaurante, dirección, URL del menú (slug), logo, categorías, productos, precios, imágenes de productos.</li>
            <li><strong>Datos de facturación:</strong> procesados directamente por Stripe. MENIUS no almacena números de tarjetas de crédito ni datos financieros sensibles.</li>
            <li><strong>Datos de uso:</strong> acceso al dashboard, frecuencia de uso, acciones realizadas.</li>
          </ul>

          <h3>2.2 Datos de Consumidores Finales (Clientes del Restaurante)</h3>
          <ul>
            <li><strong>Datos de pedido:</strong> nombre del cliente, correo electrónico (opcional), dirección de entrega (si aplica), contenido del pedido, notas especiales.</li>
            <li><strong>Datos técnicos:</strong> dirección IP (para seguridad y rate limiting), tipo de navegador, dispositivo.</li>
          </ul>

          <h3>2.3 Datos Recopilados Automáticamente</h3>
          <ul>
            <li>Cookies de sesión necesarias para autenticación (ver nuestra <Link href="/cookies">Política de Cookies</Link>).</li>
            <li>Registros de servidor (logs) con fines de seguridad y diagnóstico.</li>
          </ul>

          <h2>3. Cómo Usamos la Información</h2>
          <ul>
            <li><strong>Proveer el servicio:</strong> crear y mostrar menús digitales, procesar pedidos, gestionar suscripciones.</li>
            <li><strong>Comunicaciones:</strong> enviar confirmaciones de pedidos, notificaciones de estado, alertas de facturación y actualizaciones del servicio.</li>
            <li><strong>Mejora del producto:</strong> analizar el uso agregado y anónimo para mejorar la plataforma.</li>
            <li><strong>Seguridad:</strong> detectar y prevenir fraudes, abusos o accesos no autorizados.</li>
            <li><strong>Cumplimiento legal:</strong> cumplir con obligaciones legales, regulatorias o judiciales.</li>
          </ul>

          <h2>4. Con Quién Compartimos la Información</h2>
          <p>No vendemos ni alquilamos datos personales. Compartimos información únicamente con:</p>
          <ul>
            <li><strong>Stripe:</strong> para procesar pagos y suscripciones de forma segura. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Política de Stripe</a>.</li>
            <li><strong>Supabase:</strong> nuestra infraestructura de base de datos y autenticación, alojada en servidores seguros. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Política de Supabase</a>.</li>
            <li><strong>Resend:</strong> para el envío de correos electrónicos transaccionales. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Política de Resend</a>.</li>
            <li><strong>WhatsApp Business API (Meta):</strong> para enviar notificaciones a restaurantes que habiliten esta función.</li>
            <li><strong>Google (Gemini AI):</strong> para la generación de imágenes de productos. Las descripciones de texto se envían a la API; no se envían datos personales de usuarios.</li>
            <li><strong>Autoridades legales:</strong> cuando sea requerido por ley, orden judicial o proceso legal.</li>
          </ul>

          <h2>5. Retención de Datos</h2>
          <ul>
            <li><strong>Cuentas activas:</strong> mantenemos los datos mientras la cuenta esté activa.</li>
            <li><strong>Cuentas canceladas:</strong> eliminamos los datos personales dentro de los 90 días posteriores a la cancelación, excepto lo requerido por ley (registros fiscales, por ejemplo).</li>
            <li><strong>Pedidos de consumidores:</strong> los datos de pedidos se retienen según la configuración del restaurante, hasta un máximo de 12 meses.</li>
            <li><strong>Logs de seguridad:</strong> se retienen por 30 días.</li>
          </ul>

          <h2>6. Seguridad</h2>
          <p>Implementamos medidas de seguridad estándar de la industria, incluyendo:</p>
          <ul>
            <li>Cifrado en tránsito (HTTPS/TLS) y en reposo.</li>
            <li>Autenticación segura con tokens JWT.</li>
            <li>Row Level Security (RLS) en la base de datos para aislamiento de datos entre restaurantes.</li>
            <li>Rate limiting en endpoints públicos.</li>
            <li>Contraseñas encriptadas con bcrypt (gestionado por Supabase Auth).</li>
            <li>Headers de seguridad (CSP, X-Frame-Options, etc.).</li>
          </ul>

          <h2>7. Tus Derechos</h2>
          <p>Dependiendo de tu ubicación, puedes tener los siguientes derechos:</p>
          <ul>
            <li><strong>Acceso:</strong> solicitar una copia de tus datos personales.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
            <li><strong>Eliminación:</strong> solicitar la eliminación de tus datos (&ldquo;derecho al olvido&rdquo;).</li>
            <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y legible.</li>
            <li><strong>Oposición:</strong> oponerte al procesamiento de tus datos para ciertos fines.</li>
            <li><strong>Retirar consentimiento:</strong> cuando el procesamiento se base en tu consentimiento.</li>
          </ul>
          <p>Para ejercer cualquiera de estos derechos, contáctanos en <a href="mailto:soportemenius@gmail.com">soportemenius@gmail.com</a>.</p>

          <h2>8. Residentes de California (CCPA)</h2>
          <p>
            Si eres residente de California, tienes derechos adicionales bajo la Ley de Privacidad del Consumidor de California (CCPA), incluyendo el derecho a saber qué datos recopilamos, el derecho a la eliminación, y el derecho a no ser discriminado por ejercer tus derechos. No vendemos información personal.
          </p>

          <h2>9. Residentes de New York</h2>
          <p>
            Cumplimos con la Ley SHIELD de New York (Stop Hacks and Improve Electronic Data Security Act), implementando salvaguardas administrativas, técnicas y físicas razonables para proteger la información privada.
          </p>

          <h2>10. Menores de Edad</h2>
          <p>
            MENIUS no está dirigido a menores de 13 años. No recopilamos deliberadamente información de menores. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos de inmediato.
          </p>

          <h2>11. Cambios a esta Política</h2>
          <p>
            Podemos actualizar esta política periódicamente. Notificaremos cambios significativos por correo electrónico o mediante un aviso en la plataforma. La fecha de &ldquo;última actualización&rdquo; al inicio de esta página indica cuándo se realizó la revisión más reciente.
          </p>

          <h2>12. Contacto</h2>
          <p>Si tienes preguntas sobre esta Política de Privacidad, puedes contactarnos en:</p>
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
