export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: number;
  date: string;
  author: string;
  content: string;
  title_en?: string;
  description_en?: string;
  category_en?: string;
  content_en?: string;
}

type Locale = 'es' | 'en';

export function getLocalizedPost(post: BlogPost, locale: Locale): BlogPost {
  if (locale === 'en' && post.title_en) {
    return {
      ...post,
      title: post.title_en,
      description: post.description_en || post.description,
      category: post.category_en || post.category,
      content: post.content_en || post.content,
    };
  }
  return post;
}

export function getLocalizedBlogPosts(locale: Locale): BlogPost[] {
  return blogPosts.map(p => getLocalizedPost(p, locale));
}

export function getLocalizedBlogPost(slug: string, locale: Locale): BlogPost | undefined {
  const post = blogPosts.find(p => p.slug === slug);
  if (!post) return undefined;
  return getLocalizedPost(post, locale);
}

export function getLocalizedRelatedPosts(slug: string, locale: Locale, limit = 3): BlogPost[] {
  const current = blogPosts.find(p => p.slug === slug);
  if (!current) return getLocalizedBlogPosts(locale).slice(0, limit);
  return blogPosts
    .filter(p => p.slug !== slug)
    .sort((a, b) => (a.category === current.category ? -1 : b.category === current.category ? 1 : 0))
    .slice(0, limit)
    .map(p => getLocalizedPost(p, locale));
}

export function getLocalizedCategories(locale: Locale): string[] {
  return Array.from(new Set(getLocalizedBlogPosts(locale).map(p => p.category)));
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'como-crear-menu-digital-restaurante',
    title: 'Cómo crear un menú digital para tu restaurante en 2026: Guía completa',
    description: 'Aprende paso a paso cómo digitalizar tu menú, generar códigos QR para tus mesas, y empezar a recibir pedidos online desde el celular de tus clientes.',
    category: 'Guías',
    readTime: 8,
    date: '2026-02-10',
    author: 'MENIUS',
    content: `
## ¿Por qué necesitas un menú digital en 2026?

La industria restaurantera ha cambiado radicalmente. Los clientes esperan poder ver tu menú desde su celular, con fotos atractivas y la opción de ordenar sin esperar al mesero. Un menú digital no es un lujo — es una necesidad competitiva.

Según estudios recientes, **el 70% de los clientes** prefiere escanear un código QR que esperar un menú físico. Y los restaurantes que adoptan menús digitales reportan un **aumento del 20-35% en pedidos**.

## Paso 1: Elige la plataforma correcta

No todas las soluciones son iguales. Busca una plataforma que ofrezca:

- **Menú visual con fotos** — Los platillos con fotos se venden hasta 30% más
- **Pedidos en tiempo real** — Que el pedido llegue directo a tu cocina
- **Sin comisiones por pedido** — Evita plataformas que cobran porcentaje
- **QR personalizados por mesa** — Para identificar de dónde viene cada pedido
- **Analytics** — Para saber qué se vende más y cuándo

Con MENIUS, tienes todo esto incluido desde $39 USD/mes sin comisiones adicionales.

## Paso 2: Organiza tu menú en categorías

La estructura de tu menú digital importa más de lo que crees. Recomendamos:

1. **Entradas / Aperitivos** — Lo primero que ven tus clientes
2. **Platos fuertes** — Tu sección principal
3. **Especialidades de la casa** — Lo que te diferencia
4. **Bebidas** — Separadas para fácil acceso
5. **Postres** — El cierre perfecto

Consejo: No uses más de 6-8 categorías. Un menú con demasiadas opciones genera "parálisis de decisión" y reduce las ventas.

## Paso 3: Agrega fotos profesionales

Las fotos son el factor #1 que influye en la decisión de compra. Tienes dos opciones:

- **Fotos propias**: Con buena iluminación natural y un fondo limpio
- **Fotos con IA**: Plataformas como MENIUS incluyen generación de fotos con inteligencia artificial. Describes el platillo y la IA crea una imagen profesional en segundos

## Paso 4: Configura precios, variantes y extras

Un buen menú digital permite configurar:

- **Variantes**: Tamaño (chico/mediano/grande), tipo de proteína, etc.
- **Extras**: Ingredientes adicionales con precio (queso extra, tocino, etc.)
- **Descripciones**: Breves pero apetitosas

## Paso 5: Genera e imprime tus QR

Cada mesa debe tener su propio código QR. Esto permite:

- Identificar de qué mesa viene cada pedido
- Ofrecer una experiencia personalizada
- Reducir errores en la toma de pedidos

Imprime los QR en material resistente al agua y colócalos en un lugar visible de cada mesa.

## Paso 6: Recibe pedidos y gestiona tu operación

Con tu menú digital activo, los pedidos llegan a tu dashboard en tiempo real. Puedes:

- Ver pedidos en un tablero Kanban (pendiente → preparando → listo)
- Recibir alertas por sonido, WhatsApp o email
- Revisar analytics para optimizar tu menú

## Conclusión

Digitalizar tu menú es una de las mejores inversiones que puedes hacer para tu restaurante. No solo mejora la experiencia del cliente, sino que aumenta tus ventas, reduce errores, y te da datos valiosos para tomar mejores decisiones.
    `,
    title_en: 'How to Create a Digital Menu for Your Restaurant in 2026: Complete Guide',
    description_en: 'Learn step by step how to digitize your menu, generate QR codes for your tables, and start receiving online orders from your customers\' phones.',
    category_en: 'Guides',
    content_en: `
## Why Do You Need a Digital Menu in 2026?

The restaurant industry has changed dramatically. Customers expect to view your menu from their phone, with attractive photos and the option to order without waiting for a waiter. A digital menu isn't a luxury — it's a competitive necessity.

According to recent studies, **70% of customers** prefer scanning a QR code over waiting for a physical menu. And restaurants that adopt digital menus report a **20-35% increase in orders**.

## Step 1: Choose the Right Platform

Not all solutions are equal. Look for a platform that offers:

- **Visual menu with photos** — Dishes with photos sell up to 30% more
- **Real-time orders** — Orders go straight to your kitchen
- **No per-order commissions** — Avoid platforms that charge a percentage
- **Per-table custom QR codes** — To identify where each order comes from
- **Analytics** — To know what sells most and when

With MENIUS, you get all this included from $39 USD/month with no additional commissions.

## Step 2: Organize Your Menu into Categories

Your digital menu structure matters more than you think. We recommend:

1. **Starters / Appetizers** — The first thing your customers see
2. **Main courses** — Your main section
3. **House specials** — What sets you apart
4. **Drinks** — Separated for easy access
5. **Desserts** — The perfect ending

Tip: Don't use more than 6-8 categories. A menu with too many options creates "decision paralysis" and reduces sales.

## Step 3: Add Professional Photos

Photos are the #1 factor influencing purchase decisions. You have two options:

- **Your own photos**: With good natural lighting and a clean background
- **AI photos**: Platforms like MENIUS include AI-powered photo generation. Describe the dish and AI creates a professional image in seconds

## Step 4: Set Up Prices, Variants, and Extras

A good digital menu lets you configure:

- **Variants**: Size (small/medium/large), protein type, etc.
- **Extras**: Additional ingredients with pricing (extra cheese, bacon, etc.)
- **Descriptions**: Brief but appetizing

## Step 5: Generate and Print Your QR Codes

Each table should have its own QR code. This allows you to:

- Identify which table each order comes from
- Offer a personalized experience
- Reduce errors in order taking

Print QR codes on water-resistant material and place them in a visible spot on each table.

## Step 6: Receive Orders and Manage Your Operations

With your digital menu active, orders arrive at your dashboard in real time. You can:

- View orders on a Kanban board (pending → preparing → ready)
- Receive alerts by sound, WhatsApp, or email
- Review analytics to optimize your menu

## Conclusion

Digitizing your menu is one of the best investments you can make for your restaurant. It not only improves the customer experience but also increases your sales, reduces errors, and gives you valuable data for better decision-making.
    `,
  },
  {
    slug: 'menu-digital-vs-apps-delivery',
    title: 'Menú digital propio vs Apps de delivery: ¿Cuál conviene más?',
    description: 'Comparamos los costos, beneficios y desventajas de tener tu propio menú digital vs depender de apps de delivery como Uber Eats, Rappi o DoorDash.',
    category: 'Comparativas',
    readTime: 6,
    date: '2026-02-08',
    author: 'MENIUS',
    content: `
## El dilema de todo restaurantero

Estar en apps de delivery como Uber Eats, Rappi o DoorDash te da visibilidad, pero el costo es alto. ¿Vale la pena? Analicemos los números.

## Los costos reales de las apps de delivery

Las apps de delivery cobran entre **15% y 30%** de comisión por cada pedido. Esto significa:

| Ventas mensuales | Comisión (25%) | Lo que pierdes al año |
|---|---|---|
| $5,000 | $1,250/mes | **$15,000/año** |
| $10,000 | $2,500/mes | **$30,000/año** |
| $20,000 | $5,000/mes | **$60,000/año** |

Además, la app se queda con los datos de tus clientes. No puedes contactarlos, no puedes hacer marketing directo, y tu marca aparece junto a tu competencia.

## La alternativa: Tu propio menú digital

Con un menú digital propio (como MENIUS), pagas una **tarifa fija mensual** sin importar cuánto vendas:

- **$39-$149/mes** dependiendo del plan
- **0% de comisión** por pedido
- **Tus datos, tu marca, tus clientes**

Ejemplo: Un restaurante que vende $10,000/mes en delivery ahorra **$2,921/mes** cambiando de una app de delivery (25% comisión) a MENIUS Pro ($79/mes).

## ¿Cuándo usar cada opción?

**Apps de delivery son buenas para:**
- Conseguir nuevos clientes que no te conocen
- Ofrecer delivery sin tener repartidores propios

**Tu menú digital es mejor para:**
- Clientes que ya te conocen
- Pedidos desde tu restaurante (dine-in)
- Pickup (el cliente recoge)
- Maximizar tus márgenes de ganancia

## La estrategia ganadora

La mayoría de los restaurantes exitosos usan **ambos canales**:

1. Apps de delivery para adquisición de nuevos clientes
2. Menú digital propio para retención y pedidos directos

La clave es migrar gradualmente a tus clientes al canal directo, donde tú controlas la experiencia y los márgenes.

## Conclusión

No se trata de elegir uno u otro, sino de entender que cada canal tiene su propósito. Pero si hoy dependes 100% de apps de delivery, estás dejando miles de dólares sobre la mesa cada año.
    `,
    title_en: 'Your Own Digital Menu vs Delivery Apps: Which Is Better?',
    description_en: 'We compare the costs, benefits, and drawbacks of having your own digital menu vs depending on delivery apps like Uber Eats, Rappi, or DoorDash.',
    category_en: 'Comparisons',
    content_en: `
## Every Restaurant Owner's Dilemma

Being on delivery apps like Uber Eats, Rappi, or DoorDash gives you visibility, but the cost is high. Is it worth it? Let's analyze the numbers.

## The Real Costs of Delivery Apps

Delivery apps charge between **15% and 30%** commission per order. This means:

| Monthly Sales | Commission (25%) | What You Lose Per Year |
|---|---|---|
| $5,000 | $1,250/month | **$15,000/year** |
| $10,000 | $2,500/month | **$30,000/year** |
| $20,000 | $5,000/month | **$60,000/year** |

Plus, the app keeps your customer data. You can't contact them, you can't do direct marketing, and your brand appears alongside your competition.

## The Alternative: Your Own Digital Menu

With your own digital menu (like MENIUS), you pay a **fixed monthly fee** regardless of how much you sell:

- **$39-$149/month** depending on the plan
- **0% commission** per order
- **Your data, your brand, your customers**

Example: A restaurant selling $10,000/month in delivery saves **$2,921/month** switching from a delivery app (25% commission) to MENIUS Pro ($79/month).

## When to Use Each Option?

**Delivery apps are good for:**
- Getting new customers who don't know you
- Offering delivery without having your own drivers

**Your digital menu is better for:**
- Customers who already know you
- In-restaurant orders (dine-in)
- Pickup (customer picks up)
- Maximizing your profit margins

## The Winning Strategy

Most successful restaurants use **both channels**:

1. Delivery apps for acquiring new customers
2. Your own digital menu for retention and direct orders

The key is gradually migrating your customers to the direct channel, where you control the experience and margins.

## Conclusion

It's not about choosing one or the other, but understanding that each channel has its purpose. But if today you depend 100% on delivery apps, you're leaving thousands of dollars on the table every year.
    `,
  },
  {
    slug: 'beneficios-codigos-qr-restaurantes',
    title: '7 beneficios de los códigos QR en restaurantes que debes conocer',
    description: 'Descubre cómo los códigos QR transforman la experiencia de tu restaurante: desde menús digitales hasta pedidos más rápidos y menos errores.',
    category: 'Tecnología',
    readTime: 5,
    date: '2026-02-05',
    author: 'MENIUS',
    content: `
## Los códigos QR llegaron para quedarse

Lo que comenzó como una solución temporal durante la pandemia se convirtió en el nuevo estándar. Los códigos QR en restaurantes ofrecen beneficios tangibles tanto para el negocio como para los clientes.

## 1. Menús siempre actualizados

Con un menú impreso, cada cambio de precio o platillo implica reimprimir. Con QR + menú digital, actualizas desde tu celular y el cambio se refleja al instante.

## 2. Reducción de errores en pedidos

Cuando el cliente ordena directamente desde su celular, eliminas el "teléfono descompuesto" entre cliente → mesero → cocina. El pedido llega exacto como lo pidió el cliente.

## 3. Aumento del ticket promedio

Los menús digitales con fotos atractivas y sugerencias de extras (queso extra, bebida, postre) aumentan el ticket promedio entre un **15% y 25%**. Las imágenes venden.

## 4. Rotación de mesas más rápida

Los clientes no esperan al mesero para pedir. Escanean, ordenan, y el pedido va directo a cocina. Esto puede reducir el tiempo promedio de mesa en **10-15 minutos**.

## 5. Datos valiosos sobre tu negocio

Con un sistema digital obtienes analytics que un menú impreso nunca te dará: platillos más vendidos, horas pico, ticket promedio, tendencias semanales.

## 6. Menú multilingüe

Si tu restaurante recibe turistas o está en una ciudad multicultural, un menú digital puede mostrarse en varios idiomas automáticamente.

## 7. Ahorro en costos de impresión

Un restaurante promedio gasta entre $500 y $2,000 al año en impresión de menús. Con QR, ese costo desaparece permanentemente.

## Cómo implementar QR en tu restaurante

1. Elige una plataforma de menú digital (como MENIUS)
2. Configura tu menú con categorías y fotos
3. Genera un QR único para cada mesa
4. Imprímelos en material resistente
5. Capacita brevemente a tu equipo
6. ¡Empieza a recibir pedidos digitales!
    `,
    title_en: '7 Benefits of QR Codes in Restaurants You Need to Know',
    description_en: 'Discover how QR codes transform your restaurant experience: from digital menus to faster orders and fewer errors.',
    category_en: 'Technology',
    content_en: `
## QR Codes Are Here to Stay

What started as a temporary solution during the pandemic has become the new standard. QR codes in restaurants offer tangible benefits for both the business and customers.

## 1. Always Up-to-Date Menus

With a printed menu, every price or dish change means reprinting. With QR + digital menu, you update from your phone and the change is reflected instantly.

## 2. Reduced Order Errors

When the customer orders directly from their phone, you eliminate the "telephone game" between customer → waiter → kitchen. The order arrives exactly as the customer placed it.

## 3. Higher Average Ticket

Digital menus with attractive photos and suggested extras (extra cheese, drink, dessert) increase the average ticket by **15% to 25%**. Images sell.

## 4. Faster Table Turnover

Customers don't wait for the waiter to order. They scan, order, and the order goes straight to the kitchen. This can reduce average table time by **10-15 minutes**.

## 5. Valuable Business Data

With a digital system you get analytics that a printed menu will never give you: best-selling dishes, peak hours, average ticket, weekly trends.

## 6. Multilingual Menu

If your restaurant receives tourists or is in a multicultural city, a digital menu can display in multiple languages automatically.

## 7. Savings on Printing Costs

An average restaurant spends between $500 and $2,000 per year on menu printing. With QR, that cost disappears permanently.

## How to Implement QR in Your Restaurant

1. Choose a digital menu platform (like MENIUS)
2. Set up your menu with categories and photos
3. Generate a unique QR for each table
4. Print them on durable material
5. Briefly train your team
6. Start receiving digital orders!
    `,
  },
  {
    slug: 'aumentar-ventas-menu-digital',
    title: 'Cómo aumentar las ventas de tu restaurante con un menú digital',
    description: '5 estrategias probadas para vender más usando tu menú digital: fotos, upselling, promociones, reviews y analytics.',
    category: 'Estrategia',
    readTime: 7,
    date: '2026-02-01',
    author: 'MENIUS',
    content: `
## Un menú digital no solo digitaliza — puede multiplicar tus ventas

Tener un menú digital es el primer paso. Optimizarlo para vender más es donde está el verdadero valor. Estas son 5 estrategias probadas.

## 1. Fotos profesionales en TODOS los productos

Los productos con foto se venden **hasta 30% más** que los que solo tienen texto. Si no tienes fotos profesionales, usa herramientas de IA para generarlas. Una foto apetitosa puede ser la diferencia entre un platillo que se vende y uno que nadie pide.

## 2. Upselling con extras y variantes

Configura extras estratégicamente:

- **Extras populares**: Queso extra ($1.50), tocino ($2.00), aguacate ($2.50)
- **Upgrades de tamaño**: "¿Grande por solo $2 más?"
- **Bebidas sugeridas**: "Añade una limonada por $3.99"

Los restaurantes que implementan extras bien estructurados ven un **aumento del 18-25%** en el ticket promedio.

## 3. Promociones y códigos de descuento

Crea códigos de descuento para:

- **Primeros pedidos**: "BIENVENIDO" — 15% de descuento
- **Días lentos**: "MARTES20" — 20% los martes
- **Temporadas**: "VERANO10" — 10% en verano

Las promociones inteligentes no solo aumentan ventas, sino que generan tráfico en días y horarios de baja demanda.

## 4. Reseñas visibles en tu menú

Las reseñas de otros clientes influyen enormemente en la decisión de compra. Un platillo con 4.8 estrellas y 50 reseñas se vende solo. Incentiva a tus clientes a dejar reseñas después de cada pedido.

## 5. Usa analytics para optimizar tu menú

Los datos te dicen exactamente qué funciona:

- **Productos más vendidos** → Ponlos al inicio de cada categoría
- **Productos que nadie pide** → Mejora la foto/descripción o retíralos
- **Horas pico** → Ajusta tu equipo y preparación
- **Ticket promedio** → Mide el impacto de tus cambios

## Bonus: La regla del 3-5-3

La estructura ideal de un menú digital para maximizar ventas:

- **3 categorías principales** visibles al inicio
- **5-8 productos por categoría** (no más)
- **3 extras/variantes** por producto relevante

Demasiadas opciones generan parálisis. Menos opciones = decisiones más rápidas = más ventas.
    `,
    title_en: 'How to Increase Your Restaurant Sales with a Digital Menu',
    description_en: '5 proven strategies to sell more using your digital menu: photos, upselling, promotions, reviews, and analytics.',
    category_en: 'Strategy',
    content_en: `
## A Digital Menu Doesn't Just Digitize — It Can Multiply Your Sales

Having a digital menu is the first step. Optimizing it to sell more is where the real value lies. Here are 5 proven strategies.

## 1. Professional Photos on ALL Products

Products with photos sell **up to 30% more** than those with just text. If you don't have professional photos, use AI tools to generate them. An appetizing photo can be the difference between a dish that sells and one nobody orders.

## 2. Upselling with Extras and Variants

Set up extras strategically:

- **Popular extras**: Extra cheese ($1.50), bacon ($2.00), avocado ($2.50)
- **Size upgrades**: "Large for only $2 more?"
- **Suggested drinks**: "Add a lemonade for $3.99"

Restaurants that implement well-structured extras see an **18-25% increase** in average ticket.

## 3. Promotions and Discount Codes

Create discount codes for:

- **First orders**: "WELCOME" — 15% off
- **Slow days**: "TUESDAY20" — 20% on Tuesdays
- **Seasons**: "SUMMER10" — 10% in summer

Smart promotions not only increase sales but also drive traffic during low-demand days and hours.

## 4. Visible Reviews on Your Menu

Other customers' reviews greatly influence purchasing decisions. A dish with 4.8 stars and 50 reviews sells itself. Encourage your customers to leave reviews after each order.

## 5. Use Analytics to Optimize Your Menu

Data tells you exactly what works:

- **Best-selling products** → Put them at the top of each category
- **Products nobody orders** → Improve the photo/description or remove them
- **Peak hours** → Adjust your team and preparation
- **Average ticket** → Measure the impact of your changes

## Bonus: The 3-5-3 Rule

The ideal structure of a digital menu to maximize sales:

- **3 main categories** visible at the top
- **5-8 products per category** (no more)
- **3 extras/variants** per relevant product

Too many options create paralysis. Fewer options = faster decisions = more sales.
    `,
  },
  {
    slug: 'fotos-comida-inteligencia-artificial',
    title: 'Fotos de comida con inteligencia artificial: Guía para restaurantes',
    description: 'Cómo usar IA para generar fotos profesionales de tus platillos sin contratar un fotógrafo. Ahorra tiempo y dinero.',
    category: 'Tecnología',
    readTime: 5,
    date: '2026-01-28',
    author: 'MENIUS',
    content: `
## El problema: Fotos profesionales son caras

Una sesión de fotos profesional para un menú de restaurante cuesta entre **$500 y $3,000 USD**. Y cada vez que agregas un platillo, necesitas otra sesión. Para restaurantes pequeños y medianos, esto no es viable.

## La solución: Inteligencia artificial

La IA generativa (como Google Gemini) puede crear fotos realistas y apetitosas de platillos en segundos. Solo necesitas describir el platillo.

## Cómo funciona

1. **Describes el platillo**: "Tacos al pastor con piña, cilantro y cebolla, servidos en tortilla de maíz, sobre un plato de barro"
2. **La IA genera la imagen**: En 5-10 segundos obtienes una foto profesional
3. **Se optimiza automáticamente**: La imagen se redimensiona y convierte a WebP para carga rápida

## Tips para mejores resultados

**Sé específico en tu descripción:**

❌ "Hamburguesa" → Resultado genérico

✅ "Hamburguesa doble con queso cheddar derretido, tocino crujiente, lechuga fresca, tomate y salsa especial, en pan brioche tostado, servida con papas fritas" → Resultado premium

**Menciona el estilo de presentación:**
- "En plato de cerámica blanca"
- "Sobre tabla de madera rústica"
- "Vista cenital, fondo oscuro"
- "Con iluminación natural suave"

## ¿Es ético usar fotos generadas con IA?

Sí, siempre que las fotos representen fielmente lo que el cliente va a recibir. La IA te ayuda a presentar tu comida de forma atractiva, no a engañar. Piensa en ello como un fotógrafo virtual que hace que tu comida se vea tan bien como realmente es.

## Cuánto puedes ahorrar

| Concepto | Fotógrafo tradicional | IA |
|---|---|---|
| Costo por sesión | $500-$3,000 | Incluido en MENIUS |
| Tiempo | 1-2 semanas | 10 segundos |
| Agregar platillos | Nueva sesión | Descripción rápida |
| Actualizar fotos | Otro costo | Sin costo |

## Conclusión

La IA no reemplaza completamente la fotografía profesional, pero democratiza el acceso a fotos de calidad para restaurantes de todos los tamaños. Ya no necesitas un gran presupuesto para tener un menú visualmente atractivo.
    `,
    title_en: 'Food Photos with Artificial Intelligence: A Guide for Restaurants',
    description_en: 'How to use AI to generate professional photos of your dishes without hiring a photographer. Save time and money.',
    category_en: 'Technology',
    content_en: `
## The Problem: Professional Photos Are Expensive

A professional photo session for a restaurant menu costs between **$500 and $3,000 USD**. And every time you add a dish, you need another session. For small and medium restaurants, this isn't viable.

## The Solution: Artificial Intelligence

Generative AI (like Google Gemini) can create realistic and appetizing dish photos in seconds. You just need to describe the dish.

## How It Works

1. **Describe the dish**: "Pastor tacos with pineapple, cilantro, and onion, served on corn tortillas, on a clay plate"
2. **AI generates the image**: In 5-10 seconds you get a professional photo
3. **Automatically optimized**: The image is resized and converted to WebP for fast loading

## Tips for Better Results

**Be specific in your description:**

❌ "Hamburger" → Generic result

✅ "Double burger with melted cheddar cheese, crispy bacon, fresh lettuce, tomato, and special sauce, on a toasted brioche bun, served with french fries" → Premium result

**Mention the presentation style:**
- "On a white ceramic plate"
- "On a rustic wooden board"
- "Overhead view, dark background"
- "With soft natural lighting"

## Is It Ethical to Use AI-Generated Photos?

Yes, as long as the photos faithfully represent what the customer will receive. AI helps you present your food attractively, not to deceive. Think of it as a virtual photographer that makes your food look as good as it really is.

## How Much You Can Save

| Concept | Traditional Photographer | AI |
|---|---|---|
| Cost per session | $500-$3,000 | Included in MENIUS |
| Time | 1-2 weeks | 10 seconds |
| Adding dishes | New session | Quick description |
| Updating photos | Another cost | No cost |

## Conclusion

AI doesn't completely replace professional photography, but it democratizes access to quality photos for restaurants of all sizes. You no longer need a big budget to have a visually appealing menu.
    `,
  },
  {
    slug: 'errores-digitalizar-restaurante',
    title: 'Los 8 errores más comunes al digitalizar tu restaurante',
    description: 'Evita estos errores frecuentes que cometen los restaurantes al implementar menús digitales, pedidos online y códigos QR.',
    category: 'Educación',
    readTime: 6,
    date: '2026-01-25',
    author: 'MENIUS',
    content: `
## Digitalizar no es solo "poner un QR en la mesa"

Muchos restaurantes se lanzan a la digitalización sin una estrategia clara. Estos son los errores más comunes (y cómo evitarlos).

## Error 1: Menú sin fotos

Un menú digital sin fotos es como una tienda online sin imágenes de producto. Las fotos son el factor #1 de conversión. Si no tienes fotos profesionales, usa IA para generarlas.

## Error 2: Demasiadas categorías y productos

Más no es mejor. Un menú con 15 categorías y 200 productos abruma al cliente. Curada tu menú: 5-8 categorías con 5-10 productos cada una es ideal.

## Error 3: No capacitar al equipo

Tu equipo necesita saber cómo funciona el sistema. Un mesero que no sabe explicar el QR genera fricción. Dedica 15 minutos a capacitar a tu equipo.

## Error 4: QR mal ubicados o de mala calidad

Un QR impreso en papel que se moja o se rompe genera frustración. Invierte en impresión de calidad y colócalos en un lugar visible y accesible en cada mesa.

## Error 5: No revisar los analytics

Si tienes un menú digital pero nunca revisas los datos, estás desperdiciando una de sus mayores ventajas. Revisa tus analytics al menos semanalmente.

## Error 6: Precios desactualizados

Nada frustra más a un cliente que ver un precio en el menú digital y otro al pagar. Actualiza los precios inmediatamente cuando cambien.

## Error 7: Ignorar las reseñas

Si tu plataforma permite reseñas, léelas y responde. Las reseñas negativas ignoradas dañan tu reputación. Las reseñas positivas sin respuesta son oportunidades perdidas.

## Error 8: Depender 100% de un solo canal

No pongas todos tus huevos en una sola canasta. Combina tu menú digital propio con presencia en apps de delivery. Diversifica tus canales de venta.

## Cómo hacerlo bien

1. Empieza simple: Menú básico con fotos y precios
2. Capacita a tu equipo antes del lanzamiento
3. Imprime QR de calidad
4. Revisa analytics semanalmente
5. Itera y mejora constantemente
    `,
    title_en: 'The 8 Most Common Mistakes When Digitizing Your Restaurant',
    description_en: 'Avoid these frequent mistakes restaurants make when implementing digital menus, online orders, and QR codes.',
    category_en: 'Education',
    content_en: `
## Digitizing Isn't Just "Putting a QR on the Table"

Many restaurants jump into digitization without a clear strategy. These are the most common mistakes (and how to avoid them).

## Mistake 1: Menu Without Photos

A digital menu without photos is like an online store without product images. Photos are the #1 conversion factor. If you don't have professional photos, use AI to generate them.

## Mistake 2: Too Many Categories and Products

More isn't better. A menu with 15 categories and 200 products overwhelms the customer. Curate your menu: 5-8 categories with 5-10 products each is ideal.

## Mistake 3: Not Training Your Team

Your team needs to know how the system works. A waiter who can't explain the QR creates friction. Spend 15 minutes training your team.

## Mistake 4: Poorly Placed or Low-Quality QR Codes

A QR printed on paper that gets wet or tears causes frustration. Invest in quality printing and place them in a visible, accessible spot on each table.

## Mistake 5: Not Checking Analytics

If you have a digital menu but never check the data, you're wasting one of its biggest advantages. Check your analytics at least weekly.

## Mistake 6: Outdated Prices

Nothing frustrates a customer more than seeing one price on the digital menu and another when paying. Update prices immediately when they change.

## Mistake 7: Ignoring Reviews

If your platform allows reviews, read them and respond. Ignored negative reviews damage your reputation. Positive reviews without a response are missed opportunities.

## Mistake 8: Depending 100% on a Single Channel

Don't put all your eggs in one basket. Combine your own digital menu with delivery app presence. Diversify your sales channels.

## How to Do It Right

1. Start simple: Basic menu with photos and prices
2. Train your team before launch
3. Print quality QR codes
4. Check analytics weekly
5. Iterate and improve constantly
    `,
  },
  {
    slug: 'reducir-costos-restaurante-tecnologia',
    title: 'Cómo reducir costos operativos en tu restaurante con tecnología',
    description: 'Descubre cómo la tecnología puede ayudarte a ahorrar en impresión, personal, errores y comisiones de delivery.',
    category: 'Estrategia',
    readTime: 6,
    date: '2026-01-20',
    author: 'MENIUS',
    content: `
## Los márgenes en restaurantes son estrechos

El margen neto promedio en restaurantes es de solo **3-9%**. Cada dólar que ahorras va directamente a tu bolsillo. La tecnología puede ayudarte a reducir costos significativamente.

## 1. Elimina costos de impresión de menús

| Concepto | Costo anual |
|---|---|
| Menús impresos (4 reimpresiones/año) | $500-$2,000 |
| Menú digital | $0 adicional |

Un menú digital se actualiza al instante sin costo de impresión.

## 2. Reduce errores en pedidos

Los errores en pedidos cuestan dinero: ingredientes desperdiciados, platillos rehechos, clientes insatisfechos. Con pedidos digitales directos, el error humano en la toma de pedido **se reduce hasta un 90%**.

Costo estimado de errores en pedidos: **$200-$800/mes** en restaurantes medianos.

## 3. Elimina comisiones de delivery

Si vendes $5,000/mes a través de apps de delivery con 25% de comisión, estás perdiendo $1,250/mes. Con un menú digital propio y sistema de pickup/delivery, ese costo baja a una **tarifa fija mensual**.

## 4. Optimiza tu equipo

Un sistema de pedidos digital no reemplaza a tu equipo, pero lo hace más eficiente:

- Meseros dedican menos tiempo tomando pedidos y más tiempo atendiendo
- Cocina recibe pedidos claros y organizados
- Cajeros procesan pagos más rápido

## 5. Toma mejores decisiones con datos

Los analytics te muestran:

- **Productos con baja rotación** que puedes eliminar (reduciendo desperdicio)
- **Horas de baja demanda** donde puedes reducir personal
- **Productos con mejor margen** que puedes promover más

## El ROI de la digitalización

Para un restaurante promedio que vende $15,000/mes:

| Ahorro | Monto mensual |
|---|---|
| Impresión de menús | $100 |
| Reducción de errores | $400 |
| Menos comisiones delivery | $1,500 |
| Mejor rotación de mesas | $750 |
| **Total ahorro mensual** | **$2,750** |
| **Costo de MENIUS Pro** | **$79** |
| **ROI mensual** | **$2,671** |

Eso es un retorno de inversión de **3,380%**.

## Conclusión

La tecnología no es un gasto, es una inversión. Y en un negocio con márgenes estrechos como un restaurante, cada optimización cuenta.
    `,
    title_en: 'How to Reduce Operating Costs in Your Restaurant with Technology',
    description_en: 'Discover how technology can help you save on printing, staff, errors, and delivery commissions.',
    category_en: 'Strategy',
    content_en: `
## Restaurant Margins Are Tight

The average net margin in restaurants is only **3-9%**. Every dollar you save goes directly to your pocket. Technology can help you reduce costs significantly.

## 1. Eliminate Menu Printing Costs

| Concept | Annual Cost |
|---|---|
| Printed menus (4 reprints/year) | $500-$2,000 |
| Digital menu | $0 additional |

A digital menu updates instantly at no printing cost.

## 2. Reduce Order Errors

Order errors cost money: wasted ingredients, remade dishes, unhappy customers. With direct digital orders, human error in order taking **is reduced by up to 90%**.

Estimated cost of order errors: **$200-$800/month** in medium-sized restaurants.

## 3. Eliminate Delivery Commissions

If you sell $5,000/month through delivery apps at 25% commission, you're losing $1,250/month. With your own digital menu and pickup/delivery system, that cost drops to a **fixed monthly fee**.

## 4. Optimize Your Team

A digital ordering system doesn't replace your team, but makes them more efficient:

- Waiters spend less time taking orders and more time serving
- Kitchen receives clear, organized orders
- Cashiers process payments faster

## 5. Make Better Decisions with Data

Analytics show you:

- **Low-rotation products** you can eliminate (reducing waste)
- **Low-demand hours** where you can reduce staff
- **Higher-margin products** you can promote more

## The ROI of Digitization

For an average restaurant selling $15,000/month:

| Savings | Monthly Amount |
|---|---|
| Menu printing | $100 |
| Error reduction | $400 |
| Less delivery commissions | $1,500 |
| Better table turnover | $750 |
| **Total monthly savings** | **$2,750** |
| **MENIUS Pro cost** | **$79** |
| **Monthly ROI** | **$2,671** |

That's a return on investment of **3,380%**.

## Conclusion

Technology isn't an expense, it's an investment. And in a business with tight margins like a restaurant, every optimization counts.
    `,
  },
  {
    slug: 'tendencias-restaurantes-2026',
    title: 'Tendencias de restaurantes en 2026: Lo que necesitas saber',
    description: 'Las 6 tendencias más importantes que están transformando la industria restaurantera este año.',
    category: 'Tendencias',
    readTime: 7,
    date: '2026-01-15',
    author: 'MENIUS',
    content: `
## La industria restaurantera evoluciona rápido

2026 trae cambios significativos en cómo operan los restaurantes y cómo los clientes esperan ser atendidos. Estas son las tendencias más importantes.

## 1. Menús digitales como estándar

Lo que hace unos años era innovador, hoy es lo esperado. Los clientes — especialmente millennials y Gen Z — prefieren escanear un QR que tocar un menú físico. Los restaurantes que aún no tienen menú digital están quedándose atrás.

## 2. Inteligencia artificial en la operación

La IA ya no es ciencia ficción en restaurantes:

- **Generación de fotos** de platillos con IA
- **Predicción de demanda** para reducir desperdicio
- **Chatbots** para atención al cliente
- **Optimización de menú** basada en datos de ventas

## 3. Pedidos directos (sin intermediarios)

Cada vez más restaurantes están migrando de apps de delivery a canales propios. La razón es simple: **márgenes**. Con un canal propio, te ahorras el 15-30% de comisión.

La tendencia no es abandonar las apps de delivery completamente, sino reducir la dependencia y construir una base de clientes directos.

## 4. Experiencia omnicanal

Los clientes esperan poder interactuar con tu restaurante por múltiples canales:

- Menú digital QR en la mesa
- Pedidos desde tu web para pickup
- Delivery desde tu enlace directo
- Notificaciones por WhatsApp
- Reseñas y feedback directo

## 5. Sostenibilidad y transparencia

Los clientes, especialmente los más jóvenes, valoran:

- Información clara sobre ingredientes y alérgenos
- Opciones vegetarianas/veganas visibles
- Reducción de papel (menús digitales vs impresos)
- Packaging eco-friendly para delivery

## 6. Pagos sin fricción

El pago debe ser invisible. Los restaurantes que ofrecen múltiples opciones de pago (efectivo, tarjeta, pagos móviles) y un proceso de checkout rápido ven mayores tasas de conversión.

## ¿Cómo prepararte?

1. **Digitaliza tu menú** si aún no lo has hecho
2. **Experimenta con IA** para fotos y contenido
3. **Construye un canal directo** de pedidos
4. **Recoge datos** y úsalos para tomar decisiones
5. **Escucha a tus clientes** a través de reseñas y feedback

Los restaurantes que adopten estas tendencias hoy estarán mejor posicionados para el futuro.
    `,
    title_en: 'Restaurant Trends in 2026: What You Need to Know',
    description_en: 'The 6 most important trends transforming the restaurant industry this year.',
    category_en: 'Trends',
    content_en: `
## The Restaurant Industry Is Evolving Fast

2026 brings significant changes in how restaurants operate and how customers expect to be served. These are the most important trends.

## 1. Digital Menus as Standard

What was innovative a few years ago is now expected. Customers — especially millennials and Gen Z — prefer scanning a QR over touching a physical menu. Restaurants that still don't have a digital menu are falling behind.

## 2. Artificial Intelligence in Operations

AI is no longer science fiction in restaurants:

- **AI-generated food photos**
- **Demand prediction** to reduce waste
- **Chatbots** for customer service
- **Menu optimization** based on sales data

## 3. Direct Orders (No Intermediaries)

More and more restaurants are migrating from delivery apps to their own channels. The reason is simple: **margins**. With your own channel, you save the 15-30% commission.

The trend isn't to completely abandon delivery apps, but to reduce dependency and build a direct customer base.

## 4. Omnichannel Experience

Customers expect to interact with your restaurant through multiple channels:

- QR digital menu at the table
- Orders from your website for pickup
- Delivery from your direct link
- WhatsApp notifications
- Reviews and direct feedback

## 5. Sustainability and Transparency

Customers, especially younger ones, value:

- Clear ingredient and allergen information
- Visible vegetarian/vegan options
- Paper reduction (digital vs printed menus)
- Eco-friendly packaging for delivery

## 6. Frictionless Payments

Payment should be invisible. Restaurants that offer multiple payment options (cash, card, mobile payments) and a quick checkout process see higher conversion rates.

## How to Prepare?

1. **Digitize your menu** if you haven't already
2. **Experiment with AI** for photos and content
3. **Build a direct ordering channel**
4. **Collect data** and use it to make decisions
5. **Listen to your customers** through reviews and feedback

Restaurants that adopt these trends today will be better positioned for the future.
    `,
  },
  {
    slug: 'configurar-pedidos-online-restaurante',
    title: 'Cómo configurar pedidos online para tu restaurante paso a paso',
    description: 'Tutorial completo para implementar pedidos online en tu restaurante: desde el menú digital hasta el primer pedido.',
    category: 'Guías',
    readTime: 8,
    date: '2026-01-10',
    author: 'MENIUS',
    content: `
## Pedidos online: La oportunidad que no puedes ignorar

Los pedidos online representan una porción creciente de los ingresos de restaurantes. Ya sea para dine-in (desde la mesa), pickup (el cliente recoge) o delivery, tener la capacidad de recibir pedidos digitalmente es esencial.

## Antes de empezar: ¿Qué necesitas?

1. **Una plataforma de menú digital** (como MENIUS)
2. **Tu menú organizado** con precios actualizados
3. **Fotos de tus productos** (propias o generadas con IA)
4. **Un dispositivo** para recibir pedidos (celular, tablet o computadora)
5. **15-30 minutos** para la configuración inicial

## Paso 1: Crea tu cuenta y restaurante

Regístrate en la plataforma (gratis, sin tarjeta de crédito) y proporciona:

- Nombre de tu restaurante
- Tu URL personalizada (ej: menius.app/tu-restaurante)
- Moneda y zona horaria

Al crear tu restaurante, se genera automáticamente un menú de ejemplo para que veas cómo funciona.

## Paso 2: Configura tus categorías

Crea las categorías de tu menú en el orden que quieras:

1. Entradas
2. Platos fuertes
3. Bebidas
4. Postres

Puedes reordenarlas, activarlas o desactivarlas en cualquier momento.

## Paso 3: Agrega tus productos

Para cada producto, configura:

- **Nombre** del platillo
- **Descripción** (breve y apetitosa)
- **Precio** base
- **Foto** (sube una o genera con IA)
- **Variantes** (tamaño, tipo de proteína, etc.)
- **Extras** (ingredientes adicionales con precio)

## Paso 4: Configura tipos de orden

Desde tu dashboard, habilita los tipos de orden que ofrecerás:

- **Dine-in**: Para clientes en tu restaurante
- **Pickup**: El cliente ordena y recoge
- **Delivery**: El cliente ordena y recibe en su dirección

## Paso 5: Configura métodos de pago

Elige cómo quieres que tus clientes paguen:

- **Efectivo**: El cliente paga al recibir
- **En línea**: Integración con Stripe para pago con tarjeta

## Paso 6: Genera tus códigos QR

En la sección de mesas de tu dashboard:

1. Crea las mesas de tu restaurante
2. Genera el QR para cada mesa
3. Descarga e imprime los QRs
4. Colócalos en cada mesa

## Paso 7: Haz una prueba

Antes de lanzar, haz una prueba completa:

1. Escanea un QR con tu celular
2. Navega el menú como lo haría un cliente
3. Agrega productos al carrito
4. Completa un pedido de prueba
5. Verifica que llegue a tu dashboard

## Paso 8: ¡Lanza!

Una vez que todo funciona correctamente:

1. Capacita a tu equipo (5-10 minutos)
2. Coloca los QR en las mesas
3. Comparte tu enlace en redes sociales
4. Empieza a recibir pedidos

## Después del lanzamiento

- Revisa tus analytics semanalmente
- Actualiza fotos y descripciones
- Crea promociones para impulsar ventas
- Responde a las reseñas de tus clientes
    `,
    title_en: 'How to Set Up Online Orders for Your Restaurant Step by Step',
    description_en: 'Complete tutorial to implement online orders in your restaurant: from the digital menu to the first order.',
    category_en: 'Guides',
    content_en: `
## Online Orders: The Opportunity You Can't Ignore

Online orders represent a growing portion of restaurant revenue. Whether for dine-in (from the table), pickup (customer picks up), or delivery, having the ability to receive digital orders is essential.

## Before You Start: What Do You Need?

1. **A digital menu platform** (like MENIUS)
2. **Your organized menu** with updated prices
3. **Photos of your products** (your own or AI-generated)
4. **A device** to receive orders (phone, tablet, or computer)
5. **15-30 minutes** for initial setup

## Step 1: Create Your Account and Restaurant

Sign up on the platform (free, no credit card) and provide:

- Your restaurant name
- Your custom URL (e.g., menius.app/your-restaurant)
- Currency and timezone

When creating your restaurant, a sample menu is automatically generated so you can see how it works.

## Step 2: Set Up Your Categories

Create your menu categories in the order you want:

1. Starters
2. Main courses
3. Drinks
4. Desserts

You can reorder, activate, or deactivate them at any time.

## Step 3: Add Your Products

For each product, configure:

- **Name** of the dish
- **Description** (brief and appetizing)
- **Base price**
- **Photo** (upload one or generate with AI)
- **Variants** (size, protein type, etc.)
- **Extras** (additional ingredients with pricing)

## Step 4: Configure Order Types

From your dashboard, enable the order types you'll offer:

- **Dine-in**: For customers in your restaurant
- **Pickup**: Customer orders and picks up
- **Delivery**: Customer orders and receives at their address

## Step 5: Configure Payment Methods

Choose how you want your customers to pay:

- **Cash**: Customer pays upon receipt
- **Online**: Stripe integration for card payments

## Step 6: Generate Your QR Codes

In the tables section of your dashboard:

1. Create your restaurant's tables
2. Generate the QR for each table
3. Download and print the QRs
4. Place them on each table

## Step 7: Run a Test

Before launching, do a complete test:

1. Scan a QR with your phone
2. Navigate the menu as a customer would
3. Add products to the cart
4. Complete a test order
5. Verify it arrives at your dashboard

## Step 8: Launch!

Once everything works correctly:

1. Train your team (5-10 minutes)
2. Place the QRs on tables
3. Share your link on social media
4. Start receiving orders

## After Launch

- Check your analytics weekly
- Update photos and descriptions
- Create promotions to boost sales
- Respond to your customers' reviews
    `,
  },
  {
    slug: 'restaurantes-abandonan-apps-delivery',
    title: 'Por qué cada vez más restaurantes están abandonando las apps de delivery',
    description: 'Análisis de por qué los restaurantes están migrando de apps de delivery a canales propios y cómo esto mejora sus márgenes.',
    category: 'Opinión',
    readTime: 6,
    date: '2026-01-05',
    author: 'MENIUS',
    content: `
## El romance con las apps de delivery está terminando

Durante años, las apps de delivery prometieron a los restaurantes un nuevo canal de ventas. Pero la realidad ha sido diferente para muchos.

## El problema: Los números no cuadran

Consideremos un pedido típico de $30:

- **Comisión de la app**: $7.50 (25%)
- **Costo de los ingredientes**: $9.00 (30%)
- **Costo operativo**: $6.00 (20%)
- **Empaque para delivery**: $1.50 (5%)
- **Ganancia neta**: $6.00 (20%)

Ahora, sin la app de delivery:
- **Ganancia neta**: $13.50 (45%)

La diferencia es de **$7.50 por pedido**. Para un restaurante que recibe 200 pedidos al mes por delivery, eso es **$1,500 de diferencia mensual**.

## No solo es el dinero

Además de las comisiones, las apps de delivery presentan otros problemas:

### 1. No eres dueño de la relación con el cliente
La app tiene los datos del cliente, no tú. No puedes enviarle ofertas, no puedes fidelizarlo, no puedes construir una relación directa.

### 2. Tu marca compite junto a otras
En la app, tu restaurante aparece junto a decenas de competidores. El cliente puede fácilmente cambiar a otro restaurante por una oferta o un tiempo de entrega menor.

### 3. Control de calidad limitado
El repartidor de la app no representa tu marca. Si la entrega es mala, el cliente lo asocia con tu restaurante, no con la app.

### 4. Dependencia peligrosa
Si la app cambia sus términos, aumenta las comisiones, o te baja en el ranking, tu negocio sufre directamente.

## La alternativa: Canales propios

Cada vez más restaurantes están adoptando una estrategia mixta:

1. **Apps de delivery** para captación de nuevos clientes
2. **Menú digital propio** para retención y márgenes

La lógica es simple:
- Adquieres un cliente nuevo por la app de delivery
- Le ofreces una experiencia excelente
- Lo incentivas a pedir directamente la próxima vez
- Tu margen mejora significativamente

## Cómo hacer la transición

1. **No abandones las apps de golpe** — Reduce gradualmente
2. **Configura tu menú digital propio** con MENIUS u otra plataforma
3. **Promociona tu canal directo** — Incluye un flyer en cada pedido de delivery
4. **Ofrece incentivos** — 10% de descuento para pedidos directos
5. **Mide resultados** — Compara márgenes de ambos canales

## Conclusión

Las apps de delivery seguirán existiendo y tienen su lugar en la estrategia de un restaurante. Pero depender exclusivamente de ellas es un error financiero. Los restaurantes más inteligentes están construyendo sus propios canales digitales para controlar su destino.
    `,
    title_en: 'Why More and More Restaurants Are Leaving Delivery Apps',
    description_en: 'Analysis of why restaurants are migrating from delivery apps to their own channels and how this improves their margins.',
    category_en: 'Opinion',
    content_en: `
## The Romance with Delivery Apps Is Ending

For years, delivery apps promised restaurants a new sales channel. But reality has been different for many.

## The Problem: The Numbers Don't Add Up

Let's consider a typical $30 order:

- **App commission**: $7.50 (25%)
- **Ingredient cost**: $9.00 (30%)
- **Operating cost**: $6.00 (20%)
- **Delivery packaging**: $1.50 (5%)
- **Net profit**: $6.00 (20%)

Now, without the delivery app:
- **Net profit**: $13.50 (45%)

The difference is **$7.50 per order**. For a restaurant receiving 200 delivery orders per month, that's a **$1,500 monthly difference**.

## It's Not Just About Money

Beyond commissions, delivery apps present other problems:

### 1. You Don't Own the Customer Relationship
The app has the customer data, not you. You can't send them offers, you can't build loyalty, you can't build a direct relationship.

### 2. Your Brand Competes Alongside Others
In the app, your restaurant appears next to dozens of competitors. The customer can easily switch to another restaurant for a deal or faster delivery time.

### 3. Limited Quality Control
The app's delivery driver doesn't represent your brand. If the delivery is poor, the customer associates it with your restaurant, not the app.

### 4. Dangerous Dependency
If the app changes its terms, increases commissions, or lowers your ranking, your business suffers directly.

## The Alternative: Your Own Channels

More and more restaurants are adopting a mixed strategy:

1. **Delivery apps** for capturing new customers
2. **Your own digital menu** for retention and margins

The logic is simple:
- Acquire a new customer through the delivery app
- Offer them an excellent experience
- Incentivize them to order directly next time
- Your margin improves significantly

## How to Make the Transition

1. **Don't abandon apps overnight** — Reduce gradually
2. **Set up your own digital menu** with MENIUS or another platform
3. **Promote your direct channel** — Include a flyer in every delivery order
4. **Offer incentives** — 10% discount for direct orders
5. **Measure results** — Compare margins from both channels

## Conclusion

Delivery apps will continue to exist and have their place in a restaurant's strategy. But depending exclusively on them is a financial mistake. The smartest restaurants are building their own digital channels to control their destiny.
    `,
  },
  {
    slug: 'asistente-ia-restaurantes-menius-ai',
    title: 'MENIUS AI: Cómo un asistente inteligente está transformando la gestión de restaurantes',
    description: 'Descubre cómo MENIUS AI, el asistente inteligente integrado en tu dashboard, te ayuda a analizar ventas, entender a tus clientes y tomar mejores decisiones para tu restaurante.',
    category: 'Tecnología',
    readTime: 7,
    date: '2026-02-16',
    author: 'MENIUS',
    content: `
## La inteligencia artificial llega al restaurante

Hasta hace poco, las herramientas de IA eran exclusivas de grandes corporaciones con presupuestos millonarios. En 2026, eso cambió. Ahora, un restaurante local puede tener su propio asistente inteligente — y eso es exactamente lo que ofrece MENIUS AI.

## ¿Qué es MENIUS AI?

MENIUS AI es un asistente inteligente integrado directamente en el dashboard de tu restaurante. No es un chatbot genérico — tiene acceso a **todos los datos de tu negocio en tiempo real**: ventas, pedidos, clientes, menú, reseñas, promociones y más.

Puedes hacerle preguntas como:

- "¿Cuánto vendí hoy?"
- "¿Cuál es mi producto más vendido esta semana?"
- "¿Tengo pedidos pendientes?"
- "¿Quién es mi mejor cliente?"
- "Sugiéreme una promoción para el fin de semana"
- "¿Cómo configuro delivery?"

## 5 formas en que MENIUS AI ayuda a tu restaurante

### 1. Análisis instantáneo de ventas

En lugar de revisar gráficas y números, simplemente pregunta: "¿Cómo van las ventas esta semana?" y MENIUS AI te da un resumen claro con comparaciones vs la semana anterior, ticket promedio, y tendencias.

### 2. Conoce a tus clientes

MENIUS AI analiza los datos de tus pedidos para identificar a tus clientes más frecuentes, sus preferencias, y cuánto gastan. Información que antes requería un CRM costoso.

### 3. Guía paso a paso del dashboard

¿No sabes cómo agregar un producto o crear un QR? Pregúntale a MENIUS AI y te explica paso a paso, como si tuvieras un tutor personalizado 24/7.

### 4. Estrategias de negocio

MENIUS AI puede sugerir promociones basadas en tus datos reales: "Tu hora más baja es de 3 a 5 PM. Podrías crear un descuento de Happy Hour para esas horas."

### 5. Disponible 24/7 sin costo adicional

A diferencia de un consultor que cobra por hora, MENIUS AI está siempre disponible y viene incluido en todos los planes sin costo extra.

## ¿Cuánto cuesta?

Nada adicional. MENIUS AI está incluido en todos los planes de MENIUS, incluyendo el plan Starter de $39/mes. Usa tecnología Google Gemini optimizada para ser eficiente y económica.

## Conclusión

La IA ya no es el futuro — es el presente. Los restaurantes que adopten herramientas inteligentes hoy tendrán una ventaja competitiva enorme. Con MENIUS AI, tienes un analista de negocio, un consultor, y un asistente técnico — todo en uno, todo gratis, todo el tiempo.
    `,
    title_en: 'MENIUS AI: How an Intelligent Assistant Is Transforming Restaurant Management',
    description_en: 'Discover how MENIUS AI, the intelligent assistant built into your dashboard, helps you analyze sales, understand your customers, and make better decisions for your restaurant.',
    category_en: 'Technology',
    content_en: `
## Artificial Intelligence Arrives at the Restaurant

Until recently, AI tools were exclusive to large corporations with million-dollar budgets. In 2026, that changed. Now, a local restaurant can have its own intelligent assistant — and that's exactly what MENIUS AI offers.

## What Is MENIUS AI?

MENIUS AI is an intelligent assistant integrated directly into your restaurant's dashboard. It's not a generic chatbot — it has access to **all your business data in real time**: sales, orders, customers, menu, reviews, promotions, and more.

You can ask questions like:

- "How much did I sell today?"
- "What's my best-selling product this week?"
- "Do I have pending orders?"
- "Who's my best customer?"
- "Suggest a weekend promotion"
- "How do I set up delivery?"

## 5 Ways MENIUS AI Helps Your Restaurant

### 1. Instant Sales Analysis

Instead of reviewing charts and numbers, simply ask: "How are sales this week?" and MENIUS AI gives you a clear summary with comparisons vs the previous week, average ticket, and trends.

### 2. Know Your Customers

MENIUS AI analyzes your order data to identify your most frequent customers, their preferences, and how much they spend. Information that used to require an expensive CRM.

### 3. Step-by-Step Dashboard Guide

Don't know how to add a product or create a QR? Ask MENIUS AI and it explains step by step, like having a personalized 24/7 tutor.

### 4. Business Strategies

MENIUS AI can suggest promotions based on your real data: "Your slowest hour is 3 to 5 PM. You could create a Happy Hour discount for those hours."

### 5. Available 24/7 at No Extra Cost

Unlike a consultant who charges by the hour, MENIUS AI is always available and comes included in all plans at no extra cost.

## How Much Does It Cost?

Nothing additional. MENIUS AI is included in all MENIUS plans, including the Starter plan at $39/month. It uses Google Gemini technology optimized to be efficient and economical.

## Conclusion

AI is no longer the future — it's the present. Restaurants that adopt intelligent tools today will have an enormous competitive advantage. With MENIUS AI, you have a business analyst, consultant, and technical assistant — all in one, all free, all the time.
    `,
  },
  {
    slug: 'google-maps-menu-digital-restaurante',
    title: 'Por qué Google Maps en tu menú digital es clave para atraer más clientes',
    description: 'Integrar Google Maps en tu menú digital ayuda a los clientes a encontrarte fácilmente y aumenta la confianza en tu restaurante. Descubre cómo MENIUS lo hace automáticamente.',
    category: 'Marketing',
    readTime: 5,
    date: '2026-02-14',
    author: 'MENIUS',
    content: `
## La ubicación importa más de lo que crees

Cuando un cliente nuevo descubre tu menú digital — ya sea por un QR, un link en redes sociales, o una recomendación — una de las primeras cosas que quiere saber es: **¿dónde están?**

Si tu menú digital no muestra tu ubicación de forma clara e interactiva, estás perdiendo clientes potenciales.

## El problema con la dirección en texto

Muchos restaurantes ponen su dirección en texto plano: "Calle 5 #123, Colonia Centro". El problema:

- El cliente tiene que copiar la dirección y pegarla en otra app
- Las direcciones escritas pueden ser confusas
- No transmiten la misma confianza que un mapa visual

## La solución: Google Maps integrado

MENIUS integra Google Maps directamente en la página pública de tu restaurante. Esto significa que:

1. **Tus clientes ven un mapa interactivo** con tu ubicación exacta
2. **Pueden obtener direcciones** con un clic
3. **Genera confianza** — un mapa de Google es sinónimo de legitimidad
4. **Funciona para delivery** — el cliente sabe exactamente qué tan lejos está

## Cómo activar Google Maps en MENIUS

Es automático. Solo necesitas:

1. Ir a **Configuración** en tu dashboard
2. Escribir tu dirección completa
3. El mapa aparece automáticamente en tu tienda pública

No necesitas configurar APIs ni código. MENIUS se encarga de todo.

## El impacto en números

Según estudios de Google:

- **76% de las personas** que buscan un negocio local lo visitan en 24 horas
- Los negocios con ubicación en Google Maps reciben **2.7x más solicitudes** de dirección
- **86% de los consumidores** buscan la ubicación de un negocio en línea antes de visitarlo

## Conclusión

Un mapa no es un detalle menor — es una herramienta de conversión. Los restaurantes que facilitan que sus clientes los encuentren, venden más. Con MENIUS, Google Maps viene integrado sin costo y sin configuración técnica.
    `,
    title_en: 'Why Google Maps in Your Digital Menu Is Key to Attracting More Customers',
    description_en: 'Integrating Google Maps into your digital menu helps customers find you easily and increases trust in your restaurant. Discover how MENIUS does it automatically.',
    category_en: 'Marketing',
    content_en: `
## Location Matters More Than You Think

When a new customer discovers your digital menu — whether through a QR, a social media link, or a recommendation — one of the first things they want to know is: **where are you?**

If your digital menu doesn't show your location in a clear, interactive way, you're losing potential customers.

## The Problem with Text Addresses

Many restaurants put their address in plain text: "123 Main Street, Downtown." The problem:

- The customer has to copy the address and paste it into another app
- Written addresses can be confusing
- They don't convey the same trust as a visual map

## The Solution: Integrated Google Maps

MENIUS integrates Google Maps directly into your restaurant's public page. This means:

1. **Your customers see an interactive map** with your exact location
2. **They can get directions** with one click
3. **It builds trust** — a Google map is synonymous with legitimacy
4. **It works for delivery** — the customer knows exactly how far away they are

## How to Activate Google Maps in MENIUS

It's automatic. You just need to:

1. Go to **Settings** in your dashboard
2. Enter your complete address
3. The map automatically appears on your public store

No need to configure APIs or code. MENIUS takes care of everything.

## The Impact in Numbers

According to Google studies:

- **76% of people** who search for a local business visit it within 24 hours
- Businesses with locations on Google Maps receive **2.7x more direction requests**
- **86% of consumers** look up a business location online before visiting

## Conclusion

A map is not a minor detail — it's a conversion tool. Restaurants that make it easy for customers to find them sell more. With MENIUS, Google Maps comes integrated at no cost and with no technical setup.
    `,
  },
  {
    slug: 'cocina-kds-pedidos-tiempo-real',
    title: 'Kitchen Display System (KDS): La pantalla que elimina errores en tu cocina',
    description: 'Un KDS muestra los pedidos en tiempo real en la cocina, elimina los tickets de papel y reduce errores. Descubre cómo funciona el KDS de MENIUS.',
    category: 'Operación',
    readTime: 6,
    date: '2026-02-12',
    author: 'MENIUS',
    content: `
## ¿Qué es un KDS (Kitchen Display System)?

Un KDS es una pantalla digital en la cocina que reemplaza los tickets de papel. Muestra los pedidos en tiempo real conforme van entrando, con todos los detalles que el equipo de cocina necesita: productos, variantes, extras, notas del cliente, y datos de contacto.

## El problema con los tickets de papel

En muchos restaurantes, el proceso es:

1. El mesero anota el pedido (a veces con letra ilegible)
2. Lleva el papel a la cocina
3. El cocinero interpreta el pedido
4. Se pierden tickets, se confunden pedidos, se olvidan extras

Resultado: **errores, comida devuelta, clientes insatisfechos y dinero perdido**.

## Cómo funciona el KDS de MENIUS

Con MENIUS, el flujo es completamente digital:

1. El cliente ordena desde su celular (escanea QR o usa el link)
2. El pedido aparece **instantáneamente** en la pantalla de cocina
3. El cocinero ve todos los detalles: productos, variantes, extras, notas especiales
4. Marca cada pedido como "preparando" → "listo"
5. El cliente recibe la actualización de estado en tiempo real

### ¿Qué muestra la pantalla KDS?

- **Número de orden** y hora del pedido
- **Nombre y teléfono del cliente** (con link directo a WhatsApp)
- **Cada producto** con cantidad, variante y extras
- **Notas especiales** (alergias, preferencias)
- **Tipo de orden**: mesa, pickup o delivery
- **Tiempo transcurrido** desde que se hizo el pedido

## Beneficios concretos

1. **Cero errores de interpretación** — La información es exacta y legible
2. **Ahorro en papel** — No más rollos de tickets
3. **Velocidad** — El pedido llega a cocina en 0 segundos
4. **Seguimiento** — Sabes exactamente en qué estado está cada pedido
5. **Contacto directo** — Si hay dudas, contactas al cliente por WhatsApp con un clic

## ¿Qué necesito para usar el KDS?

Solo una tablet o monitor en la cocina con conexión a internet. Abres la sección "Cocina" del dashboard de MENIUS y listo — los pedidos aparecen en tiempo real. No necesitas hardware especializado ni software adicional.

## Conclusión

Un KDS no es un lujo — es una necesidad operativa. Elimina errores, acelera la cocina, y mejora la experiencia del cliente. Con MENIUS, el KDS viene incluido en todos los planes y funciona desde cualquier dispositivo con navegador.
    `,
    title_en: 'Kitchen Display System (KDS): The Screen That Eliminates Errors in Your Kitchen',
    description_en: 'A KDS shows orders in real time in the kitchen, eliminates paper tickets, and reduces errors. Discover how the MENIUS KDS works.',
    category_en: 'Operations',
    content_en: `
## What Is a KDS (Kitchen Display System)?

A KDS is a digital screen in the kitchen that replaces paper tickets. It shows orders in real time as they come in, with all the details the kitchen team needs: products, variants, extras, customer notes, and contact information.

## The Problem with Paper Tickets

In many restaurants, the process is:

1. The waiter writes down the order (sometimes with illegible handwriting)
2. Takes the paper to the kitchen
3. The cook interprets the order
4. Tickets get lost, orders get mixed up, extras get forgotten

Result: **errors, returned food, unsatisfied customers, and lost money**.

## How the MENIUS KDS Works

With MENIUS, the flow is completely digital:

1. The customer orders from their phone (scans QR or uses the link)
2. The order appears **instantly** on the kitchen screen
3. The cook sees all details: products, variants, extras, special notes
4. Marks each order as "preparing" → "ready"
5. The customer receives the status update in real time

### What Does the KDS Screen Show?

- **Order number** and time of the order
- **Customer name and phone** (with direct WhatsApp link)
- **Each product** with quantity, variant, and extras
- **Special notes** (allergies, preferences)
- **Order type**: table, pickup, or delivery
- **Time elapsed** since the order was placed

## Concrete Benefits

1. **Zero interpretation errors** — Information is exact and readable
2. **Paper savings** — No more ticket rolls
3. **Speed** — The order reaches the kitchen in 0 seconds
4. **Tracking** — You know exactly what state each order is in
5. **Direct contact** — If there are questions, contact the customer via WhatsApp with one click

## What Do I Need to Use the KDS?

Just a tablet or monitor in the kitchen with internet connection. Open the "Kitchen" section in the MENIUS dashboard and you're set — orders appear in real time. No specialized hardware or additional software needed.

## Conclusion

A KDS is not a luxury — it's an operational necessity. It eliminates errors, speeds up the kitchen, and improves the customer experience. With MENIUS, the KDS is included in all plans and works from any device with a browser.
    `,
  },

  // ── Post 14: Manejar reviews negativas ──────────────────────────────────
  {
    slug: 'como-manejar-reviews-negativas-restaurante',
    title: 'Cómo responder reviews negativas en tu restaurante (y convertirlas en clientes fieles)',
    description: 'Una mala reseña no tiene que destruir tu reputación. Aprende el método profesional para responder críticas, recuperar clientes insatisfechos y mejorar tu rating.',
    category: 'Estrategia',
    readTime: 6,
    date: '2026-03-01',
    author: 'MENIUS',
    title_en: 'How to Handle Negative Reviews at Your Restaurant (and Turn Them into Loyal Customers)',
    description_en: 'A bad review doesn\'t have to destroy your reputation. Learn the professional method to respond to criticism, recover unhappy customers, and improve your rating.',
    category_en: 'Strategy',
    content: `
## La realidad de las reseñas negativas

El 97% de los consumidores lee reviews antes de elegir un restaurante. Y un restaurante con solo reseñas positivas parece falso. Lo que importa no es solo el rating — es **cómo respondes**.

Un estudio de Harvard Business School encontró que **una estrella más en Yelp aumenta los ingresos entre 5% y 9%**. Pero más revelador aún: los restaurantes que responden a reviews negativas de forma profesional mejoran su rating más rápido que los que las ignoran.

## Los 5 errores más comunes al responder críticas

**Error 1: Ponerse a la defensiva**
> "Eso no es cierto, nuestro servicio es excelente."

Esto destruye tu marca públicamente. Los lectores futuros ven que el restaurante no acepta retroalimentación.

**Error 2: No responder**
Ignorar una review negativa es como colgar el teléfono a un cliente insatisfecho. El 53% de los clientes espera respuesta en menos de 7 días.

**Error 3: Respuesta genérica copiada**
> "Gracias por tu comentario, lamentamos tu experiencia..."

Si todas tus respuestas son idénticas, parecen automáticas. Los lectores lo notan.

**Error 4: Ofrecer descuentos públicamente**
Publicar "te damos 20% en tu próxima visita" invita a que otros dejen reviews negativas esperando el mismo trato.

**Error 5: Prometer sin cumplir**
Decir "lo arreglamos" sin cambiar nada en la operación genera más reviews negativas del mismo problema.

## El método LQEA para responder reviews negativas

### L — Leer completamente
Lee la review 3 veces antes de responder. Identifica: ¿Es el servicio? ¿La comida? ¿El tiempo de espera? ¿Un empleado específico?

### Q — Quédate con los hechos
No te involucres emocionalmente. Si el cliente dice que tardaron 45 minutos, investiga si es verdad antes de responder.

### E — Empatía primero
Comienza siempre reconociendo la experiencia del cliente, aunque no estés 100% de acuerdo.

### A — Acción concreta
Menciona qué vas a hacer diferente. Sé específico. Y cumple.

## La fórmula de respuesta perfecta (en 4 pasos)

**Ejemplo de review negativa:**
> "Estuve 35 minutos esperando mi orden y cuando llegó estaba fría. El mesero ni se disculpó. 2 estrellas."

**Respuesta usando la fórmula:**

> Hola [Nombre], gracias por tomarte el tiempo de escribirnos.
>
> Tienes razón — 35 minutos de espera y una orden fría no es el estándar que queremos para nadie. Entendemos la frustración, sobre todo cuando además no recibiste una disculpa del equipo.
>
> Esta semana tuvimos una situación inusual en cocina que afectó nuestros tiempos. Ya hablamos con el equipo sobre protocolos de comunicación con los clientes cuando hay demoras.
>
> Te gustaría que nos escribas a soporte@menius.app con tu nombre para poder compensarte en tu próxima visita. Queremos tener la oportunidad de mostrarte el servicio que realmente mereces.
>
> — El equipo de [Tu Restaurante]

**Por qué funciona:**
- Llama por nombre (personalizado)
- Valida la experiencia sin ser defensivo
- Explica sin excusar
- Acción concreta ya tomada
- Mueve la compensación a privado (evita incentivar reviews negativas)
- Firma con identidad del restaurante

## Cómo usar MENIUS para monitorear y responder reviews

Desde tu dashboard de MENIUS puedes ver todas las reseñas de tus clientes en una sola pantalla. El sistema te muestra el rating promedio, el historial de comentarios y los datos de contacto del cliente para seguimiento directo.

Puedes también preguntarle a **MENIUS AI**: *"¿Cuál es mi rating promedio esta semana?"* o *"¿Qué clientes dejaron comentarios negativos este mes?"* y te responde con datos reales al instante.

## Las reviews negativas que sí debes eliminar

Algunas reviews pueden reportarse a la plataforma para eliminación:
- Spam o reviews de competencia (guarda evidencia)
- Reviews de personas que nunca visitaron el lugar
- Contenido ofensivo o discriminatorio
- Reviews de empleados actuales o ex-empleados

## Convierte críticas en sistemas de mejora

Cada review negativa es datos gratuitos de investigación de mercado. Categoriza por semana:

| Tipo de queja | Frecuencia | Acción |
|---|---|---|
| Tiempo de espera | Alta | Revisar proceso de cocina |
| Temperatura de comida | Media | Revisar protocolo de delivery |
| Actitud del personal | Baja | Sesión de capacitación |

Cuando el mismo problema aparece 3+ veces, es una señal de sistema roto, no un cliente difícil.

## Conclusión

Una review negativa bien respondida puede ser **mejor marketing que ninguna review negativa**. Demuestra que escuchas, que te importa, y que mejoras. Eso construye más confianza que un rating perfecto.

El objetivo no es el 5.0 — es ser el restaurante que mejor responde cuando algo sale mal.
    `,
    content_en: `
## The Reality of Negative Reviews

97% of consumers read reviews before choosing a restaurant. And a restaurant with only positive reviews seems fake. What matters isn't just the rating — it's **how you respond**.

A Harvard Business School study found that **one more star on Yelp increases revenue by 5% to 9%**. But even more revealing: restaurants that respond to negative reviews professionally improve their rating faster than those that ignore them.

## The 5 Most Common Mistakes When Responding to Criticism

**Mistake 1: Getting defensive**
> "That's not true, our service is excellent."

This publicly destroys your brand. Future readers see that the restaurant doesn't accept feedback.

**Mistake 2: Not responding**
Ignoring a negative review is like hanging up on a dissatisfied customer. 53% of customers expect a response within 7 days.

**Mistake 3: Copied generic response**
If all your responses are identical, they seem automated. Readers notice.

**Mistake 4: Publicly offering discounts**
Posting "we'll give you 20% on your next visit" invites others to leave negative reviews hoping for the same treatment.

**Mistake 5: Promising without following through**
Saying "we'll fix it" without changing anything in operations generates more negative reviews about the same problem.

## The HEAR Method for Responding to Negative Reviews

### H — Hear it completely
Read the review 3 times before responding. Identify: Is it the service? The food? The wait time? A specific employee?

### E — Empathy first
Always start by acknowledging the customer's experience, even if you don't 100% agree.

### A — Act on facts
Stay factual. If the customer says they waited 45 minutes, investigate if it's true before responding.

### R — Real action
Mention what you're going to do differently. Be specific. And follow through.

## The Perfect Response Formula (4 Steps)

**Example negative review:**
> "I waited 35 minutes for my order and when it arrived it was cold. The waiter didn't even apologize. 2 stars."

**Response using the formula:**

> Hi [Name], thank you for taking the time to write to us.
>
> You're right — 35 minutes of waiting and a cold order is not the standard we want for anyone. We understand the frustration, especially when you didn't receive an apology from our team.
>
> This week we had an unusual situation in the kitchen that affected our timing. We've already spoken with our team about communication protocols with customers when there are delays.
>
> We'd love for you to write us at support@menius.app with your name so we can make it up to you on your next visit. We want the chance to show you the service you truly deserve.
>
> — The [Your Restaurant] Team

## Using MENIUS to Monitor and Respond to Reviews

From your MENIUS dashboard, you can see all your customer reviews in one screen. The system shows you the average rating, comment history, and customer contact information for direct follow-up.

You can also ask **MENIUS AI**: *"What's my average rating this week?"* or *"Which customers left negative comments this month?"* and it responds with real data instantly.

## Conclusion

A well-responded negative review can be **better marketing than no negative reviews at all**. It shows you listen, you care, and you improve. That builds more trust than a perfect rating.

The goal isn't 5.0 — it's being the restaurant that responds best when something goes wrong.
    `,
  },

  // ── Post 15: Fotos con celular ────────────────────────────────────────────
  {
    slug: 'fotos-comida-celular-restaurante',
    title: 'Cómo tomar fotos de comida profesionales con tu celular (sin fotógrafo)',
    description: 'Aprende técnicas simples de fotografía gastronómica con smartphone: iluminación, ángulos, composición y edición gratuita para que tus platillos se vean irresistibles.',
    category: 'Marketing',
    readTime: 7,
    date: '2026-03-03',
    author: 'MENIUS',
    title_en: 'How to Take Professional Food Photos with Your Phone (No Photographer Needed)',
    description_en: 'Learn simple smartphone food photography techniques: lighting, angles, composition, and free editing so your dishes look irresistible.',
    category_en: 'Marketing',
    content: `
## Por qué las fotos son tu herramienta de ventas más poderosa

Los restaurantes que tienen fotos en todos sus productos venden **hasta un 30% más** que los que no las tienen. No porque la comida sea mejor — sino porque el cerebro humano toma decisiones de compra en 200 milisegundos, y una foto activa el apetito antes de que el cliente pueda pensar.

La buena noticia: un iPhone o Android moderno puede tomar fotos de restaurante que compiten con equipos de $3,000 dólares. El secreto está en técnica, no en equipo.

## El principio #1: La luz lo es todo

**Luz natural = Tus mejores fotos gratuitas**

Coloca el platillo cerca de una ventana con luz natural (no sol directo — hace sombras duras). La "hora dorada" (1 hora después del amanecer, 1 hora antes del atardecer) da una luz cálida perfecta para comida.

**Evita el flash del celular a toda costa.** El flash frontal aplana la textura de la comida, crea reflejos y hace que los colores se vean lavados.

**Si usas luz artificial:**
- Luz blanca (5000K-6500K) para comida fresca, ensaladas, sushi
- Luz cálida (2700K-3000K) para carnes, postres, cafés
- Nunca mezcles temperaturas de color diferentes (hace que la comida se vea rara)

**Truco profesional:** Un cartón blanco al lado opuesto de la ventana refleja la luz y elimina sombras duras. Cuesta $0.

## Los 4 ángulos que funcionan según el platillo

**Ángulo cenital (desde arriba, 90°)**
→ Ideal para: pizzas, bowls, platillos con muchos ingredientes visibles, mesas completas
→ El platillo muestra todo su contenido
→ Pon el teléfono exactamente paralelo al suelo para evitar distorsión

**Ángulo a 45° (diagonal)**
→ Ideal para: hamburguesas, tacos, sándwiches, postres con altura
→ Muestra tanto la parte superior como el lado
→ El más natural, similar a como lo vería una persona sentada a la mesa

**Ángulo lateral (90° del lado)**
→ Ideal para: copas de bebida, cocteles, tartas con capas, anything con altura que quieres destacar
→ Muestra la textura y capas internas

**Ángulo a 30° (ligeramente elevado)**
→ Ideal para: la mayoría de platillos en su contexto
→ Muestra el ambiente del restaurante
→ El más versátil

## Composición: La regla de los tercios

Activa la cuadrícula en tu cámara (Configuración → Cámara → Cuadrícula). Los cuatro puntos donde se cruzan las líneas son los puntos de mayor atención visual.

**Coloca el elemento principal en uno de esos 4 puntos**, no en el centro exacto. Eso crea fotos más dinámicas e interesantes.

**Elementos de composición que funcionan:**
- Props relevantes (tenedor, servilleta, hierbas frescas)
- Ingredientes del platillo alrededor (no encima)
- Un vaso de agua o bebida de fondo, ligeramente desenfocado
- La mano de alguien sosteniendo la bebida (toque humano)

## Configuración de cámara para mejores resultados

**En iPhone:** Modo Foto, toca el platillo para enfocar, desliza el sol hacia abajo para reducir exposición si está muy brillante. Para close-ups, usa 1x (no el zoom digital — pierde calidad).

**En Android:** Similar — toca para enfocar, ajusta exposición manualmente. En Samsung, prueba el modo "Pro" para control total.

**Para platillos pequeños:** Activa el modo "Macro" o acércate despacio hasta que la cámara enfoque automáticamente.

## Edición gratuita en 5 minutos

**Apps gratuitas que usan los profesionales:**

**Snapseed (Google)** — gratuita, la más potente
1. Herramientas → Ajustar imagen
2. Sube el brillo +10 a +20
3. Sube el contraste +15
4. Sube la vibración (Ambiance) +20
5. Sube la saturación +10 a +15
6. Aplica un pequeño vignette para enfocar la atención

**Lightroom Mobile (gratis sin suscripción)**
- Presets gratuitos de "food photography" (busca en Pinterest)
- Una aplicación de preset puede transformar la foto en 2 segundos

**Lo que debes evitar editar:**
- No sobresatures (la comida se ve artificial)
- No aumentes demasiado la nitidez (crea ruido)
- No uses filtros dramáticos de redes sociales

## El fondo importa más de lo que crees

Los mejores fondos para comida:
- **Madera natural oscura** — Elegante, aplica a la mayoría de cocinas
- **Mármol blanco** — Limpio, moderno, perfecto para pastelería y café
- **Pizarrón negro** — Dramático, ideal para mariscos y carnes
- **Mantel de lino** — Rústico y cálido, perfecto para comida artesanal

Puedes comprar una lámina de vinilo fotográfico (en Mercado Libre o Amazon) por $15-30 USD que simula madera o mármol. Es lo que usan los fotógrafos de comida en sesiones de $500.

## Cuándo usar IA en vez de fotografía real

Si no tienes tiempo de fotografiar todo tu menú, MENIUS incluye **generación de fotos con IA (Google Gemini)**. Describes el platillo y la IA genera una imagen profesional en segundos.

**Cuándo usar foto real:**
- Platos estrella de tu menú
- Redes sociales (autenticidad importa)
- Menú físico

**Cuándo usar IA:**
- Productos nuevos que aún no están preparados para fotog.
- Temporadas o variaciones de platillos
- Complementar tu menú sin sesión fotográfica

## El workflow completo: De platillo a menú en 10 minutos

1. Prepara el platillo (limpia el plato, garnish fresco)
2. Coloca junto a la ventana con luz natural
3. Toma 5-10 fotos desde distintos ángulos
4. Edita la mejor en Snapseed (3-5 minutos)
5. Sube directamente desde el dashboard de MENIUS

Resultado: una foto que aumenta la probabilidad de que ese platillo sea ordenado.

## Conclusión

No necesitas un fotógrafo profesional para tener un menú digital que venda. Necesitas luz natural, el ángulo correcto, y 5 minutos de edición. Con estas técnicas y el menú digital de MENIUS, tus platillos van a competir visualmente con los mejores restaurantes de tu ciudad.
    `,
    content_en: `
## Why Photos Are Your Most Powerful Sales Tool

Restaurants that have photos on all their products sell **up to 30% more** than those that don't. Not because the food is better — but because the human brain makes purchase decisions in 200 milliseconds, and a photo activates appetite before the customer can even think.

The good news: a modern iPhone or Android can take restaurant photos that compete with $3,000 equipment. The secret is technique, not gear.

## Principle #1: Light Is Everything

**Natural light = Your best free photos**

Place the dish near a window with natural light (not direct sun — it creates harsh shadows). The "golden hour" (1 hour after sunrise, 1 hour before sunset) gives a warm light perfect for food.

**Avoid your phone's flash at all costs.** The front flash flattens food texture, creates reflections, and makes colors look washed out.

## The 4 Angles That Work for Each Dish

**Overhead (90°)** → Ideal for pizzas, bowls, dishes with many visible ingredients
**45° angle** → Ideal for burgers, tacos, sandwiches, tall desserts
**Side angle (90°)** → Ideal for drinks, layered cakes, anything with height
**30° slightly elevated** → Ideal for most dishes, shows restaurant context

## Free Editing in 5 Minutes

Use **Snapseed** (free): Brightness +15, Contrast +15, Ambiance +20, Saturation +10.

## Conclusion

You don't need a professional photographer to have a digital menu that sells. You need natural light, the right angle, and 5 minutes of editing.
    `,
  },

  // ── Post 16: Checklist apertura restaurante ───────────────────────────────
  {
    slug: 'checklist-apertura-restaurante-digital',
    title: 'Checklist completo: Todo lo que necesitas para abrir tu restaurante con menú digital desde el día 1',
    description: 'La lista definitiva de 47 puntos para lanzar tu restaurante correctamente: permisos, menú digital, pagos online, marketing inicial y primeras semanas de operación.',
    category: 'Guías',
    readTime: 9,
    date: '2026-03-05',
    author: 'MENIUS',
    title_en: 'Complete Checklist: Everything You Need to Open Your Restaurant with a Digital Menu from Day 1',
    description_en: 'The definitive 47-point list to launch your restaurant correctly: permits, digital menu, online payments, initial marketing, and first weeks of operation.',
    category_en: 'Guides',
    content: `
## Por qué los primeros 90 días definen el éxito de tu restaurante

El 60% de los restaurantes que cierran en el primer año lo hacen por problemas operativos, no por mala comida. La diferencia entre los que sobreviven y los que no suele estar en la preparación digital y tecnológica desde el día 1.

Este checklist cubre todo lo que debes tener listo antes de abrir tus puertas — y las primeras semanas de operación.

---

## 📋 FASE 1: Legal y permisos (4-8 semanas antes)

- [ ] Registro de negocio / constitución de empresa
- [ ] RFC o número fiscal según tu país
- [ ] Permiso de uso de suelo para giro de alimentos
- [ ] Licencia de funcionamiento municipal
- [ ] Permiso de COFEPRIS/Secretaría de Salud (o equivalente local)
- [ ] Seguro de responsabilidad civil
- [ ] Registro de marca si planeas escalar
- [ ] Cuenta bancaria empresarial (necesaria para Stripe)
- [ ] Contrato de arrendamiento firmado

> **Truco:** Contrata a un gestor local para los permisos — cobra $200-500 USD pero te ahorra semanas de trámites.

---

## 🍽️ FASE 2: Menú y operación (2-4 semanas antes)

### Menú físico y digital
- [ ] Menú finalizado con al menos 15-30 productos para apertura
- [ ] Precios calculados con margen de al menos 60-70% sobre costo
- [ ] Categorías organizadas (máximo 6-8 para el lanzamiento)
- [ ] Recetas estandarizadas escritas (misma sazón siempre)
- [ ] Fotos de al menos los 10 productos más importantes

### Configuración MENIUS (1-2 horas)
- [ ] Cuenta creada en MENIUS (plan gratuito, sin tarjeta de crédito)
- [ ] Nombre, logo y descripción del restaurante
- [ ] Dirección completa configurada
- [ ] Horarios de operación
- [ ] Todos los productos con nombre, precio y descripción
- [ ] Al menos 10 productos con foto (real o generada por IA)
- [ ] Categorías configuradas y ordenadas
- [ ] Tipos de orden habilitados (dine-in, pickup, delivery)
- [ ] Métodos de pago (efectivo y/o Stripe)
- [ ] QR de mesas generados e impresos
- [ ] QR de prueba escaneado y pedido de prueba realizado ✓

### Inventario inicial
- [ ] Inventario inicial para primer mes calculado
- [ ] Proveedores principales identificados con plan B
- [ ] Par de proveedor para ingredientes críticos

---

## 💻 FASE 3: Tecnología y pagos (1 semana antes)

- [ ] Cuenta Stripe creada y verificada (3-5 días hábiles)
- [ ] Pagos online activados en MENIUS
- [ ] Pedido de prueba con pago real realizado
- [ ] Tablet o pantalla para KDS en cocina configurada
- [ ] Tablet o dispositivo para el dashboard del encargado
- [ ] WhatsApp Business configurado (para notificaciones de pedidos)
- [ ] Router/internet con plan de respaldo (datos móviles si falla)
- [ ] Impresora de tickets si la necesitas (opcional con KDS digital)

---

## 📣 FASE 4: Marketing de apertura (2 semanas antes)

### Presencia digital básica
- [ ] Google Business Profile creado y verificado (¡GRATIS y esencial!)
- [ ] Fotos del lugar y menú subidas a Google Maps
- [ ] Instagram creado (aunque sea básico)
- [ ] WhatsApp Business configurado con horario y respuestas automáticas
- [ ] Link del menú digital preparado para compartir

### Materiales físicos
- [ ] QR codes impresos con diseño del restaurante
- [ ] Menú digital con QR en ventana o fachada
- [ ] Tarjetas de presentación con link del menú
- [ ] Flyers para zona cercana (radio de 5 cuadras)

### Estrategia de apertura
- [ ] Lista de 50-100 personas para invitar a pre-apertura (familia, amigos, redes)
- [ ] Evento de pre-apertura o "soft opening" para probar operación
- [ ] Oferta de apertura definida (ej: 15% de descuento primera semana)
- [ ] Código de descuento creado en MENIUS para apertura
- [ ] Plan para las primeras 10 reseñas de Google (pide a tus primeros clientes)

---

## 🚀 FASE 5: Primeras semanas de operación

### Semana 1
- [ ] Revisar MENIUS AI cada mañana: "¿Cómo estuvo ayer?"
- [ ] Verificar que todos los pedidos están marcados correctamente
- [ ] Responder a cualquier review en menos de 24 horas
- [ ] Ajustar precios o productos según feedback inicial
- [ ] Verificar tiempos promedio de preparación

### Semana 2-4
- [ ] Analizar productos más vendidos (ajustar inventario)
- [ ] Identificar hora pico (ajustar staffing)
- [ ] Primer reporte de ventas: comparar con proyección inicial
- [ ] Crear primera promoción en MENIUS (promo de semana o fin de semana)
- [ ] Publicar en redes al menos 3 veces por semana (fotos de platillos)

### Mes 1
- [ ] Revisar margen real vs proyectado
- [ ] Agregar productos faltantes al menú digital
- [ ] Completar fotos de todos los productos
- [ ] Evaluar si activar delivery
- [ ] Primer análisis de clientes frecuentes en CRM de MENIUS

---

## ❌ Los errores más costosos que cometen los restaurantes nuevos

**Error #1: Abrir sin menú digital**
Los clientes buscan tu menú en Google antes de ir. Si no aparece, pierdes reservaciones.

**Error #2: No tener pagos online desde el día 1**
Configura Stripe antes de abrir. El proceso toma 3-5 días hábiles — no esperes al último momento.

**Error #3: Ignorar Google Business Profile**
El 46% de todas las búsquedas en Google son locales. Si no estás en Google Maps con fotos y reseñas, eres invisible.

**Error #4: Menú demasiado grande**
Con 60 productos es difícil mantener calidad y controlar inventario. Empieza con 20-30 platillos estrella.

**Error #5: No pedir reseñas activamente**
Las primeras 10 reseñas en Google son las más importantes para tu posicionamiento. Pídelas a los primeros clientes directamente.

---

## Herramienta gratuita: MENIUS como centro de operaciones

MENIUS reemplaza varias herramientas que los restaurantes nuevos suelen pagar por separado:

| Herramienta | Costo mensual típico | Con MENIUS |
|---|---|---|
| Sistema de pedidos online | $50-200 | Incluido |
| Menú digital con QR | $30-100 | Incluido |
| KDS de cocina | $50-150 | Incluido |
| CRM de clientes | $30-100 | Incluido |
| Analytics de ventas | $20-80 | Incluido |
| Asistente IA | $50-200 | Incluido |
| **Total** | **$230-830/mes** | **$39-149/mes** |

El plan gratuito de MENIUS es más que suficiente para tener todo tu restaurante configurado antes de abrir — sin tarjeta de crédito.

## Conclusión

Abrir un restaurante exitoso requiere preparación, no solo buena comida. Este checklist te asegura que no te falte nada el día de apertura. Guárdalo, compártelo con tu equipo, y márcalo punto por punto.

El menú digital no es opcional en 2026 — es lo primero que buscan tus clientes cuando deciden dónde comer.
    `,
    content_en: `
## Why the First 90 Days Define Your Restaurant's Success

60% of restaurants that close in the first year do so due to operational problems, not bad food. The difference between those that survive and those that don't is usually in digital and technological preparation from day one.

This checklist covers everything you need ready before opening your doors — and the first weeks of operation.

## Phase 1: Legal & Permits (4-8 weeks before)
- Business registration
- Tax ID / EIN
- Food service permit
- Health department inspection
- Business bank account (required for Stripe)

## Phase 2: Menu & Operations (2-4 weeks before)
- Finalized menu with 15-30 products for launch
- MENIUS account set up (free plan — no credit card needed)
- All products with names, prices, descriptions, photos
- QR codes printed and tested

## Phase 3: Technology & Payments (1 week before)
- Stripe account verified (3-5 business days)
- Online payments enabled in MENIUS
- KDS tablet set up in kitchen
- WiFi with mobile data backup

## Phase 4: Opening Marketing (2 weeks before)
- Google Business Profile created and verified (FREE and essential!)
- Instagram set up
- Opening promotion code created in MENIUS
- Plan for first 10 Google reviews

## The Most Costly Mistakes New Restaurants Make

1. Opening without a digital menu
2. Not having online payments ready from day 1
3. Ignoring Google Business Profile
4. Menu too large (start with 20-30 star dishes)
5. Not actively asking for reviews

## Conclusion

Opening a successful restaurant requires preparation, not just good food. This checklist ensures you don't miss anything on opening day.
    `,
  },

  // ── Post 17: Fidelizar sin apps delivery ──────────────────────────────────
  {
    slug: 'fidelizar-clientes-restaurante-sin-apps-delivery',
    title: 'Cómo fidelizar clientes de tu restaurante sin depender de apps de delivery',
    description: 'Las apps de delivery se quedan con tus clientes. Aprende estrategias concretas para construir tu propia base de clientes fieles que ordenan directamente contigo.',
    category: 'Estrategia',
    readTime: 7,
    date: '2026-03-07',
    author: 'MENIUS',
    title_en: 'How to Build Customer Loyalty at Your Restaurant Without Delivery Apps',
    description_en: 'Delivery apps keep your customers. Learn concrete strategies to build your own loyal customer base that orders directly from you.',
    category_en: 'Strategy',
    content: `
## El problema real con las apps de delivery: No son tus clientes

Cuando alguien ordena a través de Rappi, Uber Eats o DiDi Food, ese cliente es de la plataforma, no tuyo. No tienes su email, no sabes su historial, no puedes contactarlo directamente. La próxima vez que quiera pedir de nuevo, la app le mostrará a tu competencia antes que a ti.

Y encima, pagas 15-30% de comisión por ese cliente que nunca fue tuyo.

La fidelización de clientes directos — los que ordenan directo a tu restaurante — es el activo más valioso que puedes construir. Un cliente fiel vale 5-10x más que un cliente nuevo, y adquirirlo cuesta 5x menos.

## La primera barrera: Hacer que conozcan tu canal directo

### Estrategia 1: El flyer dentro de cada pedido de delivery

Cada pedido que sale a través de apps de delivery lleva un flyer dentro:

> **"¡Ordena directo y ahorra!"**
> Usa el código **DIRECTO10** en [tu enlace de menú]
> y obtén 10% de descuento en tu próxima orden.

Costo: $0.05 por flyer. ROI: Convierte clientes de apps de $7.50 comisión a clientes directos gratuitos.

### Estrategia 2: QR en mesas para clientes dine-in

Los clientes que comen en tu restaurante ya te eligieron. El QR en la mesa con tu menú digital es tu oportunidad de capturar su email para el futuro.

Configura en MENIUS un campo de email opcional al ordenar, con un incentivo: "Deja tu email y recibe tus próximas ofertas y puntos de lealtad."

### Estrategia 3: Google Maps como canal de adquisición directa

Cuando alguien te busca en Google Maps y hace clic en "Ordenar", puedes configurar que vaya directamente a tu menú de MENIUS — no a una app de delivery. Así capturas el cliente directo desde el primer contacto.

## La segunda barrera: Que vuelvan a ordenar directamente

### Estrategia 4: El programa de lealtad simple

No necesitas software complejo. Una tarjeta digital con "cada 10 pedidos directos, el siguiente con 20% de descuento" es suficiente para cambiar comportamiento.

Con el CRM de MENIUS puedes ver cuántas veces ha ordenado cada cliente e identificar a los que están en el pedido 9 para enviarles un recordatorio.

### Estrategia 5: Notificaciones de WhatsApp con descuentos exclusivos

Para los clientes que te dieron su WhatsApp (a través del checkout), puedes enviar:

- Ofertas del día (martes lentos → descuento martes)
- Preventa de platillos nuevos ("primeros 20 en ordenar")
- Cumpleaños (si tienes la fecha) con descuento personalizado

**Importante:** MENIUS te permite ver el número de teléfono de cada cliente que ha ordenado. Puedes crear un grupo de difusión (no grupo) en WhatsApp Business para estas comunicaciones. Máximo 1 mensaje por semana para no molestar.

### Estrategia 6: El "siguiente pedido" capturado en el momento

Cuando el cliente ya está comiendo (dine-in) o acaba de recibir su delivery, es el momento con mayor satisfacción. Es el mejor momento para preguntar.

Coloca un QR en la mesa o incluye un mensaje en la confirmación del pedido:

> *"¿Te gustó? Agenda tu próximo pedido con 15% de descuento si ordenas antes del [fecha 7 días después]"*

### Estrategia 7: Contenido en redes que dirige al menú directo

Cada post de Instagram de un platillo debe tener en bio el link de tu menú directo. No el link de Rappi. El tuyo.

Cuando alguien ve una foto de tus tacos a las 7pm con hambre y hace clic, quieres que llegue a **tu** carrito, no al carrito de la app que se lleva la comisión.

## Cómo usar MENIUS para ejecutar esto

### CRM integrado
Desde el dashboard, puedes ver:
- Todos tus clientes con historial de pedidos
- Frecuencia de pedidos por cliente
- Últimos pedidos y productos favoritos
- Datos de contacto

### Campañas de marketing
Crea en MENIUS códigos de descuento con expiración para:
- Clientes inactivos (no han ordenado en 30+ días)
- Clientes frecuentes (recompensa)
- Temporadas o eventos especiales

### MENIUS AI para identificar oportunidades
Pregúntale a MENIUS AI:
- *"¿Cuáles son mis clientes que no han ordenado en 30 días?"*
- *"¿Cuántos clientes han ordenado más de 3 veces?"*
- *"¿A qué hora tengo menos pedidos los martes?"* (para saber cuándo ofrecer descuentos)

## El cálculo financiero de fidelizar vs adquirir

| Acción | Costo | Resultado |
|---|---|---|
| Cliente nuevo vía Rappi | 25% comisión = $5-15 por pedido | Cliente de la app, no tuyo |
| Convertir a cliente directo | $0.50 flyer + 10% descuento | Cliente tuyo, 0% comisión futura |
| Retener cliente fiel | Email o WhatsApp = $0 | 5-10x más pedidos a largo plazo |

Un cliente que ordena 2 veces al mes durante 1 año, con ticket de $300 pesos, vale $7,200 pesos anuales. Pero solo si ordena directo — si ordena por app, tú recibes $5,400 y la app $1,800.

## La transición gradual: No abandones las apps de un golpe

Las apps de delivery siguen siendo útiles para **adquisición de nuevos clientes**. El error es quedarte ahí.

El modelo que funciona:
1. **Usa las apps para que te descubran**
2. **Incluye siempre tu canal directo en cada pedido** (flyer, sticker, mensaje)
3. **Ofrece incentivo para pasar al canal directo** (descuento, puntos, servicio mejor)
4. **Mantén la experiencia directa superior** (respuesta más rápida, mayor personalización)

Con el tiempo, el mix ideal es 70-80% pedidos directos, 20-30% apps de delivery para nuevos clientes.

## Conclusión

Fidelizar clientes no es complicado — es constante. Un flyer en cada pedido, un QR en cada mesa, un mensaje de WhatsApp al mes. Esas acciones pequeñas, repetidas consistentemente, construyen una base de clientes directos que nadie te puede quitar.

Las apps de delivery son un canal de adquisición, no tu canal principal. Tu menú digital directo es tu activo más valioso.
    `,
    content_en: `
## The Real Problem with Delivery Apps: They're Not Your Customers

When someone orders through Rappi, Uber Eats, or DoorDash, that customer belongs to the platform, not you. You don't have their email, you don't know their history, you can't contact them directly.

And on top of that, you pay 15-30% commission for a customer that was never yours.

## Key Strategies to Build Direct Customer Loyalty

### Strategy 1: Flyer Inside Every Delivery Order
Include a flyer with a discount code for ordering directly next time. Cost: $0.05. ROI: Converts a $7.50 commission customer to a free direct customer.

### Strategy 2: QR at Tables for Dine-In Customers
Customers eating at your restaurant already chose you. Capture their email for future marketing through the QR-linked digital menu.

### Strategy 3: Google Maps → Direct to Your Menu
Configure Google Maps to link directly to your MENIUS menu, not a delivery app.

### Strategy 4: Simple Loyalty Program
Every 10 direct orders = 20% off the next one. Track this using MENIUS CRM.

### Strategy 5: WhatsApp Promotions
Send exclusive deals to customers who gave their phone number. Max 1 message/week.

## The Financial Math

A customer ordering 2x/month with a $30 average ticket is worth $720/year to you.
- Via delivery app: you receive $540, app receives $180
- Direct orders: you receive $720

## The Gradual Transition

1. Use apps to get discovered
2. Always include your direct channel in every order (flyer, sticker)
3. Offer incentive to switch to direct channel
4. Keep the direct experience superior

Target: 70-80% direct orders, 20-30% apps for new customer acquisition.
    `,
  },
  {
    slug: 'marketing-hub-automatizaciones-restaurante',
    title: 'Marketing Hub: Cómo automatizar el marketing de tu restaurante sin ser experto',
    description: 'Descubre cómo usar campañas de email, SMS, generador de posts con IA y las 9 automatizaciones preconfiguradas de MENIUS para atraer y retener clientes en piloto automático.',
    category: 'Marketing',
    readTime: 7,
    date: '2026-03-08',
    author: 'MENIUS',
    title_en: 'Marketing Hub: How to Automate Your Restaurant Marketing Without Being an Expert',
    description_en: 'Discover how to use email campaigns, SMS, AI post generator, and the 9 pre-built automations in MENIUS to attract and retain customers on autopilot.',
    category_en: 'Marketing',
    content: `
## El problema del marketing en restaurantes

La mayoría de los dueños de restaurantes saben que deberían hacer marketing. Pero entre abrir, cerrar, manejar el equipo y gestionar pedidos, el marketing siempre queda para "después".

El resultado: clientes que vienen una vez y nunca regresan. Sin seguimiento. Sin fidelización. Sin recuperación de clientes perdidos.

La buena noticia: con las herramientas correctas, el marketing puede funcionar **solo**.

## ¿Qué es el Marketing Hub de MENIUS?

El Marketing Hub es un panel centralizado dentro de tu dashboard de MENIUS que agrupa todas las herramientas de comunicación con tus clientes en un solo lugar. Cuatro módulos principales:

1. **Campañas de Email** — Newsletters y promociones
2. **Redes Sociales** — Generador de posts con IA
3. **Campañas SMS** — Mensajes directos al celular
4. **Automatizaciones** — Secuencias que trabajan solas

## Módulo 1: Campañas de Email

El email marketing tiene el ROI más alto de cualquier canal digital: **$42 por cada $1 invertido** (según Litmus, 2024).

### ¿Qué puedes enviar?
- Newsletter semanal con platillos nuevos o especiales del día
- Promoción de temporada (verano, navidad, día de la madre)
- Anuncio de nuevo horario o nueva sucursal
- Cupón de cumpleaños personalizado

### Cómo funciona en MENIUS

1. Ve a **Marketing > Campañas de Email** en tu dashboard
2. Elige a quién enviar: todos los clientes, o segmentos (frecuentes, VIP, nuevos)
3. Escribe el asunto y el contenido
4. Elige la fecha y hora de envío
5. Revisa las estadísticas: aperturas, clics, conversiones

> **Tip profesional:** Los emails con nombre del cliente en el asunto tienen un 26% más de tasa de apertura. MENIUS personaliza automáticamente el saludo.

## Módulo 2: Generador de Posts con IA para Redes Sociales

Publicar en Instagram, Facebook y TikTok de forma consistente es difícil. Con el generador de MENIUS AI, en 10 segundos tienes un caption optimizado listo para publicar.

### Cómo usarlo

1. Ve a **Marketing > Redes Sociales**
2. Elige la plataforma (Instagram, Facebook, TikTok)
3. Describe qué quieres promocionar: "Lunes de hamburguesas a mitad de precio"
4. La IA genera el caption con emojis, hashtags y call-to-action
5. Copia y publica

### Ejemplos de lo que genera

**Instagram:**
*"🍔 ¡Lunes de burguer! Hoy y solo hoy: todas nuestras hamburguesas a mitad de precio. Ordena desde tu celular 👇 [enlace] #restaurante #oferta #hamburguesas"*

**TikTok:**
*"¿Quién más necesita una hamburguesa los lunes? 🤤 Tenemos la oferta que buscabas... link en bio 🔗"*

## Módulo 3: Campañas SMS

El SMS tiene la tasa de apertura más alta de cualquier canal: **98%** en los primeros 3 minutos.

### Cuándo usar SMS (no email)
- Promoción de solo 24 horas ("Happy hour hoy de 5-7pm")
- Último aviso de oferta que termina hoy
- Cierre por emergencia o cambio de horario
- Evento especial esta noche

### Cómo funciona
Requiere conectar tu cuenta de Twilio desde **Configuración > Integraciones**. Una vez conectado, puedes enviar mensajes a toda tu base de clientes o a segmentos específicos.

> **Importante:** Incluye siempre la opción de darse de baja. MENIUS agrega automáticamente "Responde STOP para no recibir mensajes" al final de cada SMS.

## Módulo 4: Las 9 Automatizaciones (el verdadero oro)

Aquí es donde la magia ocurre. Las automatizaciones son secuencias de emails que se activan solas según el comportamiento del cliente. **Configúralas una vez y funcionan para siempre.**

### Las 9 automatizaciones disponibles en MENIUS

| # | Nombre | Trigger | Objetivo |
|---|---|---|---|
| 1 | Bienvenida | Cliente hace primer pedido | Presentar el restaurante, pedir reseña |
| 2 | Segundo pedido | 3 días sin volver | Invitar a regresar con oferta |
| 3 | Reactivación | 30 días sin pedido | Recuperar cliente perdido |
| 4 | Reconocimiento VIP | Cliente supera X pedidos | Fidelizar y hacer sentir especial |
| 5 | Recordatorio trial | 7 días antes de vencer | Solo para ti como dueño del restaurante |
| 6 | Cumpleaños | Día del cumpleaños del cliente | Cupón especial |
| 7 | Encuesta post-pedido | 2 horas después de entregar | Obtener reseña en Google |
| 8 | Carrito abandonado | Cliente no completó checkout | Recuperar venta perdida |
| 9 | Cliente frecuente | Cada 10 pedidos | Recompensar lealtad |

### Cómo activarlas

1. Ve a **Marketing > Automatizaciones**
2. Haz clic en la automatización que quieres activar
3. Revisa el mensaje predeterminado (puedes personalizarlo)
4. Activa el toggle
5. Listo — trabaja sola

## Resultados reales

Los restaurantes que usan automatizaciones reportan:
- **+23% de retención de clientes** en los primeros 3 meses
- **+18% de ticket promedio** por upsell en emails de seguimiento
- **-40% de tiempo** dedicado a marketing manual

## Plan de acción: tu semana 1 con Marketing Hub

**Día 1:** Activa las 3 automatizaciones más importantes: Bienvenida, Reactivación y VIP.

**Día 2:** Crea tu primer post con el generador de IA y publícalo en Instagram.

**Día 3:** Diseña tu primera campaña de email con la promoción de la semana.

**Día 5:** Revisa las métricas: aperturas, clics, conversiones.

**Semana 2 en adelante:** Las automatizaciones ya trabajan solas. Solo ajusta y optimiza.

## Conclusión

El marketing efectivo no requiere ser experto en publicidad ni invertir horas cada semana. Con el Marketing Hub de MENIUS, puedes tener un sistema completo de comunicación con tus clientes funcionando en menos de un día.

La diferencia entre los restaurantes que crecen y los que no, muchas veces está en una cosa: **seguimiento**. Los clientes que sienten que los recuerdas, regresan.
    `,
    content_en: `
## The Marketing Problem in Restaurants

Most restaurant owners know they should be doing marketing. But between opening, closing, managing the team, and handling orders, marketing always gets pushed to "later."

The result: customers who come once and never return. No follow-up. No loyalty. No win-back.

The good news: with the right tools, marketing can work **on its own**.

## What is the MENIUS Marketing Hub?

The Marketing Hub is a centralized panel inside your MENIUS dashboard that brings all customer communication tools into one place. Four main modules:

1. **Email Campaigns** — Newsletters and promotions
2. **Social Media** — AI post generator
3. **SMS Campaigns** — Direct messages to phones
4. **Automations** — Sequences that run themselves

## Module 1: Email Campaigns

Email marketing has the highest ROI of any digital channel: **$42 for every $1 spent** (Litmus, 2024).

### What can you send?
- Weekly newsletter with new dishes or daily specials
- Seasonal promotions (summer, holidays, Mother's Day)
- New hours or new location announcement
- Personalized birthday coupon

## Module 2: AI Social Media Post Generator

Posting consistently on Instagram, Facebook, and TikTok is hard. With MENIUS AI's generator, in 10 seconds you have an optimized caption ready to publish.

## Module 3: SMS Campaigns

SMS has the highest open rate of any channel: **98% within the first 3 minutes**.

## Module 4: The 9 Automations (the real gold)

Automations are email sequences that trigger automatically based on customer behavior. **Set them up once and they work forever.**

The 9 available automations: Welcome, Second visit nudge, Reactivation (30-day lapse), VIP recognition, Trial reminder, Birthday coupon, Post-order survey, Abandoned cart, and Frequent customer reward.

Restaurants using automations report:
- **+23% customer retention** in the first 3 months
- **+18% higher average ticket** through email upsells
- **-40% less time** spent on manual marketing
    `,
  },
  {
    slug: 'programa-lealtad-puntos-restaurante',
    title: 'Cómo crear un programa de lealtad para tu restaurante (sin tarjetas físicas)',
    description: 'Un programa de puntos bien diseñado puede aumentar la frecuencia de visita hasta un 30%. Aprende cómo configurarlo en minutos con MENIUS y por qué es más efectivo que los descuentos.',
    category: 'Estrategia',
    readTime: 6,
    date: '2026-03-10',
    author: 'MENIUS',
    title_en: 'How to Create a Loyalty Program for Your Restaurant (Without Physical Cards)',
    description_en: 'A well-designed points program can increase visit frequency by up to 30%. Learn how to set it up in minutes with MENIUS and why it\'s more effective than discounts.',
    category_en: 'Strategy',
    content: `
## ¿Por qué los programas de lealtad funcionan?

Retener a un cliente existente cuesta **5 veces menos** que adquirir uno nuevo. Y un cliente fiel gasta en promedio **67% más** que uno nuevo.

Sin embargo, la mayoría de los restaurantes solo compiten por precio con descuentos. El problema: los descuentos enseñan a los clientes a esperar promociones. La lealtad enseña a los clientes a volver porque les gusta tu restaurante.

Un programa de puntos bien diseñado logra algo diferente: **convierte visitas en hábito**.

## ¿Qué es el Módulo de Lealtad de MENIUS?

Es un sistema de puntos por compra que puedes configurar directamente desde tu dashboard. Sin tarjetas físicas, sin apps separadas, sin complicaciones.

### Cómo funciona

1. El cliente hace un pedido por $200 pesos
2. Si configuraste 1 punto por cada $10, gana 20 puntos
3. Al acumular 100 puntos, puede canjear un beneficio (tú defines cuál)
4. El cliente ve sus puntos en su perfil

### Lo que tú configuras
- **Puntos por peso/dólar gastado** — Ej: 1 punto cada $10
- **Puntos mínimos para canjear** — Ej: 100 puntos = $50 de descuento
- **Ajuste manual de puntos** — Para corregir errores o dar bonos especiales

## Por qué los puntos son mejores que los descuentos

| Descuentos | Puntos de Lealtad |
|---|---|
| Reducen margen hoy | No afectan el margen de la visita actual |
| Atraen cazadores de ofertas | Atraen clientes fieles |
| No construyen hábito | Construyen razón para regresar |
| Cualquier competidor puede igualar | Es tu programa, tu beneficio |
| El cliente se va cuando termina la oferta | El cliente regresa por sus puntos |

## Configuración paso a paso

### Paso 1: Accede al módulo
Ve a tu dashboard > **Lealtad** en el menú lateral.

*Nota: Si ves un mensaje de migración pendiente, deberás aplicar el SQL de migration-loyalty.sql en tu base de datos Supabase antes de continuar.*

### Paso 2: Define la tasa de puntos
Ejemplo recomendado para un restaurante con ticket promedio de $150:
- 1 punto por cada $10 gastados
- Ticket de $150 = 15 puntos por visita
- Meta: 100 puntos = 10 visitas para poder canjear

Esto crea el ciclo perfecto: el cliente necesita volver ~10 veces para obtener un beneficio.

### Paso 3: Define el beneficio
¿Qué recibe el cliente al canjear?
- Descuento en su próxima orden ($50 en tu próxima compra)
- Producto gratis (postre, bebida)
- Acceso a menú VIP o precio especial

> **Tip:** El beneficio no necesita ser costoso para ser valorado. Los clientes valoran el reconocimiento más que el valor monetario.

### Paso 4: Comunícalo
Una vez configurado:
1. Menciona el programa en tu menú digital
2. El equipo de Counter lo menciona al momento de la entrega
3. Usa el Marketing Hub para enviar un email anunciando el programa
4. Crea un post en Instagram con el generador de IA de MENIUS

## Gestión de clientes y puntos

Desde la sección **Lealtad** en tu dashboard puedes:
- Ver todos los clientes con su saldo de puntos
- Buscar un cliente específico por nombre o email
- Ajustar puntos manualmente (+/-)
- Ver el historial de transacciones de cada cliente

Esta flexibilidad es importante para casos reales: cliente que tuvo un problema con su pedido, cliente fiel que quieres reconocer, evento especial donde das puntos dobles.

## Combinando lealtad con automatizaciones

El verdadero poder está en combinar el módulo de Lealtad con las Automatizaciones del Marketing Hub:

1. **Automatización VIP:** Cuando un cliente llega a 500 puntos, envíale un email especial reconociéndolo como VIP
2. **Automatización Reactivación:** Si un cliente con muchos puntos no ha pedido en 30 días, recuérdale que tiene puntos por usar
3. **Email mensual:** Envía a cada cliente su saldo actual de puntos ("Tienes 85 puntos — ¡casi llegas!")

## Resultados esperados

Los programas de lealtad bien implementados reportan:
- **Aumento del 30% en frecuencia de visita** (Harvard Business Review)
- **Clientes del programa gastan 12-18% más** por visita que clientes sin programa
- **Reducción del 20% en tasa de abandono** de clientes frecuentes

## El error más común

El mayor error al lanzar un programa de lealtad: no comunicarlo. Configuras el sistema pero no se lo dices a tus clientes.

Solución simple:
1. Email de lanzamiento a toda tu base de clientes
2. Mención en el menú digital ("¡Acumula puntos con cada pedido!")
3. El equipo lo menciona verbalmente al entregar órdenes

El programa trabaja solo — pero primero tienes que conseguir que el cliente se entere.
    `,
    content_en: `
## Why Loyalty Programs Work

Retaining an existing customer costs **5x less** than acquiring a new one. And a loyal customer spends on average **67% more** than a new one.

Points programs achieve something different from discounts: they **turn visits into habit**.

## What is the MENIUS Loyalty Module?

A points-per-purchase system you configure directly from your dashboard. No physical cards, no separate apps, no complications.

### What you configure
- **Points per dollar spent** — e.g., 1 point per $1
- **Minimum points to redeem** — e.g., 100 points = $5 discount
- **Manual point adjustment** — For corrections or special bonuses

## Why Points Beat Discounts

Discounts attract deal-hunters who leave when the offer ends. Points attract loyal customers who return to use their accumulated rewards — building habit and emotional connection with your restaurant.

## Setup in 4 Steps

1. Go to your dashboard > **Loyalty** in the sidebar
2. Set your points rate (e.g., 1 point per $10 spent)
3. Define the redemption benefit (discount, free item, VIP access)
4. Announce it: email to customers + social media post with MENIUS AI generator

## Expected Results

- **30% increase in visit frequency** (Harvard Business Review)
- **Loyalty members spend 12-18% more** per visit than non-members
- **20% reduction in churn** among frequent customers
    `,
  },
  {
    slug: 'counter-pos-pedidos-manuales-restaurante',
    title: 'Counter MENIUS: el punto de venta que necesita tu restaurante (sin hardware costoso)',
    description: 'Descubre cómo el Counter de MENIUS funciona como un POS completo para pedidos presenciales, llamadas telefónicas y control de flujo entre caja y cocina. Sin tablets especiales, sin software adicional.',
    category: 'Operación',
    readTime: 5,
    date: '2026-03-12',
    author: 'MENIUS',
    title_en: 'MENIUS Counter: The Point of Sale Your Restaurant Needs (Without Expensive Hardware)',
    description_en: 'Discover how the MENIUS Counter works as a full POS for in-person orders, phone calls, and flow control between cashier and kitchen — no special tablets, no additional software.',
    category_en: 'Operations',
    content: `
## El problema del flujo de pedidos en restaurantes

En muchos restaurantes, el proceso es así:
1. El cliente hace un pedido por QR
2. El pedido llega directo a cocina
3. La caja no sabe qué pasó
4. El cliente paga pero cocina ya hizo el plato equivocado
5. Caos

O peor: el cliente llama por teléfono, alguien anota en papel, ese papel se pierde, el pedido no llega a cocina.

El Counter de MENIUS resuelve ambos problemas.

## ¿Qué es el Counter?

El Counter es una pantalla dedicada para el equipo de caja o atención al cliente. Accedes desde tu dashboard en la sección **Counter**.

Está diseñado para funcionar en una tablet, iPad o cualquier pantalla que tengas en tu mostrador. No necesitas hardware especializado.

## Flujo correcto: Counter primero, cocina después

En MENIUS, el flujo de pedidos funciona así:

> Cliente hace pedido → Counter lo recibe → Counter lo acepta → Cocina lo recibe en KDS

El Counter es el punto de control. El equipo de atención decide qué llega a cocina y cuándo. Esto evita:
- Que cocina prepare pedidos aún no confirmados
- Que pedidos con error lleguen a cocina
- Confusión entre pedidos online y pedidos en persona

### Acciones desde el Counter

Al recibir un pedido, el equipo puede:
- **Aceptar** → El pedido avanza a cocina (KDS)
- **Cambiar estado** → Preparando, Listo, Entregado
- **Imprimir ticket** → Automáticamente al aceptar (si tienes impresora)
- **Ver detalles** → Productos, notas, datos del cliente
- **Contactar al cliente** → WhatsApp directo

## Nueva Orden Manual: tu POS integrado

Esta es la función más poderosa del Counter: crear pedidos desde cero, sin que el cliente pase por el menú digital.

### ¿Cuándo usas órdenes manuales?

1. **Pedido por teléfono** — El cliente llama y dicta su pedido
2. **Pedido en persona** — El cliente está en el mostrador
3. **Pedido de empleado** — Un miembro del equipo quiere ordenar
4. **Corrección de pedido** — Recrear un pedido con error

### Cómo crear una orden manual

1. En el Counter, haz clic en **"Nueva Orden"**
2. Se abre el panel de POS
3. **Busca productos** — escribe el nombre o desplázate por el catálogo
4. **Ajusta cantidades** con los botones + y −
5. Define el **tipo de orden**: dine-in, pickup o delivery
6. Agrega **nombre del cliente**, teléfono y notas opcionales
7. Haz clic en **"Crear Orden"**

El pedido aparece en el tablero del Counter y en el KDS de cocina exactamente igual que si lo hubiera hecho el cliente desde su celular.

### Ventajas vs. anotar en papel

| Papel | Orden Manual MENIUS |
|---|---|
| Puede perderse | Queda registrado digitalmente |
| Cocina no lo ve en tiempo real | Aparece en KDS al instante |
| No hay historial | Queda en tu dashboard para analytics |
| Sin total calculado | Calcula el total automáticamente |
| No cuenta en reportes | Suma a tus ventas del día |

## Integración con KDS de Cocina

El Kitchen Display System (KDS) es la pantalla de cocina. Muestra todos los pedidos que han sido aceptados por el Counter.

La pantalla muestra:
- Número de pedido y mesa/tipo
- Lista de productos con variantes y extras
- Notas del cliente
- Tiempo transcurrido desde que llegó el pedido

El equipo de cocina marca los pedidos como **Preparando** y luego **Listo**. El Counter recibe la notificación y puede informar al cliente.

## Impresión automática de tickets

Si tienes una impresora térmica conectada, MENIUS puede imprimir automáticamente el ticket al aceptar un pedido.

Para activarlo:
1. Ve al Counter
2. Haz clic en el ícono de configuración (⚙️)
3. Activa **"Auto-imprimir al aceptar"**

La impresión usa el sistema de impresión del navegador, compatible con cualquier impresora térmica que tengas configurada en tu red local.

## El Counter en la práctica: un día típico

**8:00 am** — El equipo abre el Counter en la tablet del mostrador.

**8:15 am** — Llega el primer pedido online. El Counter lo muestra con sonido de alerta. El cajero lo revisa y lo acepta. Cocina lo recibe en KDS.

**9:30 am** — Un cliente llama pidiendo 2 tacos y un café. El cajero abre "Nueva Orden", selecciona los productos, escribe el nombre y crea el pedido. Cocina lo recibe igual que cualquier otro pedido.

**1:00 pm** — Hora pico: 8 pedidos simultáneos. El Counter los muestra todos ordenados por tiempo. El equipo los gestiona sin papel ni confusión.

**6:00 pm** — Cierre. Los reportes del día muestran todas las ventas: digitales y manuales, con totales correctos.

## Conclusión

El Counter no es solo una pantalla de gestión de pedidos. Es el sistema nervioso central de tu operación: recibe, filtra, envía a cocina y registra todo.

Con órdenes manuales, ningún pedido se pierde. Con el flujo Counter → KDS, cocina siempre trabaja con información actualizada. Con la impresión automática, el proceso es más rápido y profesional.

Todo sin hardware adicional, sin software separado, sin capacitación complicada. Solo tu computadora o tablet, y MENIUS.
    `,
    content_en: `
## The Order Flow Problem in Restaurants

In many restaurants, phone orders get written on paper, that paper gets lost, and the order never reaches the kitchen. Or online orders go directly to the kitchen bypassing the cashier, causing payment confusion.

The MENIUS Counter solves both problems.

## What is the Counter?

A dedicated screen for your cashier or front-of-house team. Runs on any tablet, iPad, or screen you already have — no specialized hardware needed.

## The Correct Flow: Counter First, Kitchen Second

> Customer places order → Counter receives it → Counter accepts it → Kitchen receives it on KDS

The Counter is the control point. The team decides what reaches the kitchen and when.

## New Manual Order: Your Integrated POS

Create orders from scratch without the customer using the digital menu:
- **Phone orders** — Customer calls and dictates their order
- **Walk-in orders** — Customer is at the counter
- **Staff orders** — Team member wants to order

### How to create a manual order
1. Click **"New Order"** in the Counter
2. Search products by name or browse the catalog
3. Adjust quantities with + and − buttons
4. Set the order type: dine-in, pickup, or delivery
5. Add customer name, phone, and notes
6. Click **"Create Order"**

The order appears in the Counter board and on the kitchen KDS exactly like a digital order — and it counts in your daily sales analytics.

## Conclusion

The Counter is the central nervous system of your operation: it receives, filters, sends to kitchen, and records everything. With manual orders, no order gets lost. With auto-print, the process is faster and more professional.
    `,
  },
  {
    slug: 'pagos-con-wompi-bancolombia-restaurante',
    title: 'Cómo recibir pagos con Wompi (Bancolombia) en tu restaurante',
    description: 'Guía completa para activar pagos con Wompi en MENIUS: tarjetas, PSE, Nequi y Daviplata para restaurantes en Colombia con pesos colombianos (COP).',
    category: 'Pagos',
    readTime: 5,
    date: '2026-03-19',
    author: 'MENIUS',
    content: `
## ¿Qué es Wompi y por qué usarlo en tu restaurante?

Wompi es la pasarela de pagos de **Bancolombia**, el banco más grande de Colombia. Es la opción más popular para cobrar pagos digitales en pesos colombianos (COP) porque:

- **Sin tarjeta internacional** — tus clientes pueden pagar por PSE con su cuenta bancaria colombiana
- **Nequi y Daviplata** — las billeteras digitales más usadas en Colombia
- **Tarjetas nacionales** — Visa, Mastercard, Amex emitidas en Colombia
- **Efecty** — para clientes que prefieren pago en efectivo

Si tu restaurante opera en Colombia, Wompi es el método de pago que más convierte porque tus clientes no necesitan tarjeta de crédito.

## MENIUS + Wompi: activación automática

MENIUS detecta automáticamente la moneda de tu restaurante. Si usas **COP (pesos colombianos)**, el botón de pago en línea de tu menú usará Wompi automáticamente — no necesitas cambiar nada en el código.

Al hacer clic en "Pagar con Wompi", el cliente es redirigido al checkout seguro de Wompi donde selecciona su método de pago preferido.

## Paso 1: Crear tu cuenta en Wompi

1. Ve a **[comercios.wompi.co](https://comercios.wompi.co/)**
2. Regístrate con el correo de tu negocio
3. Completa la información de tu empresa o negocio
4. Espera la aprobación de Wompi (puede tardar 1-3 días hábiles)

> 💡 **Modo Sandbox disponible** — mientras esperas la aprobación, puedes hacer pruebas de pago con las llaves de sandbox (prefijo \`pub_test_\`).

## Paso 2: Obtener tus llaves

En el dashboard de Wompi → **Desarrollo → Programadores**, encontrarás:

| Llave | Dónde usarla |
|---|---|
| **Llave pública** (\`pub_test_...\` o \`pub_prod_...\`) | Variable \`WOMPI_PUBLIC_KEY\` en Vercel |
| **Secreto de Integridad** | Variable \`WOMPI_INTEGRITY_SECRET\` en Vercel |
| **Secreto de Eventos** | Variable \`WOMPI_EVENTS_SECRET\` en Vercel |

## Paso 3: Configurar las variables en MENIUS

1. Inicia sesión en **vercel.com** → tu proyecto MENIUS
2. Ve a **Settings → Environment Variables**
3. Agrega las 3 variables con sus valores
4. Haz **Redeploy** para aplicar los cambios

## Paso 4: Configurar el webhook

En el campo **"URL de Eventos"** en el dashboard de Wompi (Programadores), ingresa:

\`\`\`
https://tudominio.menius.app/api/payments/wompi-webhook
\`\`\`

Esto permite que MENIUS marque automáticamente los pedidos como pagados cuando Wompi confirma la transacción.

## Modo prueba vs. producción

- **Sandbox**: usa llaves con prefijo \`pub_test_\` — los pagos son simulados, no se cobra dinero real
- **Producción**: usa llaves con prefijo \`pub_prod_\` — cuando Wompi aprueba tu cuenta

Para probar en sandbox, Wompi tiene [tarjetas de prueba oficiales](https://docs.wompi.co/docs/colombia/tarjetas-de-prueba/) que puedes usar en el checkout.

## ¿Wompi cobra comisión?

Wompi maneja sus tarifas directamente con cada comercio según el volumen de ventas. MENIUS no agrega ningún cargo sobre las transacciones de Wompi — lo que cobra Wompi es lo único que se descuenta.

## Resumen

1. ✅ Crea cuenta en comercios.wompi.co
2. ✅ Copia tus 3 llaves (Pública, Integridad, Eventos)
3. ✅ Agrégalas en Vercel como variables de entorno
4. ✅ Configura el webhook URL en Wompi
5. ✅ Tu restaurante ya acepta PSE, Nequi, Daviplata y tarjetas colombianas

Con MENIUS + Wompi, tus clientes colombianos pueden pagar exactamente como prefieren, sin necesidad de tarjeta internacional.
    `,
    title_en: 'How to Accept Payments with Wompi (Bancolombia) in Your Restaurant',
    description_en: 'Complete guide to enable Wompi payments in MENIUS: cards, PSE, Nequi and Daviplata for restaurants in Colombia using COP.',
    category_en: 'Payments',
    content_en: `
## What is Wompi and why use it?

Wompi is **Bancolombia's** payment gateway — Colombia's largest bank. It's the most popular option for accepting digital payments in Colombian pesos (COP) because:

- **No international card needed** — customers can pay via PSE with their Colombian bank account
- **Nequi and Daviplata** — Colombia's most popular digital wallets
- **Local cards** — Visa, Mastercard, Amex issued in Colombia
- **Efecty** — for customers who prefer cash

If your restaurant operates in Colombia, Wompi converts better because your customers don't need a credit card.

## MENIUS + Wompi: automatic detection

MENIUS automatically detects your restaurant's currency. If you use **COP**, the online payment button in your menu uses Wompi automatically — no code changes needed.

## Setup in 4 steps

1. **Create account** at comercios.wompi.co
2. **Copy your keys** (Public Key, Integrity Secret, Events Secret) from Dashboard → Developers
3. **Add to Vercel**: \`WOMPI_PUBLIC_KEY\`, \`WOMPI_INTEGRITY_SECRET\`, \`WOMPI_EVENTS_SECRET\`
4. **Set webhook URL**: \`https://yourdomain.menius.app/api/payments/wompi-webhook\`

MENIUS auto-marks orders as paid when Wompi confirms the transaction via webhook.
    `,
  },
  {
    slug: 'sistema-reservaciones-digitales-restaurante',
    title: 'Reservaciones digitales para tu restaurante: la guía completa 2026',
    description: 'Cómo activar el sistema de reservas en MENIUS para que tus clientes reserven mesa desde el menú digital, sin llamadas ni apps externas.',
    category: 'Operaciones',
    readTime: 4,
    date: '2026-03-19',
    author: 'MENIUS',
    content: `
## ¿Por qué ofrecer reservaciones digitales?

Antes, reservar una mesa requería llamar al restaurante, esperar, y esperar a que alguien contestara. Hoy, tus clientes esperan poder reservar **desde su celular en 30 segundos**, a cualquier hora del día o la noche.

Los restaurantes que ofrecen reservaciones digitales reportan:

- **Menos no-shows** — los clientes que reservan digitalmente se comprometen más
- **Mejor planificación** — sabes de antemano cuántos cubiertos necesitas
- **Menos llamadas** — tu equipo se enfoca en atender, no en el teléfono
- **Mayor ticket promedio** — los clientes que reservan planifican su experiencia con más cuidado

## MENIUS Reservaciones: cómo funciona

MENIUS incluye un sistema de reservaciones integrado directamente en tu menú público digital. No necesitas apps externas como OpenTable o Resy.

### Para tus clientes

El formulario de reserva aparece en la parte inferior del menú público cuando lo activas. El cliente solo necesita:

1. Escribir su nombre
2. Seleccionar número de personas, fecha y hora
3. Agregar teléfono o email (opcional)
4. Agregar notas especiales (alergias, cumpleaños, etc.)
5. Clic en "Reservar mesa"

El proceso toma menos de 60 segundos desde cualquier celular.

### Para tu equipo

Desde el dashboard → **Reservaciones** ves todas las reservaciones organizadas por fecha. Para cada una puedes:

- ✅ **Confirmar** — el cliente queda anotado
- ❌ **Rechazar** — si no hay disponibilidad
- 👻 **No asistió** — para llevar estadísticas reales

La vista de hoy te muestra hora, número de personas, datos de contacto y notas especiales de cada reservación.

## Cómo activar las reservaciones en MENIUS

**Paso 1**: Ve a tu dashboard → menú lateral → **Reservaciones**

**Paso 2**: Clic en **"Ajustes"** en la parte superior derecha

**Paso 3**: Activa el toggle **"Activar reservaciones"**

**Paso 4**: Clic en **"Guardar"**

Listo. El formulario de reserva aparece automáticamente en tu menú público.

## Consejos para reducir no-shows

1. **Confirma por WhatsApp** — cuando llegue una reservación, escríbele al cliente confirmando. MENIUS muestra el teléfono directamente en el panel.

2. **Envía recordatorio el día anterior** — un mensaje simple: "Te esperamos mañana a las 8pm. ¿Sigue todo bien?" reduce los no-shows hasta un 40%.

3. **Pide depósito para grupos grandes** — para mesas de 8+ personas, considera pedir un pequeño depósito (por ahora manual, vía transferencia o Wompi).

4. **Responde rápido** — entre más rápido confirmas o rechazas, mejor la experiencia del cliente.

## Próximas funciones

El módulo de reservaciones de MENIUS seguirá creciendo con:

- Confirmaciones automáticas por WhatsApp y email
- Horarios de disponibilidad configurables por día
- Límite de mesas simultáneas por franja horaria
- Vista de mapa/plano del salón

## Conclusión

Las reservaciones digitales son uno de los diferenciadores más fáciles de activar para cualquier restaurante. Tus clientes ya están acostumbrados a reservar hoteles y vuelos en segundos desde su celular — tu restaurante puede ofrecerles la misma experiencia.

Activa MENIUS Reservaciones en 2 minutos y empieza a llenar tus mesas con más organización y menos estrés.
    `,
    title_en: 'Digital Table Reservations for Your Restaurant: The 2026 Complete Guide',
    description_en: 'How to activate the reservation system in MENIUS so your customers can book a table directly from the digital menu — no calls, no third-party apps.',
    category_en: 'Operations',
    content_en: `
## Why offer digital reservations?

Restaurants that offer digital reservations report fewer no-shows, better planning, and higher average ticket sizes. Your customers expect to book a table in under 60 seconds from their phone, at any time of day.

## How MENIUS Reservations works

The reservation form appears at the bottom of your public menu when activated. Customers fill in: name, party size, date, time, phone/email, and optional notes — done in under 60 seconds.

From the dashboard → **Reservations**, you see all bookings organized by date. Confirm, reject, or mark as no-show with one tap.

## Activate in 2 minutes

1. Dashboard → Reservations → Settings
2. Toggle on "Enable reservations"
3. Save

The form appears immediately on your public menu.

## Tips to reduce no-shows

- Confirm via WhatsApp as soon as the reservation comes in (MENIUS shows the phone number directly)
- Send a reminder the day before
- Ask for a deposit for large groups (8+ people)

Activate MENIUS Reservations and start filling your tables with less phone calls and more organization.
    `,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getBlogPost(slug);
  if (!current) return blogPosts.slice(0, limit);

  return blogPosts
    .filter((p) => p.slug !== slug)
    .sort((a, b) => (a.category === current.category ? -1 : b.category === current.category ? 1 : 0))
    .slice(0, limit);
}
