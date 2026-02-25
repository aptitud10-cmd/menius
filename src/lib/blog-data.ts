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
- Tu URL personalizada (ej: menius.app/r/tu-restaurante)
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
- Your custom URL (e.g., menius.app/r/your-restaurant)
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
