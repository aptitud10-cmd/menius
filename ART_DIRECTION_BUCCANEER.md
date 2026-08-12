# Art Direction — Buccaneer Diner (landing page)

**Fecha:** 2026-08-12
**Director:** director-creativo (Opus)
**Cliente:** Buccaneer Diner — 9301 Astoria Blvd, East Elmhurst, Queens, NY · +1 718-429-5188 · **abierto 24 horas**
**Deriva de:** `DESIGN_RESEARCH_BUCCANEER.md` (2026-08-12)
**Menú vivo:** menius.app/buccaneer (408 productos, 14 categorías)

---

## 1. Concepto central

> **"Siempre hay luz encendida."**

Buccaneer abre las 24 horas. Ese dato — que hoy está enterrado como una línea de horario en el menú digital — es el concepto entero. No es un diner que *también* abre de noche: es el lugar que está prendido cuando todo lo demás en Astoria Boulevard está cerrado. El turno de noche del aeropuerto, el que sale del hospital, la familia después del vuelo de las 11pm, el desayuno a las 4am que para otro es la cena.

**Por qué este concepto y no otro:**

Primero, **es verdad y es raro**. C4 y C6 mandan trabajar con lo real, y lo real acá es un diferenciador duro: Georgia Diner, el competidor a pocas cuadras que el research marca como benchmark de piso, no tiene ni la mitad de esa historia y aun así ordena su sitio alrededor de un genérico "welcome". Ninguna landing de diner de barrio en Queens está construida sobre su propio horario. Es gratis, es cierto, y nadie lo está usando.

Segundo, **resuelve solo el problema del material fotográfico**. Las 81 fotos generadas son plato blanco sobre pizarra, fondo negro puro, luz dura de un solo lado. Bajo cualquier concepto "diner luminoso americano" esas fotos son un cuerpo extraño que hay que disimular. Bajo "siempre hay luz encendida" son literalmente el tema: **un cono de luz cayendo sobre un plato en la oscuridad**. La estética dark & moody que el research confirma como tendencia vigente 2025-2026 deja de ser una coincidencia afortunada y pasa a ser argumento. El fondo negro del sitio no es una decisión de moda, es la noche; cada foto de plato es una lámpara.

Tercero, **es la vía que respeta lo que el lugar es sin el disfraz**. El research es tajante: neón rosa, cromo, checkerboard y script curvo se leen fechados en 2026, como cliché de stock. Pero la alternativa no es negar que Buccaneer es un diner americano — es tomar de la iconografía diner **lo único que nunca envejeció: la ventana iluminada en la noche**. Es Hopper, "Nighthawks", no "Happy Days". Es la misma raíz cultural sin el traje de época. Nostalgia por atmósfera, no por atrezzo.

Cuarto, **une los dos objetivos comerciales en vez de partirlos**. "Pedí online" y "vení al local" normalmente pelean por el hero. Acá son la misma frase: *estamos abiertos ahora*. Si estás en casa a la 1am, pedís. Si estás manejando por Astoria Blvd a la 1am, entrás. El CTA doble deja de ser un compromiso incómodo y pasa a ser la consecuencia natural del mensaje (ver sección 5).

**Traducción a decisiones:** base oscura no negociable · una sola fuente de luz cálida como acento · tipografía de letrero, no de app · motion mínimo, salvo un elemento que respira · el reloj real del local como componente vivo del sitio.

---

## 2. Mood & Atmósfera

- **Tono:** oscuro y denso, pero cálido — nunca frío ni "tech dark mode". El negro acá es noche de calle, no interfaz.
- **Sensación táctil:** vidrio, esmalte y grasa de plancha. Superficies duras con luz encima. Nada aterciopelado, nada glassmorphism, nada blando.
- **Ritmo visual:** calmo y sostenido. Un diner de 24 horas no tiene urgencia; tiene continuidad. El sitio no apura, está disponible.
- **Registro de marca:** obrero y digno. Buccaneer no es cool ni aspiracional — le da de comer a gente que trabaja. El sitio tiene que verse *bien hecho*, no *de moda*. Si un vecino de 55 años lo abre y siente que es "para jóvenes", fallamos.
- **Referencia atmosférica única:** una ventana iluminada vista desde la vereda oscura.

---

## 3. Paleta

Restricción deliberada, siguiendo la disciplina de Crav Burgers (2 colores): **una base oscura + una sola luz + neutros**. El color no decora, marca lo que está encendido.

### Base

| Nombre | Hex | Rol |
|---|---|---|
| **Asphalt** | `#0B0B0C` | Fondo global de todo el sitio. Casi negro pero no `#000`, para que las fotos de plato (fondo negro puro) se recorten con un borde sutil y no se fundan con el lienzo. Esta diferencia de 11 puntos es la que hace que el plato parezca iluminado y no pegado. |
| **Griddle** | `#1A1917` | Superficies elevadas: tiles de categoría, cards, header al hacer scroll, franjas de sección alternas. Levemente cálido (R>B) — es plancha de acero con uso, no gris de UI. |

### Luz (el acento — uno solo, no dos)

| Nombre | Hex | Rol |
|---|---|---|
| **Counter Light** | `#F2B441` | **El color de la marca.** Ámbar de lámpara de barra / yema de huevo. Se usa para: CTA primario ("Order Online"), el indicador "OPEN NOW", números grandes ("24"), subrayados de headline, íconos activos. Regla dura: si algo es ámbar, es porque está encendido o es accionable. Nunca decorativo. Contraste sobre Asphalt: **11.4:1** — AAA. Texto negro (`#0B0B0C`) sobre ámbar: **11.4:1** — AAA. Es el único par que sirve para botón sólido sin dudar. |

### Apoyo (uso restringido)

| Nombre | Hex | Rol |
|---|---|---|
| **Ketchup Ember** | `#B8422E` | Rojo terracota oscurecido. **Solo dos usos:** el logotipo/wordmark de Buccaneer, y estados de alerta o "cerrado temporalmente". Es el guiño al rojo de diner sin el rojo plano de fast food. Nunca en botones ni en fondos grandes — si compite con el ámbar, matamos la jerarquía del CTA. |

### Neutros

| Nombre | Hex | Rol |
|---|---|---|
| **Porcelain** | `#F4F1EA` | Texto principal y headlines. Blanco cálido de plato de diner, no `#FFF`. Sobre Asphalt: **16.8:1** — AAA. |
| **Steam** | `#A8A29A` | Texto secundario, descripciones, metadatos, labels. Sobre Asphalt: **7.6:1** — AAA para texto normal. |
| **Seam** | `#2C2A27` | Bordes, divisores, hairlines de 1px, contorno de tiles. Nunca para texto. |

### Razón de la paleta

Se construye **sobre** el material fotográfico en lugar de pelearse con él: como las 81 fotos ya son plato claro sobre negro, un sitio de base oscura las absorbe sin recortes ni fondos falsos, y cada foto aporta su propia luz al layout. Es la recomendación literal del research (no forzar fondo blanco tipo diner clásico) llevada al extremo coherente.

El único acento cálido saturado es el ámbar, no terracota **y** mostaza a la vez: con un solo color de luz, el ojo aprende en tres segundos que ámbar = acción, y el CTA de pedido gana el 100% de la atención cromática de la página. Esa es la ventaja real sobre Georgia Diner, que repite "Order Online" sin jerarquía.

Todos los pares de texto verifican **WCAG AAA** (ninguno baja de 7:1), lo cual importa doble en un público de barrio con rango etario amplio leyendo un teléfono en la calle de noche. Para daltonismo: el sistema no depende del color para ningún significado — "OPEN NOW" lleva punto + texto, no solo ámbar; el CTA se distingue por peso y tamaño además de color. La distancia ámbar/terracota es suficiente en luminancia (L* 78 vs L* 45) para separarlos también en deuteranopía.

**Prohibido agregar:** turquesa, rosa neón, cromo/plateado con gradiente, verde menta. Ningún gradiente de dos colores en fondos.

---

## 4. Tipografía

Traducción de la tendencia "Modern Western / New Americana" del research a fuentes **realmente disponibles y gratuitas** (self-host vía `next/font/google` — sin licencias comerciales que bloqueen el proyecto).

### Display — Headlines, wordmark, números grandes

- **Familia:** **Anton** (Google Fonts) — fallback: `'Anton', 'Oswald', 'Arial Narrow', 'Haettenschweiler', sans-serif`
- **Peso:** 400 (único que tiene, y alcanza)
- **Cuándo usar:** H1 del hero, el número "24", títulos de sección, nombres de categoría en los tiles. Siempre en **MAYÚSCULAS**.
- **Por qué:** es una grotesca condensada ultra-pesada — exactamente la geometría de letrero pintado de vía pública y de wood type de póster americano que describe la tendencia Modern Western, sin ser una fuente "temática" de diner. No tiene ni una gota de disfraz retro: no hay serifas de saloon, no hay script, no hay contorno de neón. A gran tamaño y en caja alta se lee como el letrero de la fachada; a la vez es una fuente que en 2026 se usa en editorial serio. Y su altura-x enorme mantiene legibilidad a 320px de ancho, que es donde va a vivir el 78% del tráfico.

### Body — Lectura, UI, precios

- **Familia:** **Bricolage Grotesque** (Google Fonts) — fallback: `'Bricolage Grotesque', 'Inter', system-ui, sans-serif`
- **Pesos:** 400 (párrafos), 500 (labels, metadatos), 700 (precios, botones)
- **Cuándo usar:** todo lo que no sea headline. Descripciones, horarios, dirección, texto de botón, precios.
- **Por qué:** el research la nombra directamente como el grotesk de pairing editorial de 2026, es variable (un solo archivo, bien para performance en 4G) y **ya está cargada en el proyecto MENIUS** como `--font-display` — cero costo de integración. Sus terminaciones ligeramente irregulares le dan calidez y carácter de imprenta que Inter no tiene, sin perder neutralidad para leer 408 precios.

### Utilitaria — Reloj, horarios, estado "OPEN"

- **Familia:** **JetBrains Mono** (Google Fonts) — fallback: `'JetBrains Mono', ui-monospace, 'SF Mono', monospace`
- **Pesos:** 500, 700
- **Uso exclusivo:** la hora actual del local en el hero, la tabla de horarios, y el badge "OPEN NOW". Nada más.
- **Por qué:** el mono cumple una función, no un capricho — los dígitos tabulares evitan que la hora **salte de ancho** al cambiar de minuto (`1:11` vs `1:44`), que sería un temblor visible en un elemento que se actualiza en vivo. Además introduce un registro "instrumental/panel" que refuerza la idea de un lugar que está operando ahora mismo.

### Pairing — por qué funciona

Anton y Bricolage se oponen en el eje correcto: Anton es **vertical, cerrado, sin aire**; Bricolage es **abierto, humanista, respirable**. Esa tensión reproduce exactamente la experiencia física del lugar — el letrero gritado afuera, la conversación tranquila adentro. No hay riesgo de confusión entre ambas (contraste de peso y ancho extremo), que es el error típico del pairing de dos sans parecidas.

El mono como tercera voz no rompe la armonía porque tiene un territorio de uso encapsulado y funcional. Tres fuentes es el máximo: cualquier cuarta se prohíbe.

### Detalles tipográficos

| Propiedad | Valor |
|---|---|
| Tracking display (Anton) | `-0.01em` en tamaños ≥48px; `0` debajo |
| Tracking body (Bricolage) | `-0.011em` |
| Tracking labels/eyebrow | `+0.12em` mayúsculas, siempre |
| Leading display | `0.92` (los headlines en caja alta condensada necesitan que las líneas se toquen para leerse como bloque/letrero) |
| Leading body | `1.6` (párrafos) / `1.45` (descripciones cortas) |
| Ancho de medida | máx. `62ch` en párrafos |

### Escala — mobile-first (base 16px)

| Token | Mobile (360–767) | Tablet (768–1023) | Desktop (1024+) |
|---|---|---|---|
| `display-hero` | 44px | 76px | 116px |
| `display-xl` (números "24") | 72px | 120px | 180px |
| `h2` sección | 32px | 44px | 60px |
| `h3` tile/categoría | 20px | 24px | 28px |
| `body-lg` (bajada de hero) | 17px | 19px | 20px |
| `body` | **16px** (piso duro, nunca menos) | 16px | 17px |
| `body-sm` (metadatos) | 14px | 14px | 15px |
| `label/eyebrow` | 12px | 12px | 13px |
| `mono-clock` | 15px | 17px | 18px |

Escala construida desde mobile hacia arriba (ratio ~1.28 mobile, ~1.35 desktop). Ningún texto de lectura baja de 16px en ningún viewport. Inputs siempre ≥16px para evitar el zoom de iOS.

---

## 5. Cómo conviven los dos CTA — decisión tomada

**No se resuelve con dos botones del mismo peso. Se resuelve haciendo que "estamos abiertos" sea el mensaje, y que las dos acciones cuelguen de ahí.**

La decisión, en concreto:

1. **CTA primario, único y sólido: `Order Online →`** en ámbar `#F2B441` con texto negro. Es el único elemento de la página con fondo ámbar sólido. Lleva a `menius.app/buccaneer`. Aparece en el hero, en el header pegajoso y al cierre. **No hay ningún otro botón sólido en todo el sitio.**

2. **CTA secundario: `Get Directions`** como botón fantasma (borde `Seam`, texto `Porcelain`), inmediatamente al lado en desktop, debajo en mobile. Abre Google Maps directo a 9301 Astoria Blvd. Menor peso visual, **misma prominencia posicional** — está en el hero, no en el footer.

3. **El árbitro entre ambos es el bloque de estado en vivo**, colocado *encima* de los dos botones: un punto ámbar pulsante + `OPEN NOW · 1:47 AM` en mono + `Open 24 hours · 9301 Astoria Blvd`. Este bloque es el que le da sentido a los dos CTAs a la vez y es la razón por la que ninguno mata al otro: no compiten por atención, ambos responden a la misma afirmación.

4. **Mobile: barra sticky inferior con dos zonas asimétricas** — `Order Online` ocupa ~70% del ancho en ámbar sólido, un ícono/botón de teléfono + direcciones ocupa el ~30% restante en fantasma. Visible desde el primer scroll. El research cuantifica esto: CTA de orden visible sin scroll = **2.3x conversión en pickup**. La barra respeta `max(0.75rem, env(safe-area-inset-bottom))`.

5. **Teléfono como tercer camino, no como CTA visual:** el número es `tel:` clickeable en el hero y en la sección de ubicación, pero en texto — un diner 24h de barrio recibe pedidos por teléfono y esconderlo sería negar cómo trabaja el negocio. No compite porque no tiene forma de botón.

**Lo que explícitamente NO hacemos:** dos botones sólidos del mismo tamaño en el hero (paradoja de elección); botones de DoorDash / UberEats / Grubhub en ningún lugar del sitio (el research lo prohíbe: baja conversión y regala margen); "Reserve a table" (un diner no toma reservas — sería inventar una feature, viola C4).

---

## 6. Layout por sección

Orden definitivo. Nueve bloques, ninguno decorativo (C11). Composición base: **columna editorial ancha con desbordes intencionales**, más bento solo donde corresponde (categorías). Grid de 12 columnas en desktop, 6 en tablet, 4 en mobile. Spacing scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`.

---

### 1) Header — pegajoso, delgado

Altura 56px mobile / 68px desktop. Fondo transparente sobre el hero; al pasar 80px de scroll se rellena con `Griddle` + hairline `Seam` inferior. Izquierda: wordmark BUCCANEER en Anton (color `Ketchup Ember`). Derecha: badge `OPEN 24H` en mono + botón `Order Online` (aparece recién al scrollear, no duplica el del hero). Sin menú hamburguesa: la landing es una sola narrativa, no tiene páginas internas que navegar.

---

### 2) Hero — "la ventana encendida"

**El bloque que carga todo el concepto.** Ocupa `100svh` en mobile (nunca `100vh` — la barra de Safari), `88vh` en desktop.

- **Fondo:** foto real de la **fachada de noche con el letrero encendido**, a sangre completa, tratada con overlay `Asphalt` al 72% y un degradado radial que deja la zona del letrero más limpia. La foto no compite, ambienta. Sin parallax.
- **Composición:** texto alineado a la izquierda y abajo (no centrado — el centrado es el tic de plantilla que el research marca en Georgia Diner), respetando `max(24px, safe-area)`.
- **Eyebrow:** `EAST ELMHURST, QUEENS` — mono, `+0.12em`, color `Steam`.
- **H1 (Anton, caja alta, leading 0.92):**
  `ALWAYS OPEN.` / `ALWAYS BEEN HERE.`
  El segundo renglón en `Counter Light`. Un solo H1 en toda la página (C10).
- **Bajada (Bricolage 17px, `Steam`, máx 2 líneas):** "Breakfast at 4am, burgers at midnight. Astoria Boulevard's diner, open 24 hours a day."
- **Bloque de estado en vivo:** punto ámbar pulsante + `OPEN NOW · 1:47 AM` (mono, hora real del local en `America/New_York`, calculada client-side). Debajo: `9301 Astoria Blvd · (718) 429-5188` en `body-sm`.
- **CTAs:** `Order Online →` (ámbar sólido) + `Get Directions` (fantasma). Mobile: apilados, ámbar arriba, ambos ancho completo.
- **Mobile:** la fachada se recorta a un foco vertical del letrero; el texto ocupa el tercio inferior; nada de la información crítica queda bajo el fold.

**Por qué así:** cumple el patrón que el research extrae de Sunbeam — horario y ubicación viven en el hero, no en el footer — pero lo supera: Sunbeam pone el horario en la nav, acá el horario **es el titular**.

---

### 3) Franja de prueba — cuatro hechos

Banda horizontal delgada sobre `Griddle`, hairline arriba y abajo. Cuatro celdas divididas por líneas verticales `Seam`. En mobile: grid 2×2, sin scroll horizontal.

`24 HOURS` · `408 DISHES` · `SINCE [año — pendiente confirmar con el dueño]` · `DELIVERY & PICKUP`

Números grandes en Anton `Counter Light`, label debajo en mono `Steam`. Cero íconos.

**Regla C4:** ningún número se publica sin que el dueño lo confirme. "408 dishes" sale de la DB y es verificable. El año de fundación queda como placeholder marcado hasta que William lo confirme — **si no se confirma, la celda se elimina, no se estima.**

---

### 4) "It's 3am and we're cooking" — la sección de noche

**La sección firma del sitio, la que ningún competidor tiene.** Es donde el concepto se vuelve emocional y donde las fotos IA rinden al máximo, porque acá son legítimamente composiciones de producto en la oscuridad.

- Fondo `Asphalt` puro. Un H2 corto arriba a la izquierda: `THE NIGHT MENU`.
- Composición: **tres fotos de plato en escalera diagonal descendente** (desayuno / burger / pie de vitrina), a distinto tamaño y distinta altura, con mucho negro entre ellas. Cada una con un caption en mono: `04:12 — Two eggs, any style`, `01:30 — Cowboy Burger`, `23:45 — Cherry pie, from the case`.
- Los captions con hora son el dispositivo narrativo: el mismo diner a distintas horas.
- Un párrafo corto al costado, alineado a la derecha en desktop, sobre quién come a esas horas (turno de LaGuardia, gente que sale del hospital, familias que vuelven de viajar).
- **Etiqueta obligatoria** al pie de la sección, en `body-sm` color `Steam`: `Dish images are styled product compositions.` (ver sección 8).
- Mobile: escalera vertical, una foto por vez, alternando alineación izquierda/derecha para mantener el ritmo diagonal.

---

### 5) Categorías — bento, no catálogo

Puente al menú. **Nunca duplica los 408 productos** (el research lo prohíbe explícitamente).

- **Bento asimétrico de 6 tiles.** No 14 — de las 14 categorías de la DB se eligen las 6 que definen el negocio: **Breakfast (todo el día)**, **Burgers**, **Lunch & Dinner**, **The Bake Shop**, **Smoothies & Shakes**, **Bar**.
- Desktop: 2 tiles grandes (Breakfast y Burgers, 2×2 y 2×1) + 4 chicos. Tablet: 2 columnas con un tile ancho. Mobile: **columna única, sin scroll horizontal** — un carrusel de categorías esconde contenido y ya fue revertido antes en este proyecto.
- Cada tile: fondo `Griddle`, borde `Seam`, una foto de plato del catálogo real, nombre en Anton, conteo real (`68 items`) en mono, y una línea de descripción. Al hover/tap: el borde pasa a `Counter Light` y la foto escala 1.03. Todo el tile es el link a la categoría correspondiente de menius.app/buccaneer (deep link, no a la home del menú).
- Al pie: `See the full menu — 408 items →` como link de texto en ámbar.

---

### 6) El lugar — donde entran las fotos reales

El contrapeso documental. Aquí **no entra ni una imagen generada**.

- Composición editorial de **dos columnas asimétricas** (7/5 en desktop): a la izquierda una foto grande del salón/barra con gente real; a la derecha una columna vertical de dos fotos chicas apiladas (detalle de barra, vitrina de postres).
- Texto corto: qué es Buccaneer para el barrio. Tono directo, sin épica de marca.
- H2: `THE COUNTER, THE BOOTHS, THE PIE CASE.`
- Mobile: foto grande a sangre completa, luego las dos chicas en fila de 2 columnas, luego el texto.
- **Mientras no haya fotos propias:** esta sección usa stock real de diners con la nota `Photo: temporary — Buccaneer's own photos coming soon.` visible. Es preferible a llenar el hueco con IA, que es exactamente el terreno del backlash.

---

### 7) Visitá — mapa y horarios

- Split 50/50 en desktop; apilado en mobile (mapa primero).
- Izquierda: mapa embebido **estático** (imagen del mapa + botón `Open in Google Maps`, no un iframe interactivo — un iframe de Maps carga ~800KB de JS de terceros y hunde el Lighthouse, C8).
- Derecha: dirección completa, teléfono `tel:`, y la tabla de horarios en mono. Como es 24h, la "tabla" es una sola línea grande: `MONDAY — SUNDAY · OPEN 24 HOURS`, con el badge de estado en vivo repetido.
- Nota de accesos: cercanía a LaGuardia y a Astoria Blvd — es el contexto real del negocio.
- CTA fantasma: `Get Directions`.

---

### 8) Cierre — el último llamado

Banda corta, fondo `Griddle`. H2 en Anton: `THE LIGHT'S ON.` Debajo, la hora en vivo otra vez, y el `Order Online →` sólido por última vez. Sin formulario de newsletter (un diner no hace email marketing; sería una sección sin propósito comercial, C11).

---

### 9) Footer

Mínimo, `Asphalt`, hairline superior. Wordmark, dirección, teléfono, links a Instagram/Facebook **solo si existen y están activos** (C4), link al menú, y `Powered by MENIUS`. En mobile, padding inferior `max(2rem, env(safe-area-inset-bottom)) + altura de la barra sticky` para que la barra de CTA no tape el contenido.

---

## 7. Motion

**Respuesta corta: casi nada se mueve. Una sola cosa respira.**

Esto es una decisión, no una limitación de recursos. El público llega de noche, con una mano, en 4G, a veces buscando un teléfono o una dirección. Motion decorativo acá es fricción. La sofisticación viene de la restricción — es lo que dice el research y es lo correcto para este cliente.

### Intensidad: **Sutil**, con una excepción con significado

### Stack técnico

**Sin GSAP. Sin Lenis. Sin librería de scroll.**
- CSS `@keyframes` + `transition` para todo.
- `IntersectionObserver` (nativo) para los reveals.
- View Transitions API solo si más adelante hay más de una página. Hoy es una landing única: no aplica.

Justificación: Crav Burgers usa GSAP y está bien para una marca DTC de burgers premium; Buccaneer es un diner de barrio en Queens cuyo tráfico es mobile de gama media a la 1am. Meter 60KB+ de JS de animación para lograr fades que el CSS hace gratis viola C8 y no aporta un dólar de venta.

### Qué se mueve, exactamente

1. **El punto de "OPEN NOW" pulsa.** `opacity 1 → 0.35 → 1`, 2.4s, `ease-in-out`, infinito. **Es la única animación en loop de todo el sitio.** Es el latido del lugar: comunica "esto está pasando ahora", que es el concepto entero. Si tuviera que quedar una sola animación, es esta.
2. **El reloj actualiza el minuto.** No es animación, es dato vivo — un `setInterval` de 30s recalculando `America/New_York`. Cambio de dígito sin transición (el mono evita el salto de ancho).
3. **Reveals al entrar en viewport.** `opacity 0→1` + `translateY(16px→0)`, 480ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Una vez por elemento, nunca al scrollear hacia arriba. Stagger de 60ms entre hermanos, máximo 4 elementos.
4. **Hover en tiles de categoría.** Borde `Seam → Counter Light` y `scale(1.03)` en la imagen, 240ms. En touch, se dispara con `:active`.
5. **Header al scrollear.** Fondo transparente → `Griddle`, 200ms.
6. **Botones.** `brightness(1.08)` en hover, `scale(0.98)` en `:active`. El feedback táctil del `:active` es obligatorio en mobile.

### Qué NO se mueve

Sin parallax. Sin scroll-hijacking ni smooth-scroll custom. Sin contadores animados. Sin loader/preloader (una landing que hace esperar a alguien que quiere un teléfono a la 1am es un error de negocio). Sin cursor personalizado. Sin video en el hero — el research lo desaconseja para mobile y acá además contradice la calma del concepto. Sin texto que se escribe letra por letra. Sin marquee infinito.

**Los GIFs cortos de producto que sugiere el research (patrón Sunbeam) quedan fuera de la v1:** con material 100% generado por IA, animar un plato es exactamente el paso que lo empuja hacia "fingir fotografía documental". Reevaluable solo con video real filmado en el local.

### prefers-reduced-motion

Obligatorio. Con `reduce`: el punto de OPEN NOW deja de pulsar y queda sólido; los reveals aparecen sin desplazamiento; se conservan los cambios de color en hover/focus (son feedback funcional, no decoración). El reloj sigue actualizando: es información, no motion.

---

## 8. Fotos del local que necesita cada sección — prioridad para la sesión

Lista ordenada por bloqueo real. Las primeras dos son las que impiden lanzar.

| # | Foto | Sección que la usa | Prioridad | Nota de captura |
|---|---|---|---|---|
| 1 | **Fachada de noche, letrero encendido**, desde la vereda opuesta, en horizontal | Hero (fondo) | **BLOQUEANTE** | Es la imagen del concepto. Tomarla después del anochecer, con el letrero prendido y la vidriera iluminada por dentro. Que se vea algo de la calle (asfalto mojado suma). Entregar también un recorte vertical para mobile. |
| 2 | **Interior con gente real** — barra o booths, en uso | El lugar (foto grande) | **BLOQUEANTE** | Aunque haya pocos clientes. Es lo único que la IA no puede reemplazar y es lo que sostiene la credibilidad de todo el sitio (C6). Pedir consentimiento a los comensales. |
| 3 | **Vitrina de postres (pie case)** | El lugar (chica) + tile "The Bake Shop" | Alta | Distintivo físico real del diner, cero cliché. Con la luz propia de la vitrina, sin flash. |
| 4 | **Detalle de la barra** — taburetes, mostrador, cafetera | El lugar (chica) | Alta | Ancla la identidad "diner" sin necesitar neón. |
| 5 | **Fachada de día** | Sección Visitá, junto al mapa | Media | Ayuda a que la gente reconozca el lugar al llegar. |
| 6 | **Dueño y/o equipo en la barra o la cocina** | El lugar (posible reemplazo de #4) | Media-alta | El research de conversión lo marca como el elemento de confianza más fuerte en negocios de barrio. Si el dueño acepta, sube de prioridad a Alta. |
| 7 | **Plancha / cocina en acción de noche** | "It's 3am and we're cooking" | Media | Convertiría esa sección de "fotos de plato con captions" a algo documental. Muy deseable, no bloqueante. |
| 8 | **Calle Astoria Blvd de noche** | Textura de fondo / OG image | Baja | Contexto de barrio. |

**Dirección para la sesión:** oscura y con fuente puntual, misma lógica que las fotos de plato. Nada de flash frontal plano ni HDR. Preferir luz existente del local (vitrina, neón interior, luz de barra) aunque suba el ISO — el grano suma, el look plano resta.

**Regla de interinato:** hasta tener #1 y #2, la sección "El lugar" y el hero usan **stock real de diners americanos** (Unsplash/Pexels) con la nota visible `Photo: temporary — Buccaneer's own photos coming soon.` Es un estado transitorio explícito, y bajo ninguna circunstancia se rellena ese hueco con imágenes generadas.

### Línea infranqueable sobre las imágenes generadas

Sostiene el hallazgo central del research (backlash SF, julio 2026):

**Las 81 imágenes de plato se usan SOLO como composición de producto estilizada, aisladas sobre fondo oscuro, nunca simulando fotografía documental.**

- ✅ Permitido: plato solo, recortado o a sangre, sobre `Asphalt`/`Griddle`, dentro de tiles de categoría o en la escalera de la sección nocturna.
- ❌ Prohibido: manos, cubiertos en uso, mesas puestas, mantel, sillas, personas, fondos de salón, montajes que sugieran "así se ve nuestra mesa".
- ❌ Prohibido: usar una imagen generada en el hero, en la sección "El lugar", o en cualquier contexto que implique documentar el establecimiento.
- ❌ Prohibido: animarlas, cinemagraph, o cualquier tratamiento que sume verosimilitud fotográfica.
- ✅ Obligatorio: la nota `Dish images are styled product compositions.` visible al pie de la sección nocturna y del bloque de categorías. No es letra chica de disclaimer: es honestidad de marca, y en 2026 juega a favor.

---

## 9. Anti-patrones específicos de este proyecto

Adicionales a los de `constitution-cliente.md` C2.

1. **Nostalgia de los 50 literal** — neón rosa/turquesa, cromo, checkerboard, script curvo tipo "Happy Days", ilustraciones de Cadillac o jukebox. Se lee fechado en 2026 y como plantilla de Canva. La nostalgia vive en el local físico, no en el sitio.
2. **Fotos generadas en contexto documental** — ver sección 8. Es el riesgo reputacional más alto del proyecto.
3. **Duplicar el menú en la landing** — con 408 productos, replicar catálogo es ruido. Máximo 6 tiles de categoría con deep link al menú real.
4. **Botones de DoorDash / UberEats / Grubhub** — paradoja de elección + regalar margen. El único camino de pedido es menius.app/buccaneer.
5. **El patrón Georgia Diner** — hero centrado con foto de fachada + tres columnas "About / Menu / Contact" sin jerarquía. Es el competidor a pocas cuadras: parecernos a él anula la razón del proyecto.
6. **Un segundo color de acento** — si aparece un verde, un azul o un segundo cálido saturado, el ámbar deja de significar "acción" y la conversión cae. Un color de luz, uno solo.
7. **Fondo claro o modo claro** — no hay versión clara de este sitio. Las fotos de plato quedarían recortadas contra blanco y el concepto se rompe.
8. **Video en el hero** — mobile de gama media en 4G, y contradice la calma del concepto.
9. **Loader / preloader / splash animado** — cero tolerancia. La gente llega buscando un teléfono, una dirección o un pedido.
10. **Copy de agencia** — "welcome to our restaurant", "a culinary experience", "where tradition meets flavor", "passion for food". El copy es corto, concreto y del barrio, en inglés (público de Queens; el menú digital ya resuelve el multi-idioma).
11. **Inventar prueba social** — sin reseñas falsas, sin "5,000 happy customers", sin estrellas si no vienen de una fuente real y citada. Las reseñas de Google se pueden mostrar solo si son reales y atribuidas.
12. **Carrusel horizontal de categorías en mobile** — esconde contenido y ya fue evaluado y revertido en este proyecto. Columna única.
13. **Emojis en la UI** — ni en botones, ni en headings, ni en labels.
14. **Iconografía genérica de restaurante** — cubiertos cruzados, chef con gorro, hojas de laurel, sombreadores de "food icon set". Si hace falta un ícono, es de sistema y funcional (flecha, teléfono, pin).

---

## 10. Brief de verificación para los diseñadores

Al leer este documento, `disenador-mobile`, `disenador-tablet` y quien haga desktop deben poder responder:

- **¿Sensación primaria?** Noche cálida, ventana encendida, lugar que nunca cierra. Digno y obrero, no cool.
- **¿Paleta y dónde?** `#0B0B0C` fondo, `#1A1917` superficies, `#F2B441` **solo** lo accionable/encendido, `#B8422E` solo wordmark y alertas, `#F4F1EA` texto, `#A8A29A` secundario, `#2C2A27` bordes.
- **¿Tipografía?** Anton mayúsculas para display, Bricolage Grotesque para todo lo demás, JetBrains Mono solo para reloj/horarios/estado.
- **¿Motion?** Casi nada. Un punto que pulsa, reveals de 480ms, hover en tiles. Sin librerías.
- **¿Layout base?** Editorial de columna ancha con desbordes; bento solo en categorías (6 tiles); mobile en columna única siempre.
- **¿Qué evito?** Los 14 anti-patrones de arriba, empezando por retro de los 50 y por imágenes generadas en contexto documental.

Si algo de esto no se puede responder desde el documento, falta detalle y hay que volver a mí antes de diseñar.

---

## 11. Abiertos para William — necesito respuesta antes de que empiecen los diseñadores

1. **Año de fundación de Buccaneer.** Va en la franja de hechos. Si no se confirma, esa celda se elimina — no se estima (C4).
2. **¿El dueño acepta salir en foto?** Cambia la prioridad #6 de la sesión y agrega el elemento de confianza más fuerte disponible.
3. **¿Instagram / Facebook activos?** Si no hay o están abandonados, no se linkean.
4. **¿Idioma?** Propongo **inglés únicamente** para la landing: es Queens, la señalética del local es en inglés, y el menú digital ya cubre traducción. Si el dueño quiere español, es una decisión de negocio, no de diseño — pero duplicar la landing tiene costo.
5. **¿Reseñas de Google reales para mostrar?** Si hay volumen y calificación decentes, agrego un bloque de prueba social entre las secciones 6 y 7. Sin fuente real, no va.
6. **Confirmar 24h reales, todos los días.** El menú dice "Open 24 hours"; toda la dirección creativa se apoya en eso. Si en la práctica cierra alguna noche, el concepto sigue en pie pero el copy del hero cambia.
