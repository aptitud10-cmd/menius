import Link from "next/link";

// Texto de la política de privacidad de MENIUS. Lo usan /privacy (sitio de
// MENIUS, oscuro) y /[slug]/legal/privacy (dentro de la tienda, claro).

const DARK =
  "prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-gray-400 prose-li:text-[15px] prose-strong:text-white prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-code:text-emerald-300 prose-code:bg-emerald-500/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none";

export const LEGAL_PROSE_LIGHT =
  "prose max-w-none prose-headings:font-semibold prose-headings:text-[#111114] prose-headings:tracking-tight prose-h2:text-[19px] prose-h2:mt-9 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-p:text-[#4f4f57] prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-[#4f4f57] prose-li:text-[15px] prose-strong:text-[#111114] prose-a:text-[#047a65] prose-a:underline-offset-2";

function ContentEs({ className }: { className: string }) {
  return (
    <div className={className}>
      <h2>1. Introducción</h2>
      <p>
        MENIUS (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo; o &ldquo;la
        Plataforma&rdquo;) es una plataforma de software como servicio (SaaS)
        que permite a restaurantes crear menús digitales, recibir pedidos en
        línea y gestionar su negocio. Esta Política de Privacidad describe cómo
        recopilamos, usamos, almacenamos y protegemos la información personal de
        nuestros usuarios.
      </p>
      <p>
        Al utilizar MENIUS, aceptas las prácticas descritas en esta política. Si
        no estás de acuerdo, por favor no utilices nuestros servicios.
      </p>

      <h2>2. Información que Recopilamos</h2>
      <h3>2.1 Datos de Restaurantes (Clientes Comerciales)</h3>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, correo electrónico,
          contraseña (encriptada), nombre del restaurante.
        </li>
        <li>
          <strong>Datos del negocio:</strong> nombre del restaurante, dirección,
          URL del menú (slug), logo, categorías, productos, precios, imágenes de
          productos.
        </li>
        <li>
          <strong>Datos de facturación:</strong> procesados directamente por
          Stripe. MENIUS no almacena números de tarjetas de crédito ni datos
          financieros sensibles.
        </li>
        <li>
          <strong>Datos de uso:</strong> acceso al dashboard, frecuencia de uso,
          acciones realizadas.
        </li>
      </ul>
      <h3>2.2 Datos de Consumidores Finales (Clientes del Restaurante)</h3>
      <ul>
        <li>
          <strong>Datos de pedido:</strong> nombre del cliente, teléfono,
          correo electrónico (opcional), dirección de entrega y su ubicación
          en el mapa (si aplica), contenido del pedido, notas especiales.
        </li>
        <li>
          <strong>Historial con el restaurante:</strong> si un pedido no se
          recoge, no se recibe o no se paga, el restaurante puede dejarlo
          registrado. Ese registro solo lo ve ese restaurante y puede hacer que
          te pida pagar por adelantado en tus próximos pedidos.
        </li>
        <li>
          <strong>Fotos de comprobante de entrega:</strong> cuando un
          restaurante utiliza la función de delivery con repartidores propios,
          el repartidor puede subir una fotografía como comprobante de entrega.
          Esta foto incluye la imagen del exterior del domicilio de entrega. Se
          almacena de forma segura en Supabase Storage y es accesible únicamente
          por el restaurante. La foto se retiene junto con el historial del
          pedido.
        </li>
        <li>
          <strong>Ubicación GPS (repartidores):</strong> cuando el restaurante
          asigna un repartidor a un pedido de delivery, el repartidor puede
          optar voluntariamente por compartir su ubicación GPS en tiempo real.
          Esta ubicación se transmite durante el período de entrega y no se
          almacena de forma permanente — solo se guarda la última posición
          conocida mientras el pedido está activo.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP (para seguridad y rate
          limiting), tipo de navegador, dispositivo.
        </li>
      </ul>
      <h3>2.3 Datos Recopilados Automáticamente</h3>
      <ul>
        <li>
          Cookies de sesión necesarias para autenticación (ver nuestra{" "}
          <Link href="/cookies">Política de Cookies</Link>).
        </li>
        <li>
          Registros de servidor (logs) con fines de seguridad y diagnóstico.
        </li>
        <li>
          Grabaciones de algunas sesiones para detectar errores (ver Sentry en
          la sección 4).
        </li>
      </ul>

      <h2>3. Cómo Usamos la Información</h2>
      <ul>
        <li>
          <strong>Proveer el servicio:</strong> crear y mostrar menús digitales,
          procesar pedidos, gestionar suscripciones.
        </li>
        <li>
          <strong>Comunicaciones:</strong> enviar confirmaciones de pedidos,
          notificaciones de estado, alertas de facturación y actualizaciones del
          servicio.
        </li>
        <li>
          <strong>Mejora del producto:</strong> analizar el uso agregado y
          anónimo para mejorar la plataforma.
        </li>
        <li>
          <strong>Seguridad:</strong> detectar y prevenir fraudes, abusos o
          accesos no autorizados.
        </li>
        <li>
          <strong>Cumplimiento legal:</strong> cumplir con obligaciones legales,
          regulatorias o judiciales.
        </li>
      </ul>

      <h2>4. Con Quién Compartimos la Información</h2>
      <p>
        No vendemos ni alquilamos datos personales. Compartimos información
        únicamente con:
      </p>
      <ul>
        <li>
          <strong>Stripe:</strong> para procesar pagos y suscripciones de forma
          segura.{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Stripe
          </a>
          .
        </li>
        <li>
          <strong>Supabase:</strong> nuestra infraestructura de base de datos y
          autenticación, alojada en servidores seguros.{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Supabase
          </a>
          .
        </li>
        <li>
          <strong>Resend:</strong> para el envío de correos electrónicos
          transaccionales.{" "}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Resend
          </a>
          .
        </li>
        <li>
          <strong>Vercel:</strong> aloja nuestro sitio y las tiendas de los
          restaurantes, y procesa cada visita. Sus registros técnicos incluyen
          la dirección IP, el navegador y la página solicitada.
        </li>
        <li>
          <strong>Sentry:</strong> para detectar y diagnosticar errores. Recibe
          datos técnicos del error (página, navegador, dispositivo y dirección
          IP). Además, en alrededor del 5% de las visitas, y en las sesiones del
          panel, el Counter, la cocina y las páginas de acceso en las que ocurre
          un error, graba cómo se ve y se usa la página. En los menús, el pago y
          el seguimiento de pedidos todo el texto queda enmascarado y no se
          guarda el contenido de las solicitudes a nuestros servidores. En el
          panel, el Counter y la cocina se enmascara lo que se escribe en los
          campos de formulario, pero puede verse el resto del texto en pantalla
          y el contenido de las solicitudes a nuestros servidores.
        </li>
        <li>
          <strong>Crisp:</strong> para el chat de soporte de nuestro sitio y del
          panel. Recibe los mensajes que nos escribes y, si tienes sesión
          iniciada en el panel, tu nombre y tu email.
        </li>
        <li>
          <strong>Google Maps Platform:</strong> para autocompletar la
          dirección al hacer un pedido con entrega (y en la configuración del
          restaurante) y para mostrar el mapa de la entrega. Recibe lo que
          escribes en el campo de dirección y la dirección de entrega.
        </li>
        <li>
          <strong>Google (Gemini):</strong> para las funciones de IA del panel:
          generar y mejorar fotos de productos, escribir descripciones, importar
          el menú desde una foto y sugerir textos de campañas y publicaciones
          para redes. Recibe descripciones y fotos de productos, fotos del menú
          y textos del restaurante. Para sugerir campañas y publicaciones
          también puede recibir el texto de reseñas de clientes (en las
          publicaciones, con el nombre que puso quien la escribió). Si Gemini no
          responde, esos textos se piden a <strong>OpenRouter</strong> como
          respaldo, con los mismos datos.
        </li>
        <li>
          <strong>fal.ai:</strong> para generar y mejorar fotos de productos con
          IA. Recibe descripciones y fotos de productos; no recibe datos de los
          clientes del restaurante.
        </li>
        <li>
          <strong>Anthropic (Claude):</strong> para el asistente de IA del panel
          (MENIUS AI) y para sugerir respuestas a reseñas. Cuando el restaurante
          usa el asistente, enviamos a la API de Anthropic lo que escribe en el
          chat y los datos del negocio necesarios para responder: menú, ventas,
          pedidos, promociones, mesas, equipo y las reseñas recientes (texto,
          calificación y el nombre que puso quien la escribió). Si pregunta por
          sus clientes o por los pedidos del día, también se envían el nombre
          del cliente, su historial de pedidos (cantidad, total gastado y
          fechas) y las etiquetas y notas que el restaurante le haya puesto.{" "}
          <strong>No se envían el teléfono ni el email de los clientes.</strong>{" "}
          Para sugerir la respuesta a una reseña se envían su texto, su
          calificación y el nombre de quien la escribió. Anthropic procesa estos
          datos como proveedor nuestro, conforme a su{" "}
          <a
            href="https://www.anthropic.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidad
          </a>
          .
        </li>
        <li>
          <strong>Autoridades legales:</strong> cuando sea requerido por ley,
          orden judicial o proceso legal.
        </li>
      </ul>

      <h2>5. Retención de Datos</h2>
      <ul>
        <li>
          <strong>Cuentas activas:</strong> mantenemos los datos mientras la
          cuenta esté activa.
        </li>
        <li>
          <strong>Cuentas cerradas:</strong> si un restaurante cierra su cuenta,
          conservamos sus datos para que pueda recuperarla si vuelve. Puede
          pedirnos que los borremos en cualquier momento escribiendo a{" "}
          <a href="mailto:soporte@menius.app">soporte@menius.app</a>; los
          borraremos, salvo lo que debamos conservar por obligación legal (por
          ejemplo, registros fiscales).
        </li>
        <li>
          <strong>Pedidos de consumidores:</strong> se conservan como parte del
          historial del restaurante mientras su cuenta exista. Si hiciste un
          pedido y quieres que borremos tus datos, escríbenos a{" "}
          <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
        </li>
        <li>
          <strong>Logs de seguridad:</strong> se retienen por 30 días.
        </li>
      </ul>

      <h2>6. Seguridad</h2>
      <p>
        Implementamos medidas de seguridad estándar de la industria, incluyendo:
      </p>
      <ul>
        <li>Cifrado en tránsito (HTTPS/TLS) y en reposo.</li>
        <li>Autenticación segura con tokens JWT.</li>
        <li>
          Row Level Security (RLS) en la base de datos para aislamiento de datos
          entre restaurantes.
        </li>
        <li>Rate limiting en endpoints públicos.</li>
        <li>
          Contraseñas encriptadas con bcrypt (gestionado por Supabase Auth).
        </li>
        <li>Headers de seguridad (CSP, X-Frame-Options, etc.).</li>
      </ul>

      <h2>7. Tus Derechos</h2>
      <p>Dependiendo de tu ubicación, puedes tener los siguientes derechos:</p>
      <ul>
        <li>
          <strong>Acceso:</strong> solicitar una copia de tus datos personales.
        </li>
        <li>
          <strong>Rectificación:</strong> corregir datos inexactos o
          incompletos.
        </li>
        <li>
          <strong>Eliminación:</strong> solicitar la eliminación de tus datos
          (&ldquo;derecho al olvido&rdquo;).
        </li>
        <li>
          <strong>Portabilidad:</strong> recibir tus datos en un formato
          estructurado y legible.
        </li>
        <li>
          <strong>Oposición:</strong> oponerte al procesamiento de tus datos
          para ciertos fines.
        </li>
        <li>
          <strong>Retirar consentimiento:</strong> cuando el procesamiento se
          base en tu consentimiento.
        </li>
      </ul>
      <p>
        Para ejercer cualquiera de estos derechos, contáctanos en{" "}
        <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
      </p>

      <h2>8. Residentes de California (CCPA)</h2>
      <p>
        Si eres residente de California, tienes derechos adicionales bajo la Ley
        de Privacidad del Consumidor de California (CCPA), incluyendo el derecho
        a saber qué datos recopilamos, el derecho a la eliminación, y el derecho
        a no ser discriminado por ejercer tus derechos. No vendemos información
        personal.
      </p>

      <h2>9. Residentes de Virginia</h2>
      <p>
        Cumplimos con la Ley de Protección de Datos del Consumidor de Virginia
        (VCDPA), incluyendo el derecho de acceso, corrección, eliminación y
        portabilidad de datos, así como el derecho a optar por no recibir
        publicidad dirigida o la venta de datos personales. Para ejercer estos
        derechos, contáctanos en{" "}
        <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
      </p>

      <h2>10. Menores de Edad</h2>
      <p>
        MENIUS no está dirigido a menores de 13 años. No recopilamos
        deliberadamente información de menores. Si descubrimos que hemos
        recopilado datos de un menor, los eliminaremos de inmediato.
      </p>

      <h2>11. Cambios a esta Política</h2>
      <p>
        Podemos actualizar esta política periódicamente. Notificaremos cambios
        significativos por correo electrónico o mediante un aviso en la
        plataforma. La fecha de &ldquo;última actualización&rdquo; al inicio de
        esta página indica cuándo se realizó la revisión más reciente.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Si tienes preguntas sobre esta Política de Privacidad, puedes
        contactarnos en:
      </p>
      <ul>
        <li>
          <strong>Empresa:</strong> MENIUS LLC
        </li>
        <li>
          <strong>Dirección:</strong> 8401 Mayland Dr, Ste S, Henrico, VA 23294,
          EE.UU.
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:soporte@menius.app">soporte@menius.app</a>
        </li>
        <li>
          <strong>Sitio web:</strong>{" "}
          <a href="https://menius.app">menius.app</a>
        </li>
      </ul>
    </div>
  );
}

function ContentEn({ className }: { className: string }) {
  return (
    <div className={className}>
      <h2>1. Introduction</h2>
      <p>
        MENIUS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the
        Platform&rdquo;) is a software-as-a-service (SaaS) platform that enables
        restaurants to create digital menus, receive online orders, and manage
        their business. This Privacy Policy describes how we collect, use,
        store, and protect the personal information of our users.
      </p>
      <p>
        By using MENIUS, you accept the practices described in this policy. If
        you do not agree, please do not use our services.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Restaurant Data (Business Clients)</h3>
      <ul>
        <li>
          <strong>Account data:</strong> name, email address, password
          (encrypted), restaurant name.
        </li>
        <li>
          <strong>Business data:</strong> restaurant name, address, menu URL
          (slug), logo, categories, products, prices, product images.
        </li>
        <li>
          <strong>Billing data:</strong> processed directly by Stripe. MENIUS
          does not store credit card numbers or sensitive financial data.
        </li>
        <li>
          <strong>Usage data:</strong> dashboard access, usage frequency,
          actions performed.
        </li>
      </ul>
      <h3>2.2 End Consumer Data (Restaurant Customers)</h3>
      <ul>
        <li>
          <strong>Order data:</strong> customer name, phone number, email
          (optional), delivery address and its map location (if applicable),
          order contents, special notes.
        </li>
        <li>
          <strong>History with the restaurant:</strong> if an order is not
          picked up, not received or not paid for, the restaurant may record
          it. Only that restaurant sees this record, and it may lead the
          restaurant to ask you to pay in advance on future orders.
        </li>
        <li>
          <strong>Proof-of-delivery photos:</strong> when a restaurant uses the
          delivery feature with their own drivers, the driver may upload a
          photograph as proof of delivery. This photo may include an image of
          the delivery address exterior. It is stored securely in Supabase
          Storage, accessible only by the restaurant, and retained alongside the
          order history.
        </li>
        <li>
          <strong>GPS location (drivers):</strong> when the restaurant assigns a
          driver to a delivery order, the driver may voluntarily choose to share
          their real-time GPS location. This location is transmitted during the
          delivery period and is not stored permanently — only the last known
          position is saved while the order is active.
        </li>
        <li>
          <strong>Technical data:</strong> IP address (for security and rate
          limiting), browser type, device.
        </li>
      </ul>
      <h3>2.3 Automatically Collected Data</h3>
      <ul>
        <li>
          Session cookies necessary for authentication (see our{" "}
          <Link href="/cookies">Cookie Policy</Link>).
        </li>
        <li>Server logs for security and diagnostic purposes.</li>
        <li>
          Recordings of some sessions to detect errors (see Sentry in section
          4).
        </li>
      </ul>

      <h2>3. How We Use Information</h2>
      <ul>
        <li>
          <strong>Provide the service:</strong> create and display digital
          menus, process orders, manage subscriptions.
        </li>
        <li>
          <strong>Communications:</strong> send order confirmations, status
          notifications, billing alerts, and service updates.
        </li>
        <li>
          <strong>Product improvement:</strong> analyze aggregate and anonymous
          usage to improve the platform.
        </li>
        <li>
          <strong>Security:</strong> detect and prevent fraud, abuse, or
          unauthorized access.
        </li>
        <li>
          <strong>Legal compliance:</strong> fulfill legal, regulatory, or
          judicial obligations.
        </li>
      </ul>

      <h2>4. Who We Share Information With</h2>
      <p>
        We do not sell or rent personal data. We share information only with:
      </p>
      <ul>
        <li>
          <strong>Stripe:</strong> to process payments and subscriptions
          securely.{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stripe Policy
          </a>
          .
        </li>
        <li>
          <strong>Supabase:</strong> our database and authentication
          infrastructure, hosted on secure servers.{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase Policy
          </a>
          .
        </li>
        <li>
          <strong>Resend:</strong> for sending transactional emails.{" "}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resend Policy
          </a>
          .
        </li>
        <li>
          <strong>Vercel:</strong> hosts our website and the restaurants&apos;
          stores, and processes every visit. Its technical logs include the IP
          address, the browser and the page requested.
        </li>
        <li>
          <strong>Sentry:</strong> to detect and diagnose errors. It receives
          technical data about the error (page, browser, device and IP
          address). In addition, on about 5% of visits, and on dashboard,
          Counter, kitchen and sign-in sessions where an error occurs, it
          records how the page looks and is used. On menus, checkout and order
          tracking, all text is masked and the content of requests to our
          servers is not stored. On the dashboard, Counter and kitchen, what you
          type into form fields is masked, but the rest of the on-screen text
          may be visible, as well as the content of requests to our servers.
        </li>
        <li>
          <strong>Crisp:</strong> for the support chat on our website and in
          the dashboard. It receives the messages you send us and, if you are
          signed in to the dashboard, your name and email.
        </li>
        <li>
          <strong>Google Maps Platform:</strong> to autocomplete the address
          when you place a delivery order (and in the restaurant&apos;s
          settings) and to show the delivery map. It receives what you type in
          the address field and the delivery address.
        </li>
        <li>
          <strong>Google (Gemini):</strong> for the AI features in the
          dashboard: generating and enhancing product photos, writing
          descriptions, importing the menu from a photo, and suggesting copy
          for campaigns and social media posts. It receives product
          descriptions and photos, menu photos and the restaurant&apos;s text.
          To suggest campaigns and posts it may also receive the text of
          customer reviews (for posts, with the name the reviewer entered). If
          Gemini does not respond, that copy is requested from{" "}
          <strong>OpenRouter</strong> as a backup, with the same data.
        </li>
        <li>
          <strong>fal.ai:</strong> to generate and enhance product photos with
          AI. It receives product descriptions and photos; it does not receive
          data about the restaurant&apos;s customers.
        </li>
        <li>
          <strong>Anthropic (Claude):</strong> for the dashboard AI assistant
          (MENIUS AI) and to suggest replies to reviews. When the restaurant
          uses the assistant, we send the Anthropic API what it types in the
          chat and the business data needed to answer: menu, sales, orders,
          promotions, tables, team, and recent reviews (text, rating and the
          name the reviewer entered). If it asks about its customers or
          today&apos;s orders, we also send the customer&apos;s name, their
          order history (number of orders, total spent and dates) and any tags
          and notes the restaurant added.{" "}
          <strong>Customers&apos; phone numbers and emails are not sent.</strong>{" "}
          To suggest a reply to a review, we send its text, its rating and the
          reviewer&apos;s name. Anthropic processes this data as our service
          provider, under its{" "}
          <a
            href="https://www.anthropic.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </li>
        <li>
          <strong>Legal authorities:</strong> when required by law, court order,
          or legal process.
        </li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li>
          <strong>Active accounts:</strong> we maintain data as long as the
          account is active.
        </li>
        <li>
          <strong>Closed accounts:</strong> if a restaurant closes its account,
          we keep its data so it can recover the account if it comes back. It
          can ask us to delete the data at any time by writing to{" "}
          <a href="mailto:soporte@menius.app">soporte@menius.app</a>; we will
          delete it, except for what we must keep to meet legal obligations
          (tax records, for example).
        </li>
        <li>
          <strong>Consumer orders:</strong> kept as part of the
          restaurant&apos;s order history for as long as its account exists. If
          you placed an order and want us to delete your data, write to us at{" "}
          <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
        </li>
        <li>
          <strong>Security logs:</strong> retained for 30 days.
        </li>
      </ul>

      <h2>6. Security</h2>
      <p>We implement industry-standard security measures, including:</p>
      <ul>
        <li>Encryption in transit (HTTPS/TLS) and at rest.</li>
        <li>Secure authentication with JWT tokens.</li>
        <li>
          Row Level Security (RLS) in the database for data isolation between
          restaurants.
        </li>
        <li>Rate limiting on public endpoints.</li>
        <li>Passwords encrypted with bcrypt (managed by Supabase Auth).</li>
        <li>Security headers (CSP, X-Frame-Options, etc.).</li>
      </ul>

      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may have the following rights:</p>
      <ul>
        <li>
          <strong>Access:</strong> request a copy of your personal data.
        </li>
        <li>
          <strong>Rectification:</strong> correct inaccurate or incomplete data.
        </li>
        <li>
          <strong>Deletion:</strong> request deletion of your data (&ldquo;right
          to be forgotten&rdquo;).
        </li>
        <li>
          <strong>Portability:</strong> receive your data in a structured,
          readable format.
        </li>
        <li>
          <strong>Objection:</strong> object to the processing of your data for
          certain purposes.
        </li>
        <li>
          <strong>Withdraw consent:</strong> when processing is based on your
          consent.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
      </p>

      <h2>8. California Residents (CCPA)</h2>
      <p>
        If you are a California resident, you have additional rights under the
        California Consumer Privacy Act (CCPA), including the right to know what
        data we collect, the right to deletion, and the right not to be
        discriminated against for exercising your rights. We do not sell
        personal information.
      </p>

      <h2>9. Virginia Residents</h2>
      <p>
        We comply with the Virginia Consumer Data Protection Act (VCDPA),
        including the right to access, correct, delete, and port your personal
        data, as well as the right to opt out of targeted advertising or the
        sale of personal data. To exercise these rights, contact us at{" "}
        <a href="mailto:soporte@menius.app">soporte@menius.app</a>.
      </p>

      <h2>10. Minors</h2>
      <p>
        MENIUS is not directed at children under 13 years of age. We do not
        knowingly collect information from minors. If we discover that we have
        collected data from a minor, we will delete it immediately.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this policy periodically. We will notify you of
        significant changes by email or through a notice on the platform. The
        &ldquo;last updated&rdquo; date at the top of this page indicates when
        the most recent revision was made.
      </p>

      <h2>12. Contact</h2>
      <p>
        If you have questions about this Privacy Policy, you can contact us at:
      </p>
      <ul>
        <li>
          <strong>Company:</strong> MENIUS LLC
        </li>
        <li>
          <strong>Address:</strong> 8401 Mayland Dr, Ste S, Henrico, VA 23294,
          USA
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:soporte@menius.app">soporte@menius.app</a>
        </li>
        <li>
          <strong>Website:</strong> <a href="https://menius.app">menius.app</a>
        </li>
      </ul>
    </div>
  );
}

export function PrivacyPolicyContent({ locale, tone = "dark" }: { locale: "es" | "en"; tone?: "dark" | "light" }) {
  const className = tone === "light" ? LEGAL_PROSE_LIGHT : DARK;
  return locale === "en" ? <ContentEn className={className} /> : <ContentEs className={className} />;
}
