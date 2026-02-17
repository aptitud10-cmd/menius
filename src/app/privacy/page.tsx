import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — MENIUS',
  description: 'Política de privacidad de MENIUS. Cómo recopilamos, usamos y protegemos tus datos.',
};

export default function PrivacyPage() {
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
          Política de Privacidad
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: 16 de febrero de 2026</p>

        <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">

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
          <p>Para ejercer cualquiera de estos derechos, contáctanos en <a href="mailto:privacy@menius.app">privacy@menius.app</a>.</p>

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
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Términos</Link>
            <Link href="/cookies" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cookies</Link>
          </div>
          <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} MENIUS</p>
        </div>
      </footer>
    </div>
  );
}
