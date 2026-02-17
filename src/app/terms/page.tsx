import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — MENIUS',
  description: 'Términos y condiciones de uso de la plataforma MENIUS.',
};

export default function TermsPage() {
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
          Términos y Condiciones
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: 16 de febrero de 2026</p>

        <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">

          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al crear una cuenta, acceder o utilizar los servicios de MENIUS (&ldquo;la Plataforma&rdquo;), aceptas quedar vinculado por estos Términos y Condiciones (&ldquo;Términos&rdquo;). Si no estás de acuerdo con estos Términos, no utilices la Plataforma.
          </p>
          <p>
            Estos Términos constituyen un acuerdo legal entre tú (&ldquo;el Usuario&rdquo;, &ldquo;el Cliente&rdquo; o &ldquo;el Restaurante&rdquo;) y MENIUS.
          </p>

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
          <p>
            Para usar MENIUS, debes tener al menos 18 años de edad y la capacidad legal para celebrar contratos vinculantes. Al registrarte, declaras que la información proporcionada es veraz y completa.
          </p>
          <h3>3.2 Seguridad de la Cuenta</h3>
          <p>
            Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Debes notificarnos inmediatamente si sospechas de un acceso no autorizado a tu cuenta en <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
          </p>
          <h3>3.3 Una Cuenta por Restaurante</h3>
          <p>
            Cada restaurante debe tener su propia cuenta. No está permitido compartir una cuenta entre múltiples establecimientos no relacionados.
          </p>

          <h2>4. Planes, Precios y Facturación</h2>
          <h3>4.1 Planes de Suscripción</h3>
          <p>
            MENIUS ofrece planes de suscripción mensual y anual. Los detalles de cada plan, incluyendo funciones y límites, están disponibles en nuestra <a href="/#precios">página de precios</a>. Nos reservamos el derecho de modificar los precios con un aviso previo de 30 días.
          </p>
          <h3>4.2 Periodo de Prueba Gratuito</h3>
          <p>
            Los nuevos usuarios reciben un periodo de prueba gratuito de 14 días con acceso a todas las funciones. No se requiere tarjeta de crédito para iniciar el trial. Al finalizar el periodo de prueba, deberás seleccionar un plan de pago para continuar usando la Plataforma.
          </p>
          <h3>4.3 Facturación</h3>
          <p>
            Los pagos se procesan de forma segura a través de Stripe. La suscripción se renueva automáticamente al final de cada periodo (mensual o anual). Recibirás un recibo por correo electrónico con cada cobro.
          </p>
          <h3>4.4 Cancelación</h3>
          <p>
            Puedes cancelar tu suscripción en cualquier momento desde el dashboard de facturación. La cancelación será efectiva al final del periodo de facturación actual. No se otorgan reembolsos por periodos parciales, excepto donde la ley lo requiera.
          </p>
          <h3>4.5 Sin Comisiones por Pedido</h3>
          <p>
            MENIUS no cobra comisiones por pedido ni porcentaje sobre las ventas del restaurante. Los únicos costos son la tarifa de suscripción mensual o anual y las tarifas estándar de procesamiento de pago de Stripe (si se utilizan pagos en línea).
          </p>

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
          <p>
            Tú conservas todos los derechos de propiedad sobre el contenido que subes a MENIUS (fotos, descripciones, logos, etc.). Al subir contenido, nos otorgas una licencia limitada, no exclusiva y revocable para mostrar dicho contenido como parte del servicio (por ejemplo, en tu menú público).
          </p>
          <h3>6.2 Responsabilidad</h3>
          <p>
            Eres el único responsable del contenido que publicas. MENIUS no revisa, aprueba ni respalda el contenido de los usuarios. Debes tener los derechos necesarios sobre todo el contenido que subas.
          </p>
          <h3>6.3 Imágenes Generadas por IA</h3>
          <p>
            Las imágenes generadas mediante nuestra función de IA (Google Gemini) son para uso exclusivo en tu menú dentro de MENIUS. Estas imágenes se generan bajo demanda y no representan fotografías reales de tus productos. Es tu responsabilidad asegurarte de que las imágenes generadas representen adecuadamente tus productos.
          </p>

          <h2>7. Propiedad Intelectual</h2>
          <p>
            La Plataforma, incluyendo su diseño, código, marca, logotipos, textos e interfaces, son propiedad de MENIUS y están protegidos por leyes de propiedad intelectual. No se otorga ningún derecho de propiedad intelectual sobre la Plataforma más allá del derecho de uso conforme a estos Términos.
          </p>

          <h2>8. Privacidad y Datos</h2>
          <p>
            El tratamiento de datos personales se rige por nuestra <Link href="/privacy">Política de Privacidad</Link>. Al usar la Plataforma, aceptas el tratamiento de datos conforme a dicha política.
          </p>
          <p>
            Como operador de un restaurante que utiliza MENIUS, eres co-responsable del tratamiento de los datos personales de tus clientes finales. Te comprometes a informar a tus clientes sobre el uso de la Plataforma y el tratamiento de sus datos.
          </p>

          <h2>9. Disponibilidad del Servicio</h2>
          <p>
            Nos esforzamos por mantener la Plataforma disponible 24/7, pero no garantizamos disponibilidad ininterrumpida. Podemos realizar mantenimientos programados, los cuales intentaremos comunicar con anticipación. No seremos responsables por interrupciones causadas por factores fuera de nuestro control.
          </p>

          <h2>10. Limitación de Responsabilidad</h2>
          <p>
            En la máxima medida permitida por la ley:
          </p>
          <ul>
            <li>MENIUS se proporciona &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;, sin garantías de ningún tipo, expresas o implícitas.</li>
            <li>No seremos responsables por pérdidas de ingresos, datos, clientes o ganancias derivadas del uso o la imposibilidad de uso de la Plataforma.</li>
            <li>Nuestra responsabilidad total acumulada no excederá el monto total pagado por el Usuario en los 12 meses anteriores al evento que dio lugar a la reclamación.</li>
            <li>No somos responsables de la calidad, seguridad o legalidad de los productos alimenticios ofrecidos por los restaurantes a través de la Plataforma.</li>
          </ul>

          <h2>11. Indemnización</h2>
          <p>
            Aceptas indemnizar y mantener indemne a MENIUS, sus directores, empleados y agentes, de cualquier reclamo, daño, pérdida o gasto (incluyendo honorarios legales) que surja de tu uso de la Plataforma, tu contenido, o tu violación de estos Términos.
          </p>

          <h2>12. Terminación</h2>
          <ul>
            <li><strong>Por el Usuario:</strong> puedes cancelar tu cuenta en cualquier momento desde la configuración de tu dashboard o contactándonos.</li>
            <li><strong>Por MENIUS:</strong> podemos suspender o terminar tu cuenta si violas estos Términos, con o sin aviso previo, dependiendo de la gravedad de la violación.</li>
            <li><strong>Efecto de la terminación:</strong> al terminar, perderás acceso al dashboard. Tus datos se retendrán durante 90 días para permitir la recuperación, después de lo cual serán eliminados conforme a nuestra Política de Privacidad.</li>
          </ul>

          <h2>13. Modificaciones a los Términos</h2>
          <p>
            Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios significativos serán notificados por correo electrónico con al menos 15 días de anticipación. El uso continuado de la Plataforma después de la entrada en vigor de los cambios constituye tu aceptación de los Términos modificados.
          </p>

          <h2>14. Ley Aplicable y Jurisdicción</h2>
          <p>
            Estos Términos se rigen por las leyes del Estado de New York, Estados Unidos, sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa derivada de estos Términos se resolverá en los tribunales competentes del Estado de New York, condado de New York.
          </p>

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
            <li><strong>Email:</strong> <a href="mailto:legal@menius.app">legal@menius.app</a></li>
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
            <Link href="/cookies" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cookies</Link>
          </div>
          <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} MENIUS</p>
        </div>
      </footer>
    </div>
  );
}
