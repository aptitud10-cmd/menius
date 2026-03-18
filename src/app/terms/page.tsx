import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — MENIUS',
  description: 'Términos y condiciones de uso de la plataforma MENIUS.',
  alternates: { canonical: '/terms' },
};

const proseClass = 'prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-code:text-emerald-300 prose-code:bg-emerald-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none';

function ContentEs() {
  return (
    <div className={proseClass}>
      <h2>1. Aceptación de los Términos</h2>
      <p>Al crear una cuenta, acceder o utilizar los servicios de MENIUS (&ldquo;la Plataforma&rdquo;), aceptas quedar vinculado por estos Términos y Condiciones (&ldquo;Términos&rdquo;). Si no estás de acuerdo con estos Términos, no utilices la Plataforma.</p>
      <p>Estos Términos constituyen un acuerdo legal entre tú (&ldquo;el Usuario&rdquo;, &ldquo;el Cliente&rdquo; o &ldquo;el Restaurante&rdquo;) y MENIUS.</p>

      <h2>2. Descripción del Servicio</h2>
      <p>MENIUS es una plataforma de software como servicio (SaaS) que ofrece a restaurantes:</p>
      <ul>
        <li>Creación y gestión de menús digitales accesibles mediante código QR o enlace directo.</li>
        <li>Recepción y gestión de pedidos en línea en tiempo real.</li>
        <li>Dashboard de administración con analytics, gestión de equipo, promociones y configuración.</li>
        <li>Generación de imágenes de productos mediante inteligencia artificial.</li>
        <li>Notificaciones por WhatsApp y email.</li>
        <li>Procesamiento de pagos a través de Stripe.</li>
      </ul>

      <h2>3. Registro y Cuenta</h2>
      <h3>3.1 Elegibilidad</h3>
      <p>Para usar MENIUS, debes tener al menos 18 años de edad y la capacidad legal para celebrar contratos vinculantes. Al registrarte, declaras que la información proporcionada es veraz y completa.</p>
      <h3>3.2 Seguridad de la Cuenta</h3>
      <p>Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Debes notificarnos inmediatamente si sospechas de un acceso no autorizado a tu cuenta en <a href="mailto:soporte@menius.app">soporte@menius.app</a>.</p>
      <h3>3.3 Una Cuenta por Restaurante</h3>
      <p>Cada restaurante debe tener su propia cuenta. No está permitido compartir una cuenta entre múltiples establecimientos no relacionados.</p>

      <h2>4. Planes, Precios y Facturación</h2>
      <h3>4.1 Planes de Suscripción</h3>
      <p>MENIUS ofrece planes de suscripción mensual y anual. Los detalles de cada plan, incluyendo funciones y límites, están disponibles en nuestra <a href="/#precios">página de precios</a>. Nos reservamos el derecho de modificar los precios con un aviso previo de 30 días.</p>
      <h3>4.2 Periodo de Prueba Gratuito</h3>
      <p>Los nuevos usuarios reciben un periodo de prueba gratuito de 14 días con acceso a todas las funciones. No se requiere tarjeta de crédito para iniciar el trial. Al finalizar el periodo de prueba, deberás seleccionar un plan de pago para continuar usando la Plataforma.</p>
      <h3>4.3 Facturación</h3>
      <p>Los pagos se procesan de forma segura a través de Stripe. La suscripción se renueva automáticamente al final de cada periodo (mensual o anual). Recibirás un recibo por correo electrónico con cada cobro.</p>
      <h3>4.4 Cancelación</h3>
      <p>Puedes cancelar tu suscripción en cualquier momento desde el dashboard de facturación. La cancelación será efectiva al final del periodo de facturación actual. No se otorgan reembolsos por periodos parciales, excepto donde la ley lo requiera.</p>
      <h3>4.5 Sin Comisiones por Pedido</h3>
      <p>MENIUS no cobra comisiones por pedido ni porcentaje sobre las ventas del restaurante. Los únicos costos son la tarifa de suscripción mensual o anual y las tarifas estándar de procesamiento de pago de Stripe (si se utilizan pagos en línea).</p>

      <h2>5. Uso Aceptable</h2>
      <p>Al utilizar MENIUS, te comprometes a:</p>
      <ul>
        <li>Usar la Plataforma únicamente para fines legítimos relacionados con la operación de un restaurante o negocio de alimentos.</li>
        <li>No publicar contenido falso, engañoso, ofensivo, discriminatorio o ilegal.</li>
        <li>No intentar acceder a cuentas, datos o sistemas de otros usuarios.</li>
        <li>No realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la Plataforma.</li>
        <li>No utilizar la Plataforma para enviar spam, malware o contenido no solicitado.</li>
        <li>No revender o redistribuir el acceso a la Plataforma sin autorización escrita.</li>
        <li>Cumplir con todas las leyes y regulaciones aplicables, incluyendo las de seguridad alimentaria, protección al consumidor y privacidad de datos.</li>
      </ul>

      <h2>6. Contenido del Usuario</h2>
      <h3>6.1 Propiedad</h3>
      <p>Tú conservas todos los derechos de propiedad sobre el contenido que subes a MENIUS (fotos, descripciones, logos, etc.). Al subir contenido, nos otorgas una licencia limitada, no exclusiva y revocable para mostrar dicho contenido como parte del servicio (por ejemplo, en tu menú público).</p>
      <h3>6.2 Responsabilidad</h3>
      <p>Eres el único responsable del contenido que publicas. MENIUS no revisa, aprueba ni respalda el contenido de los usuarios. Debes tener los derechos necesarios sobre todo el contenido que subas.</p>
      <h3>6.3 Imágenes Generadas por IA</h3>
      <p>Las imágenes generadas mediante nuestra función de IA (Google Gemini) son para uso exclusivo en tu menú dentro de MENIUS. Estas imágenes se generan bajo demanda y no representan fotografías reales de tus productos. Es tu responsabilidad asegurarte de que las imágenes generadas representen adecuadamente tus productos.</p>

      <h2>7. Propiedad Intelectual</h2>
      <p>La Plataforma, incluyendo su diseño, código, marca, logotipos, textos e interfaces, son propiedad de MENIUS y están protegidos por leyes de propiedad intelectual. No se otorga ningún derecho de propiedad intelectual sobre la Plataforma más allá del derecho de uso conforme a estos Términos.</p>

      <h2>8. Privacidad y Datos</h2>
      <p>El tratamiento de datos personales se rige por nuestra <Link href="/privacy">Política de Privacidad</Link>. Al usar la Plataforma, aceptas el tratamiento de datos conforme a dicha política.</p>
      <p>Como operador de un restaurante que utiliza MENIUS, eres co-responsable del tratamiento de los datos personales de tus clientes finales. Te comprometes a informar a tus clientes sobre el uso de la Plataforma y el tratamiento de sus datos.</p>

      <h2>9. Disponibilidad del Servicio</h2>
      <p>Nos esforzamos por mantener la Plataforma disponible 24/7, pero no garantizamos disponibilidad ininterrumpida. Podemos realizar mantenimientos programados, los cuales intentaremos comunicar con anticipación. No seremos responsables por interrupciones causadas por factores fuera de nuestro control.</p>

      <h2>10. Limitación de Responsabilidad</h2>
      <p>En la máxima medida permitida por la ley:</p>
      <ul>
        <li>MENIUS se proporciona &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;, sin garantías de ningún tipo, expresas o implícitas.</li>
        <li>No seremos responsables por pérdidas de ingresos, datos, clientes o ganancias derivadas del uso o la imposibilidad de uso de la Plataforma.</li>
        <li>Nuestra responsabilidad total acumulada no excederá el monto total pagado por el Usuario en los 12 meses anteriores al evento que dio lugar a la reclamación.</li>
        <li>No somos responsables de la calidad, seguridad o legalidad de los productos alimenticios ofrecidos por los restaurantes a través de la Plataforma.</li>
      </ul>

      <h2>11. Indemnización</h2>
      <p>Aceptas indemnizar y mantener indemne a MENIUS, sus directores, empleados y agentes, de cualquier reclamo, daño, pérdida o gasto (incluyendo honorarios legales) que surja de tu uso de la Plataforma, tu contenido, o tu violación de estos Términos.</p>

      <h2>12. Terminación</h2>
      <ul>
        <li><strong>Por el Usuario:</strong> puedes cancelar tu cuenta en cualquier momento desde la configuración de tu dashboard o contactándonos.</li>
        <li><strong>Por MENIUS:</strong> podemos suspender o terminar tu cuenta si violas estos Términos, con o sin aviso previo, dependiendo de la gravedad de la violación.</li>
        <li><strong>Efecto de la terminación:</strong> al terminar, perderás acceso al dashboard. Tus datos se retendrán durante 90 días para permitir la recuperación, después de lo cual serán eliminados conforme a nuestra Política de Privacidad.</li>
      </ul>

      <h2>13. Modificaciones a los Términos</h2>
      <p>Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios significativos serán notificados por correo electrónico con al menos 15 días de anticipación. El uso continuado de la Plataforma después de la entrada en vigor de los cambios constituye tu aceptación de los Términos modificados.</p>

      <h2>14. Ley Aplicable y Jurisdicción</h2>
      <p>Estos Términos se rigen por las leyes del Estado de Virginia, Estados Unidos, sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa derivada de estos Términos se resolverá en los tribunales competentes del Estado de Virginia, condado de Henrico.</p>

      <h2>15. Disposiciones Generales</h2>
      <ul>
        <li><strong>Acuerdo completo:</strong> estos Términos, junto con la Política de Privacidad y la Política de Cookies, constituyen el acuerdo completo entre las partes.</li>
        <li><strong>Divisibilidad:</strong> si alguna disposición de estos Términos se considera inválida, las demás disposiciones permanecerán en pleno vigor.</li>
        <li><strong>Renuncia:</strong> el hecho de que MENIUS no ejerza un derecho bajo estos Términos no constituye una renuncia a dicho derecho.</li>
        <li><strong>Cesión:</strong> no puedes ceder tus derechos bajo estos Términos sin nuestro consentimiento previo por escrito.</li>
      </ul>

      <h2>16. Contacto</h2>
      <p>Para preguntas sobre estos Términos:</p>
      <ul>
        <li><strong>Empresa:</strong> MENIUS LLC</li>
        <li><strong>Dirección:</strong> 8401 Mayland Dr, Ste S, Henrico, VA 23294, EE.UU.</li>
        <li><strong>Email:</strong> <a href="mailto:soporte@menius.app">soporte@menius.app</a></li>
        <li><strong>Sitio web:</strong> <a href="https://menius.app">menius.app</a></li>
      </ul>
    </div>
  );
}

function ContentEn() {
  return (
    <div className={proseClass}>
      <h2>1. Acceptance of Terms</h2>
      <p>By creating an account, accessing, or using the services of MENIUS (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). If you do not agree with these Terms, do not use the Platform.</p>
      <p>These Terms constitute a legal agreement between you (&ldquo;the User&rdquo;, &ldquo;the Client&rdquo;, or &ldquo;the Restaurant&rdquo;) and MENIUS.</p>

      <h2>2. Service Description</h2>
      <p>MENIUS is a software-as-a-service (SaaS) platform that offers restaurants:</p>
      <ul>
        <li>Creation and management of digital menus accessible via QR code or direct link.</li>
        <li>Real-time online order reception and management.</li>
        <li>Administration dashboard with analytics, team management, promotions, and settings.</li>
        <li>Product image generation using artificial intelligence.</li>
        <li>WhatsApp and email notifications.</li>
        <li>Payment processing through Stripe.</li>
      </ul>

      <h2>3. Registration and Account</h2>
      <h3>3.1 Eligibility</h3>
      <p>To use MENIUS, you must be at least 18 years old and have the legal capacity to enter into binding contracts. By registering, you represent that the information provided is true and complete.</p>
      <h3>3.2 Account Security</h3>
      <p>You are responsible for maintaining the confidentiality of your login credentials. You must notify us immediately if you suspect unauthorized access to your account at <a href="mailto:soporte@menius.app">soporte@menius.app</a>.</p>
      <h3>3.3 One Account per Restaurant</h3>
      <p>Each restaurant must have its own account. Sharing an account between multiple unrelated establishments is not permitted.</p>

      <h2>4. Plans, Pricing, and Billing</h2>
      <h3>4.1 Subscription Plans</h3>
      <p>MENIUS offers monthly and annual subscription plans. Details of each plan, including features and limits, are available on our <a href="/#precios">pricing page</a>. We reserve the right to modify prices with 30 days&apos; prior notice.</p>
      <h3>4.2 Free Trial Period</h3>
      <p>New users receive a 14-day free trial with access to all features. No credit card is required to start the trial. At the end of the trial period, you must select a paid plan to continue using the Platform.</p>
      <h3>4.3 Billing</h3>
      <p>Payments are processed securely through Stripe. The subscription automatically renews at the end of each period (monthly or annual). You will receive a receipt by email with each charge.</p>
      <h3>4.4 Cancellation</h3>
      <p>You can cancel your subscription at any time from the billing dashboard. Cancellation will be effective at the end of the current billing period. No refunds are given for partial periods, except where required by law.</p>
      <h3>4.5 No Per-Order Commissions</h3>
      <p>MENIUS does not charge per-order commissions or a percentage on restaurant sales. The only costs are the monthly or annual subscription fee and standard Stripe payment processing fees (if online payments are used).</p>

      <h2>5. Acceptable Use</h2>
      <p>By using MENIUS, you agree to:</p>
      <ul>
        <li>Use the Platform only for legitimate purposes related to operating a restaurant or food business.</li>
        <li>Not publish false, misleading, offensive, discriminatory, or illegal content.</li>
        <li>Not attempt to access other users&apos; accounts, data, or systems.</li>
        <li>Not reverse engineer, decompile, or attempt to extract the source code of the Platform.</li>
        <li>Not use the Platform to send spam, malware, or unsolicited content.</li>
        <li>Not resell or redistribute access to the Platform without written authorization.</li>
        <li>Comply with all applicable laws and regulations, including food safety, consumer protection, and data privacy.</li>
      </ul>

      <h2>6. User Content</h2>
      <h3>6.1 Ownership</h3>
      <p>You retain all ownership rights over the content you upload to MENIUS (photos, descriptions, logos, etc.). By uploading content, you grant us a limited, non-exclusive, revocable license to display such content as part of the service (for example, in your public menu).</p>
      <h3>6.2 Responsibility</h3>
      <p>You are solely responsible for the content you publish. MENIUS does not review, approve, or endorse user content. You must have the necessary rights over all content you upload.</p>
      <h3>6.3 AI-Generated Images</h3>
      <p>Images generated through our AI feature (Google Gemini) are for exclusive use in your menu within MENIUS. These images are generated on demand and do not represent actual photographs of your products. It is your responsibility to ensure that generated images adequately represent your products.</p>

      <h2>7. Intellectual Property</h2>
      <p>The Platform, including its design, code, brand, logos, text, and interfaces, is the property of MENIUS and is protected by intellectual property laws. No intellectual property rights over the Platform are granted beyond the right of use pursuant to these Terms.</p>

      <h2>8. Privacy and Data</h2>
      <p>The processing of personal data is governed by our <Link href="/privacy">Privacy Policy</Link>. By using the Platform, you accept the processing of data in accordance with said policy.</p>
      <p>As a restaurant operator using MENIUS, you are co-responsible for the processing of your end customers&apos; personal data. You agree to inform your customers about the use of the Platform and the processing of their data.</p>

      <h2>9. Service Availability</h2>
      <p>We strive to keep the Platform available 24/7, but we do not guarantee uninterrupted availability. We may perform scheduled maintenance, which we will try to communicate in advance. We will not be liable for interruptions caused by factors beyond our control.</p>

      <h2>10. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law:</p>
      <ul>
        <li>MENIUS is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, express or implied.</li>
        <li>We will not be liable for loss of revenue, data, customers, or profits arising from the use or inability to use the Platform.</li>
        <li>Our total cumulative liability shall not exceed the total amount paid by the User in the 12 months preceding the event giving rise to the claim.</li>
        <li>We are not responsible for the quality, safety, or legality of food products offered by restaurants through the Platform.</li>
      </ul>

      <h2>11. Indemnification</h2>
      <p>You agree to indemnify and hold harmless MENIUS, its directors, employees, and agents, from any claim, damage, loss, or expense (including legal fees) arising from your use of the Platform, your content, or your violation of these Terms.</p>

      <h2>12. Termination</h2>
      <ul>
        <li><strong>By the User:</strong> you may cancel your account at any time from your dashboard settings or by contacting us.</li>
        <li><strong>By MENIUS:</strong> we may suspend or terminate your account if you violate these Terms, with or without prior notice, depending on the severity of the violation.</li>
        <li><strong>Effect of termination:</strong> upon termination, you will lose access to the dashboard. Your data will be retained for 90 days to allow recovery, after which it will be deleted in accordance with our Privacy Policy.</li>
      </ul>

      <h2>13. Modifications to Terms</h2>
      <p>We reserve the right to modify these Terms at any time. Significant changes will be notified by email with at least 15 days&apos; advance notice. Continued use of the Platform after the changes take effect constitutes your acceptance of the modified Terms.</p>

      <h2>14. Governing Law and Jurisdiction</h2>
      <p>These Terms are governed by the laws of the Commonwealth of Virginia, United States, without regard to its conflict of laws provisions. Any dispute arising from these Terms shall be resolved in the competent courts of the Commonwealth of Virginia, County of Henrico.</p>

      <h2>15. General Provisions</h2>
      <ul>
        <li><strong>Entire agreement:</strong> these Terms, together with the Privacy Policy and Cookie Policy, constitute the entire agreement between the parties.</li>
        <li><strong>Severability:</strong> if any provision of these Terms is found invalid, the remaining provisions shall remain in full force.</li>
        <li><strong>Waiver:</strong> the failure of MENIUS to exercise a right under these Terms does not constitute a waiver of that right.</li>
        <li><strong>Assignment:</strong> you may not assign your rights under these Terms without our prior written consent.</li>
      </ul>

      <h2>16. Contact</h2>
      <p>For questions about these Terms:</p>
      <ul>
        <li><strong>Company:</strong> MENIUS LLC</li>
        <li><strong>Address:</strong> 8401 Mayland Dr, Ste S, Henrico, VA 23294, USA</li>
        <li><strong>Email:</strong> <a href="mailto:soporte@menius.app">soporte@menius.app</a></li>
        <li><strong>Website:</strong> <a href="https://menius.app">menius.app</a></li>
      </ul>
    </div>
  );
}

function getHero(locale: LandingLocale) {
  if (locale === 'en') return { badge: 'Legal', title: 'Terms & Conditions', date: 'Last updated: March 18, 2026' };
  return { badge: 'Legal', title: 'Términos y Condiciones', date: 'Última actualización: 18 de marzo de 2026' };
}

export default function TermsPage() {
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
