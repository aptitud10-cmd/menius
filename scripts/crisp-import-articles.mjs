/**
 * Crisp Help Center — Bulk article importer
 *
 * Usage:
 *   CRISP_ID=your_identifier CRISP_KEY=your_key node scripts/crisp-import-articles.mjs
 *
 * Get your API credentials at:
 *   app.crisp.chat → Settings → API Keys → New API Key
 *
 * Website ID is already set below (your Crisp Website ID).
 */

const WEBSITE_ID = 'c7619998-0c4f-4fa1-9cd8-3554c47bcd73';
const LOCALE = 'es';
const API_BASE = 'https://api.crisp.chat/v1';

const CRISP_ID = process.env.CRISP_ID;
const CRISP_KEY = process.env.CRISP_KEY;

if (!CRISP_ID || !CRISP_KEY) {
  console.error('❌  Missing credentials. Run with:');
  console.error('   CRISP_ID=xxx CRISP_KEY=yyy node scripts/crisp-import-articles.mjs');
  process.exit(1);
}

const AUTH = Buffer.from(`${CRISP_ID}:${CRISP_KEY}`).toString('base64');

async function crispRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${AUTH}`,
      'Content-Type': 'application/json',
      'X-Crisp-Tier': 'plugin',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const SECTIONS = [
  { name: '🚀 Primeros pasos', order: 1 },
  { name: '🍽️ Productos y menú', order: 2 },
  { name: '📦 Pedidos', order: 3 },
  { name: '💳 Planes y facturación', order: 4 },
  { name: '⚙️ Configuración técnica', order: 5 },
  { name: '🛠️ Solución de problemas', order: 6 },
];

const ARTICLES = [
  // --- Primeros pasos ---
  {
    section: '🚀 Primeros pasos',
    title: '¿Cómo creo mi primer menú?',
    description: 'Aprende a agregar categorías y productos a tu menú digital.',
    content: `Ve a tu dashboard en **menius.app/app** → haz clic en **"Agregar categoría"** (ej: Entradas, Platos principales) → dentro de cada categoría haz clic en **"Agregar producto"** → llena el nombre, precio y descripción.

También puedes importar todo tu menú automáticamente subiendo una foto de tu carta con nuestra función de IA. Es muy rápido y preciso.`,
  },
  {
    section: '🚀 Primeros pasos',
    title: '¿Cómo genero el código QR para mis mesas?',
    description: 'Genera y descarga el QR de cada mesa en segundos.',
    content: `En tu dashboard ve a la sección **"Mesas"** → haz clic en una mesa → selecciona **"Ver QR"** → descarga el QR en PDF e imprímelo.

Colócalo en la mesa y tus clientes podrán escanear y ver tu menú al instante, sin descargar ninguna app.`,
  },
  {
    section: '🚀 Primeros pasos',
    title: '¿Cómo comparto el link de mi menú?',
    description: 'Comparte tu menú público en redes, WhatsApp o Google Maps.',
    content: `Tu menú tiene una URL pública del tipo **menius.app/menu/tu-restaurante**. La encuentras en el dashboard en la sección **"Mi menú" → "Ver menú público"**.

Puedes compartir este link en WhatsApp, Instagram, Google Maps, o donde quieras. No se requiere ninguna app para que tus clientes lo vean.`,
  },

  // --- Productos y menú ---
  {
    section: '🍽️ Productos y menú',
    title: '¿Cómo agrego fotos a mis productos?',
    description: 'Sube fotos o genera imágenes automáticas con IA.',
    content: `Edita cualquier producto → haz clic en **"Cambiar foto"** → sube una imagen desde tu computadora.

O usa **"Generar con IA"** para que MENIUS cree automáticamente una foto profesional basada en el nombre del platillo. Los productos con foto generan hasta un 30% más de ventas.`,
  },
  {
    section: '🍽️ Productos y menú',
    title: '¿Cómo importo mi menú desde una foto?',
    description: 'Digitaliza tu carta en papel usando inteligencia artificial.',
    content: `En tu dashboard ve a **"Menú" → "Importar con IA"** → sube una foto de tu carta en papel o PDF.

MENIUS detecta automáticamente los productos, precios y categorías y los agrega a tu menú. Puedes editar cualquier detalle después de la importación.`,
  },
  {
    section: '🍽️ Productos y menú',
    title: '¿Cómo marco un producto como agotado?',
    description: 'Oculta temporalmente productos sin eliminarlos del menú.',
    content: `Edita el producto → activa el toggle **"No disponible"** o **"Agotado"**.

El producto seguirá visible en el menú pero aparecerá marcado y los clientes no podrán agregarlo al carrito. Puedes reactivarlo en cualquier momento.`,
  },
  {
    section: '🍽️ Productos y menú',
    title: '¿Cómo cambio el idioma de mi menú?',
    description: 'Configura tu menú en español o inglés.',
    content: `En tu dashboard ve a **"Configuración" → "Idioma del menú"**. Puedes elegir español o inglés.

También puedes activar la detección automática por ubicación del cliente, para que el menú aparezca en el idioma correcto según dónde esté el comensal.`,
  },

  // --- Pedidos ---
  {
    section: '📦 Pedidos',
    title: '¿Cómo recibo los pedidos?',
    description: 'Recibe pedidos en tiempo real con alertas de sonido y WhatsApp.',
    content: `Los pedidos llegan en tiempo real al panel **"Pedidos"** en tu dashboard. También recibes una notificación de sonido automática.

Puedes configurar alertas adicionales por **WhatsApp o email** en **"Configuración → Notificaciones"**. Recomendamos tener el dashboard abierto en una tablet en la cocina o barra.`,
  },
  {
    section: '📦 Pedidos',
    title: '¿Puedo tener delivery y pickup?',
    description: 'Habilita pedidos para llevar y a domicilio en planes de pago.',
    content: `El **plan gratuito** incluye pedidos dine-in (en el restaurante).

Para habilitar **pickup** y **delivery** necesitas el plan Starter ($39/mes) o superior. Puedes comparar todos los planes en [menius.app/pricing](https://menius.app/pricing).`,
  },
  {
    section: '📦 Pedidos',
    title: '¿Cómo acepto pagos en línea?',
    description: 'Conecta Stripe para recibir pagos con tarjeta desde el menú.',
    content: `Los pagos en línea están disponibles en planes Starter y superiores.

Ve a **"Configuración → Pagos"** y conecta tu cuenta de Stripe. Tus clientes podrán pagar con tarjeta, débito o servicios digitales directamente desde el menú, sin efectivo.`,
  },

  // --- Planes y facturación ---
  {
    section: '💳 Planes y facturación',
    title: '¿Qué incluye el plan gratuito?',
    description: 'Conoce los límites y beneficios del plan Free de MENIUS.',
    content: `El **plan Free es gratis para siempre** e incluye:

- Menú digital con productos ilimitados
- Hasta 5 mesas con código QR
- Hasta 50 pedidos por mes
- Dashboard completo con analytics básicos

No requiere tarjeta de crédito. Puedes hacer upgrade en cualquier momento.`,
  },
  {
    section: '💳 Planes y facturación',
    title: '¿Qué pasa cuando termina mi periodo de prueba?',
    description: 'Al terminar el trial tu cuenta pasa al plan Free automáticamente.',
    content: `Tu cuenta pasa **automáticamente al plan Free** (gratis para siempre). No hay cobros automáticos, no se requiere tarjeta de crédito.

Tu menú digital sigue funcionando con hasta 5 mesas y 50 pedidos por mes. Si quieres mantener las funciones del plan Starter, puedes suscribirte desde **"Dashboard → Facturación"**.`,
  },
  {
    section: '💳 Planes y facturación',
    title: '¿Cómo cambio o cancelo mi plan?',
    description: 'Gestiona tu suscripción desde el dashboard en cualquier momento.',
    content: `Ve a tu dashboard → **"Facturación"** → haz clic en **"Gestionar suscripción"**.

Desde ahí puedes cambiar de plan, cancelar o descargar tus facturas. Los cambios aplican al final del periodo de facturación actual. No hay penalizaciones por cancelar.`,
  },
  {
    section: '💳 Planes y facturación',
    title: '¿Emiten facturas fiscales?',
    description: 'Descarga tus facturas desde el dashboard.',
    content: `Sí. Todas las facturas de tu suscripción están disponibles en **"Dashboard → Facturación → Historial de pagos"**.

Las facturas las genera **Stripe**, nuestro procesador de pagos certificado PCI-DSS. Si necesitas datos fiscales específicos en la factura (RFC, razón social), contáctanos.`,
  },

  // --- Configuración técnica ---
  {
    section: '⚙️ Configuración técnica',
    title: '¿Cómo configuro mi impresora?',
    description: 'Conecta una impresora térmica para imprimir tickets de pedidos.',
    content: `Ve a **"Configuración → Impresora"**. MENIUS es compatible con impresoras térmicas estándar de **58mm y 80mm**.

Conecta tu impresora por USB o red local y configura el formato del ticket. Recomendamos impresoras de la marca Epson o Star para mejor compatibilidad.`,
  },
  {
    section: '⚙️ Configuración técnica',
    title: '¿MENIUS tiene app móvil?',
    description: 'Accede al dashboard desde cualquier dispositivo sin instalar nada.',
    content: `El dashboard está optimizado para funcionar desde el **navegador en cualquier dispositivo** — tablet, teléfono o computadora. No necesitas instalar nada.

En **iOS y Android** puedes agregar menius.app/app a tu pantalla de inicio para una experiencia tipo app nativa. Una app oficial está en el roadmap de 2026.`,
  },
  {
    section: '⚙️ Configuración técnica',
    title: '¿Mis datos están seguros?',
    description: 'Seguridad y privacidad de tus datos en MENIUS.',
    content: `Sí. Usamos **Supabase** con cifrado de extremo a extremo. Tus datos nunca se comparten con terceros ni se usan para entrenar modelos de IA.

Puedes **exportar o eliminar tu cuenta** en cualquier momento desde "Configuración → Mi cuenta". Cumplimos con GDPR y las regulaciones de protección de datos de México y Colombia.`,
  },
  {
    section: '⚙️ Configuración técnica',
    title: '¿Cómo agrego usuarios de staff?',
    description: 'Invita a tu equipo con diferentes roles y permisos.',
    content: `Disponible en planes **Pro y Business**. Ve a **"Configuración → Equipo" → "Invitar usuario"**.

Puedes asignar roles de **administrador** (acceso completo) o **mesero** (solo ve pedidos y mesas). Cada usuario tiene su propio acceso sin compartir contraseña.`,
  },

  // --- Solución de problemas ---
  {
    section: '🛠️ Solución de problemas',
    title: 'Mi menú no carga o aparece en blanco',
    description: 'Pasos para resolver problemas de carga del menú público.',
    content: `Prueba estos pasos en orden:

1. **Limpia el caché del navegador** (Ctrl+Shift+R en Windows, Cmd+Shift+R en Mac)
2. Verifica que tus productos estén **activos** y no marcados como agotados
3. Comprueba que la **URL de tu menú** sea correcta (Dashboard → Mi menú → Ver menú público)
4. Prueba abriendo el menú en modo incógnito

Si el problema persiste, escríbenos con una captura de pantalla y te ayudamos.`,
  },
  {
    section: '🛠️ Solución de problemas',
    title: 'No estoy recibiendo notificaciones de pedidos',
    description: 'Soluciona problemas con las alertas de nuevos pedidos.',
    content: `Verifica estos puntos:

1. En **"Configuración → Notificaciones"** comprueba que las alertas estén activadas
2. Para notificaciones de **sonido**, el navegador debe tener permisos de audio habilitados
3. Para **WhatsApp**, confirma que el número esté correctamente configurado y con el formato internacional (+52 para México)
4. Mantén el dashboard **abierto en una pestaña activa** — las notificaciones no llegan si la pestaña está cerrada

Si el problema continúa, contáctanos y revisamos tu configuración.`,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🚀 MENIUS — Crisp Help Center importer`);
  console.log(`   Website: ${WEBSITE_ID}`);
  console.log(`   Locale:  ${LOCALE}`);
  console.log(`   Articles: ${ARTICLES.length}\n`);

  // 1. Create sections
  const sectionMap = {};
  for (const sec of SECTIONS) {
    process.stdout.write(`📁 Creating section "${sec.name}"… `);
    try {
      const data = await crispRequest(
        'POST',
        `/website/${WEBSITE_ID}/helpdesk/locale/${LOCALE}/section`,
        { name: sec.name, order: sec.order },
      );
      sectionMap[sec.name] = data.section_id;
      console.log(`✅ (${data.section_id})`);
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  // 2. Create articles
  let created = 0;
  for (const [i, art] of ARTICLES.entries()) {
    const sectionId = sectionMap[art.section];
    process.stdout.write(`📄 [${i + 1}/${ARTICLES.length}] "${art.title}"… `);
    try {
      await crispRequest(
        'POST',
        `/website/${WEBSITE_ID}/helpdesk/locale/${LOCALE}/article`,
        {
          title: art.title,
          content: art.content,
          description: art.description,
          section_id: sectionId ?? undefined,
          order: i + 1,
          featured: false,
        },
      );
      console.log('✅');
      created++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✨ Done! ${created}/${ARTICLES.length} articles created.`);
  console.log(`   View them at: https://app.crisp.chat\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
