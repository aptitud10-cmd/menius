import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';

export const metadata: Metadata = {
  title: 'Política de Privacidad — MENIUS',
  description: 'Política de privacidad de MENIUS. Cómo recopilamos, usamos y protegemos tus datos.',
  alternates: { canonical: '/privacy' },
};

const proseClass = 'prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-code:text-emerald-300 prose-code:bg-emerald-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none';

function ContentEs() {
  return (
    <div className={proseClass}>
      <h2>1. Introducción</h2>
      <p>MENIUS (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo; o &ldquo;la Plataforma&rdquo;) es una plataforma de software como servicio (SaaS) que permite a restaurantes crear menús digitales, recibir pedidos en línea y gestionar su negocio. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información personal de nuestros usuarios.</p>
      <p>Al utilizar MENIUS, aceptas las prácticas descritas en esta política. Si no estás de acuerdo, por favor no utilices nuestros servicios.</p>

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
        <li><strong>Fotos de comprobante de entrega:</strong> cuando un restaurante utiliza la función de delivery con repartidores propios, el repartidor puede subir una fotografía como comprobante de entrega. Esta foto incluye la imagen del exterior del domicilio de entrega. Se almacena de forma segura en Supabase Storage y es accesible únicamente por el restaurante. La foto se retiene junto con el historial del pedido.</li>
        <li><strong>Ubicación GPS (repartidores):</strong> cuando el restaurante asigna un repartidor a un pedido de delivery, el repartidor puede optar voluntariamente por compartir su ubicación GPS en tiempo real. Esta ubicación se transmite durante el período de entrega y no se almacena de forma permanente — solo se guarda la última posición conocida mientras el pedido está activo.</li>
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
      <p>Para ejercer cualquiera de estos derechos, contáctanos en <a href="mailto:soporte@menius.app">soporte@menius.app</a>.</p>

      <h2>8. Residentes de California (CCPA)</h2>
      <p>Si eres residente de California, tienes derechos adicionales bajo la Ley de Privacidad del Consumidor de California (CCPA), incluyendo el derecho a saber qué datos recopilamos, el derecho a la eliminación, y el derecho a no ser discriminado por ejercer tus derechos. No vendemos información personal.</p>

      <h2>9. Residentes de New York</h2>
      <p>Cumplimos con la Ley SHIELD de New York (Stop Hacks and Improve Electronic Data Security Act), implementando salvaguardas administrativas, técnicas y físicas razonables para proteger la información privada.</p>

      <h2>10. Menores de Edad</h2>
      <p>MENIUS no está dirigido a menores de 13 años. No recopilamos deliberadamente información de menores. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos de inmediato.</p>

      <h2>11. Cambios a esta Política</h2>
      <p>Podemos actualizar esta política periódicamente. Notificaremos cambios significativos por correo electrónico o mediante un aviso en la plataforma. La fecha de &ldquo;última actualización&rdquo; al inicio de esta página indica cuándo se realizó la revisión más reciente.</p>

      <h2>12. Contacto</h2>
      <p>Si tienes preguntas sobre esta Política de Privacidad, puedes contactarnos en:</p>
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
      <h2>1. Introduction</h2>
      <p>MENIUS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) is a software-as-a-service (SaaS) platform that enables restaurants to create digital menus, receive online orders, and manage their business. This Privacy Policy describes how we collect, use, store, and protect the personal information of our users.</p>
      <p>By using MENIUS, you accept the practices described in this policy. If you do not agree, please do not use our services.</p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Restaurant Data (Business Clients)</h3>
      <ul>
        <li><strong>Account data:</strong> name, email address, password (encrypted), restaurant name.</li>
        <li><strong>Business data:</strong> restaurant name, address, menu URL (slug), logo, categories, products, prices, product images.</li>
        <li><strong>Billing data:</strong> processed directly by Stripe. MENIUS does not store credit card numbers or sensitive financial data.</li>
        <li><strong>Usage data:</strong> dashboard access, usage frequency, actions performed.</li>
      </ul>
      <h3>2.2 End Consumer Data (Restaurant Customers)</h3>
      <ul>
        <li><strong>Order data:</strong> customer name, email (optional), delivery address (if applicable), order contents, special notes.</li>
        <li><strong>Proof-of-delivery photos:</strong> when a restaurant uses the delivery feature with their own drivers, the driver may upload a photograph as proof of delivery. This photo may include an image of the delivery address exterior. It is stored securely in Supabase Storage, accessible only by the restaurant, and retained alongside the order history.</li>
        <li><strong>GPS location (drivers):</strong> when the restaurant assigns a driver to a delivery order, the driver may voluntarily choose to share their real-time GPS location. This location is transmitted during the delivery period and is not stored permanently — only the last known position is saved while the order is active.</li>
        <li><strong>Technical data:</strong> IP address (for security and rate limiting), browser type, device.</li>
      </ul>
      <h3>2.3 Automatically Collected Data</h3>
      <ul>
        <li>Session cookies necessary for authentication (see our <Link href="/cookies">Cookie Policy</Link>).</li>
        <li>Server logs for security and diagnostic purposes.</li>
      </ul>

      <h2>3. How We Use Information</h2>
      <ul>
        <li><strong>Provide the service:</strong> create and display digital menus, process orders, manage subscriptions.</li>
        <li><strong>Communications:</strong> send order confirmations, status notifications, billing alerts, and service updates.</li>
        <li><strong>Product improvement:</strong> analyze aggregate and anonymous usage to improve the platform.</li>
        <li><strong>Security:</strong> detect and prevent fraud, abuse, or unauthorized access.</li>
        <li><strong>Legal compliance:</strong> fulfill legal, regulatory, or judicial obligations.</li>
      </ul>

      <h2>4. Who We Share Information With</h2>
      <p>We do not sell or rent personal data. We share information only with:</p>
      <ul>
        <li><strong>Stripe:</strong> to process payments and subscriptions securely. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe Policy</a>.</li>
        <li><strong>Supabase:</strong> our database and authentication infrastructure, hosted on secure servers. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Policy</a>.</li>
        <li><strong>Resend:</strong> for sending transactional emails. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend Policy</a>.</li>
        <li><strong>WhatsApp Business API (Meta):</strong> to send notifications to restaurants that enable this feature.</li>
        <li><strong>Google (Gemini AI):</strong> for product image generation. Text descriptions are sent to the API; no personal user data is transmitted.</li>
        <li><strong>Legal authorities:</strong> when required by law, court order, or legal process.</li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li><strong>Active accounts:</strong> we maintain data as long as the account is active.</li>
        <li><strong>Canceled accounts:</strong> we delete personal data within 90 days of cancellation, except as required by law (tax records, for example).</li>
        <li><strong>Consumer orders:</strong> order data is retained according to the restaurant&apos;s settings, up to a maximum of 12 months.</li>
        <li><strong>Security logs:</strong> retained for 30 days.</li>
      </ul>

      <h2>6. Security</h2>
      <p>We implement industry-standard security measures, including:</p>
      <ul>
        <li>Encryption in transit (HTTPS/TLS) and at rest.</li>
        <li>Secure authentication with JWT tokens.</li>
        <li>Row Level Security (RLS) in the database for data isolation between restaurants.</li>
        <li>Rate limiting on public endpoints.</li>
        <li>Passwords encrypted with bcrypt (managed by Supabase Auth).</li>
        <li>Security headers (CSP, X-Frame-Options, etc.).</li>
      </ul>

      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may have the following rights:</p>
      <ul>
        <li><strong>Access:</strong> request a copy of your personal data.</li>
        <li><strong>Rectification:</strong> correct inaccurate or incomplete data.</li>
        <li><strong>Deletion:</strong> request deletion of your data (&ldquo;right to be forgotten&rdquo;).</li>
        <li><strong>Portability:</strong> receive your data in a structured, readable format.</li>
        <li><strong>Objection:</strong> object to the processing of your data for certain purposes.</li>
        <li><strong>Withdraw consent:</strong> when processing is based on your consent.</li>
      </ul>
      <p>To exercise any of these rights, contact us at <a href="mailto:soporte@menius.app">soporte@menius.app</a>.</p>

      <h2>8. California Residents (CCPA)</h2>
      <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what data we collect, the right to deletion, and the right not to be discriminated against for exercising your rights. We do not sell personal information.</p>

      <h2>9. New York Residents</h2>
      <p>We comply with the New York SHIELD Act (Stop Hacks and Improve Electronic Data Security Act), implementing reasonable administrative, technical, and physical safeguards to protect private information.</p>

      <h2>10. Minors</h2>
      <p>MENIUS is not directed at children under 13 years of age. We do not knowingly collect information from minors. If we discover that we have collected data from a minor, we will delete it immediately.</p>

      <h2>11. Changes to This Policy</h2>
      <p>We may update this policy periodically. We will notify you of significant changes by email or through a notice on the platform. The &ldquo;last updated&rdquo; date at the top of this page indicates when the most recent revision was made.</p>

      <h2>12. Contact</h2>
      <p>If you have questions about this Privacy Policy, you can contact us at:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:soporte@menius.app">soporte@menius.app</a></li>
        <li><strong>Website:</strong> <a href="https://menius.app">menius.app</a></li>
      </ul>
    </div>
  );
}

function getHero(locale: LandingLocale) {
  if (locale === 'en') return { badge: 'Legal', title: 'Privacy Policy', date: 'Last updated: February 16, 2026' };
  return { badge: 'Legal', title: 'Política de Privacidad', date: 'Última actualización: 16 de febrero de 2026' };
}

export default function PrivacyPage() {
  const cookieStore = cookies();
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
