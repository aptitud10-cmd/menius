# Art Direction v2 — Buccaneer Diner (landing)

**Fecha:** 2026-11-10 (revisado tras gate A, sección 19; recalibrado con referencias reales del local, sección 20; cierre de huecos del gate Etapa A #2, sección 21; ajuste de composición del gate Etapa A #3, sección 22; **decisiones cross-viewport tras los tres diseños, sección 24**)
**Director:** director-creativo
**Cliente:** Buccaneer Diner — 9301 Astoria Boulevard, East Elmhurst, NY 11369 · (718) 429-5188
**Deriva de:** `DESIGN_RESEARCH_BUCCANEER_V2.md` (2026-11-10) y de 14 fotos de referencia del local (sección 20.1)
**Reemplaza:** `ART_DIRECTION_BUCCANEER.md` (v1, 2026-08-12). La v1 queda como histórico; donde este documento no dice nada, NO se hereda la v1 por defecto. Lo que se conserva está listado explícitamente en la sección 12.
**Decisión de base (Pedro):** Dirección B, "El día en 24 horas", con la disciplina de dos colores de la dirección A.

> **Estado:** aprobada en el gate Etapa A #4 (sección 23). Los tres diseños por viewport (`DESIGN_MOBILE_BUCCANEER_V2.md`, `DESIGN_TABLET_BUCCANEER_V2.md`, `DESIGN_DESKTOP_BUCCANEER_V2.md`) reportaron contradicciones; la sección 24 las decide y las secciones afectadas están actualizadas en su lugar. Los diseñadores ajustan sus documentos con la sección 24 y los tres vuelven al visual-critic.

> **Idioma.** Este documento está en español, pero **todo el texto visible del sitio es en inglés** (el idioma final es decisión pendiente de Pedro, Q6). Los bloques y controles se nombran con nombres internos en inglés para que no se confundan con copy: **Now** (hero), **Day chapters** (capítulos), **Visit** (sección del lugar), **Close** (cierre), **Order card** y **Visit card** (las dos tarjetas del hero y del cierre), **sticky bar** (barra mobile). Los textos que ve el usuario aparecen siempre entre comillas.

> **Cómo leer las marcas de cambio.** "Recalibrado (20)" = cambio por las fotos del local. "Gate #2 (21.N)" = cambio por el punto N del gate Etapa A #2. "Gate #3 (22.N)" = cambio por el punto N del gate Etapa A #3. "**Decisión 24.N**" = decisión cross-viewport N tomada después de los tres diseños; manda sobre cualquier texto anterior que la contradiga. El símbolo **†** marca afirmaciones que dependen solo de fotos de referencia que el visual-critic no abrió (`fachada-jun-2026.png`, `salon-panoramica.png` y los siete `plato-*.png`); ninguna decisión bloqueante depende solo de ellas (21.11).

---

## 0. Hechos que se pueden afirmar (la única fuente de verdad del copy)

> **Recalibrado (20):** se suman "Open 24/7" y "Breakfast All Day", leídos en el cartel del techo del local. La prohibición de afirmar desayuno a toda hora se acota: se usa la frase textual del cartel, nada más.

| Hecho | Fuente | Uso |
|---|---|---|
| Abierto 24 horas, 7 días | Menú vivo + cartel del techo | Línea fija del hero en todos los estados, Visit, Close, metadata |
| **"Open 24/7"** (textual) | Panel amarillo izquierdo del cartel del techo, visible en `fachada-atardecer-2026.png`, `fachada-dia-calle.png` y `fachada-noche-neon.png` | Texto de la línea fija (7.2), Visit, Close, frase de números (7.4) |
| **"Breakfast All Day"** (textual) | Panel amarillo derecho del mismo cartel, visible en `fachada-atardecer-2026.png` y `fachada-dia-calle.png` | Bajada del capítulo Morning, frase de números, línea `meta` de la Order card de Morning en tablet/desktop. Siempre en la forma "Breakfast all day" (sentence case) |
| 9301 Astoria Boulevard, East Elmhurst, NY 11369 | Cliente | Visit, footer, Visit card |
| (718) 429-5188 | Cliente | `tel:+17184295188` en sticky bar, header desktop, Visit, footer |
| Dine in, pickup y delivery | Menú vivo | Order card, Visit |
| 408 platos activos en el menú | DB | Una sola frase en el cuerpo. El número se calcula desde la DB en el render, no se tipea a mano |
| Los 13 grupos del menú vivo y sus conteos (leídos de menius.app/buccaneer el 2026-11-10): Breakfast 81 · Burgers 19 · Lunch 62 · Salads & Soups 21 · Appetizers 21 · Sides 24 · Dinner 68 · Desserts 19 · The Bake Shop 8 · From the Fountain 6 · Smoothies & Shakes 10 · Beverage 22 · Bar 47 (suman 408) | DB | Day chapters. Conteos calculados de la DB en el render |
| Nombres de subcategoría y de plato del menú vivo | DB | Índice de Breakfast, Pizarra de Evening (7.3), deep links, bajadas. Solo nombres que existan hoy en la DB |

**Condición sobre los dos textos del cartel.** Los paneles laterales del cartel cambian con los años: en `fachada-noche-2019.png` decían "Baking" y "Sea Food". Por eso la sesión de fotos incluye S08 (cartel del techo, frontal, con fecha en los metadatos) y **"Open 24/7" y "Breakfast all day" se re-verifican con S08 antes del deploy**. Si el día de la sesión el panel dice otra cosa, el texto sale del sitio.

**Prohibido hasta que el dueño lo confirme:** año de fundación, "always been here", tiempos de viaje, distancia a LaGuardia, "cerrado 0 días", quién es la clientela, descripciones del salón, comparaciones con otros diners, origen griego de los dueños o "family-owned", que las rockolas funcionen o que haya una en cada mesa, envío gratis y gift cards (aparecen recortados en un mantel de papel, ilegibles: no cuentan como fuente), **que la cocina sirva el menú completo a toda hora**, y cualquier reformulación de "Breakfast all day" que agregue una hora ("breakfast at 4 a.m.", "breakfast all night"). Ver Q1 en la sección 17.

---

## 1. Concepto central

> **"Cambia la luz; el mostrador sigue."**

Buccaneer no cierra, así que lo que lo distingue no es *que* esté abierto (Diner24, en Manhattan, ocupa la misma búsqueda de "24-hour diner"), sino **cómo cambia el mismo lugar a lo largo de sus turnos**. El sitio muestra el diner con la luz del turno en que lo abrís, según la hora real de Nueva York. Lo que no cambia nunca es el mostrador: la dirección, el teléfono, el menú y los dos caminos (pedir o venir).

**Qué es "la luz" (precisión tras gate A).** Es la luz **de adentro del diner en cada turno de comida**, no la del cielo: la mesa del desayuno, el mostrador del mediodía, las lámparas de la cena y el letrero prendido de la noche. Los estados siguen los **turnos de comida**, no la puesta del sol, por eso son verdaderos en diciembre y en julio:
- Las fotos de hero de Morning, Midday y Evening son **interiores, sin ventana ni cielo en cuadro**. No dicen qué hora es afuera; dicen qué se come en ese turno. En diciembre, a las 17:00, ya es de noche afuera y el hero muestra un plato de cena bajo la luz del salón: es cierto.
- El único hero que muestra el exterior es Night (22:00–04:59), y en Nueva York esa franja es de noche todo el año. La puesta más tardía es alrededor de las 20:31 (fines de junio) y el crepúsculo civil termina cerca de las 21:03; el amanecer más temprano es cerca de las 05:24, con el crepúsculo civil desde cerca de las 04:52 (cifras aproximadas de almanaque; verificarlas si alguna vez se usan en copy). En el peor caso, unos minutos de junio caen en hora azul, que es justamente la luz con que se toma S01.
- **El pitch al cliente dice "la página sigue los turnos del diner", nunca "la página cambia con el cielo"** ni "lo que ves es lo que está pasando afuera".

**El letrero es la prueba del concepto (recalibrado, 20).** Las referencias muestran que el diner ya hace en la calle lo que el sitio hace en pantalla: de día el nombre se lee en el cartel del techo (letras góticas rojas sobre caja de luz blanca) y en las letras sin prender del frente; de noche, el mismo nombre se enciende en neón rojo sobre vidrio negro, con la línea de LED azul arriba. Por eso **el wordmark del sitio también cambia de luz**: rojo de cartel (Rooftop) en los estados de día, rojo de tubo (Neon) en el estado Night. Es la única pieza de marca que cambia con la hora, y lo hace por un cambio de token, sin animación ni brillo.

**Por qué este concepto.** El research v2 demuestra que la v1 no falló por un color sino por juntar cinco patrones que hoy se leen como sitio generado (dark permanente, labels en mayúscula, banner de stats, cards iguales, badge sobre el H1). Un template es igual a cualquier hora y para cualquier negocio; esta página solo puede existir para un lugar que no cierra. La hora deja de ser un badge ("OPEN NOW", que en un local 24h informa cero) y pasa a ser el sistema: decide la paleta, la foto, el plato sugerido y la frase de entrada.

**Por qué "luz" y no "reloj".** Un reloj es un widget; la luz es material fotográfico real, tomado en el local en el turno que representa (sección 11). Eso hace que el concepto sea verificable y no un efecto de CSS. También desactiva el riesgo que el research marca para B ("se vuelve un truco"): la estructura, el contenido y los caminos son siempre los mismos; cambian la luz y el énfasis.

**Por qué dos colores de superficie y un rojo de firma (recalibrado, 20; precisado en gate #2, 21.1).** Azul de bulevar y amarillo yema son los únicos dos colores que pintan superficies: en los turnos diurnos uno es fondo y el otro tinta; a la noche se dan vuelta. **Son elecciones, no muestras de color del local**: Boulevard va en la dirección del LED azul y del "Diner" del cartel sin reproducirlos (el LED es un azul eléctrico inusable como fondo de lectura), y Yolk es un marigold más cálido que el amarillo limón de los paneles del cartel (4.1). El rojo del letrero entra con un rol cerrado: **es el nombre**. No pinta fondos, botones, links ni precios; solo firma (wordmark, pin del mapa, favicon). Es la disciplina de Délice, Agrumea y Tengile (paletas de dos tonos) con la firma real del lugar encima, y sigue siendo lo opuesto al negro + ámbar + gris de la v1.

---

## 2. Mood y atmósfera

- **Tono:** luminoso y abierto en los turnos de día; profundo pero con color (azul, no negro) de noche. Nunca "interfaz oscura".
- **Sensación táctil:** papel de menú, esmalte de plato, vidrio de vitrina, caja de luz del cartel, letra de rótulo pintada. Bordes duros, sin sombras, sin blur, sin glassmorphism, sin glow; radio máximo 4px en controles y 0 en fotos y en la placa del wordmark.
- **Ritmo visual:** calmo dentro de cada capítulo, con **cortes secos** entre capítulos. El día pasa por cortes, no por fundidos.
- **Registro:** obrero, de barrio, digno. Bien hecho, no de moda. Un vecino de 55 años lo tiene que leer como "el diner de acá", y tiene que reconocer el letrero que ve desde Astoria Boulevard.

---

## 3. Los estados del día

### 3.1 Cuántos y cuándo

> **Decisión 24.4:** D07 sale de la Order card de Night en todos los viewports.

**Cuatro estados de contenido, tres paletas.** Las horas siguen los turnos de comida del diner (sección 1). Nada de APIs de amanecer o atardecer.

| Estado (interno) | Horas NY (inclusive) | Paleta | Foto del hero | Frase de estado | Deep link de la Order card |
|---|---|---|---|---|---|
| **Morning** | 05:00 – 10:59 | Day | D01 panqueques, interior, sin ventana en cuadro | "Breakfast time." | `?category=Buttermilk%20Pancakes` |
| **Midday** | 11:00 – 15:59 | Day | D04 hamburguesa 7 oz, interior | "Lunch hour." | `?category=7%20oz.%20Certified%20Angus%20Beef%20Burgers` |
| **Evening** | 16:00 – 21:59 | Lamp | D06 plato de cena (mariscos), luz interior | "Dinner, here or at home." | `?category=Seafood` |
| **Night** | 22:00 – 04:59 | Sign | S01 letrero prendido (en mobile, recorte de la palabra "Buccaneer" en neón; poster de S02) | "Up late? So are we." | `?category=9%20oz.%20Specialty%20Steak%20Burgers` |

Notas:
- **Night arranca a las 22:00, no a las 21:00** (cambio tras gate A, W3). A las 21:15 el público todavía está cenando; "Up late?" a esa hora suena falso. Además, desde las 22:00 la fachada es de noche todo el año (B2).
- Morning y Midday comparten paleta a propósito: cuatro paletas son cuatro sistemas de contraste para mantener, y quien ve el sitio a las 10:59 y a las 11:00 no necesita otro color, necesita otra sugerencia.
- Night usa el letrero como foto de hero: a las 2 a.m. la primera pregunta es "¿está abierto de verdad?" y el letrero prendido la contesta en un segundo. En mobile la foto es un acento (7.2): se recorta la palabra "Buccaneer" del neón con la línea de LED, no la fachada entera. El wordmark del header (Neon, en su placa) queda arriba de esa foto: es intencional, muestra que el logo es el letrero; la prueba de 5 segundos de Night lo valida (18). La plancha protagoniza el texto y la Order card (copy, no foto: Decisión 24.4). Si la sesión trae S07 (plancha de noche), se evalúa reemplazar el letrero en el hero Night y llevarlo solo a Visit; decisión en la Etapa B, con las dos fotos a la vista.
- "Breakfast time." deja de depender de Q1 (recalibrado, 20): el cartel del local dice "Breakfast All Day", así que de 05:00 a 10:59 la afirmación está respaldada.
- Los slugs de categoría salen del `page.tsx` v1. **Verificar cada string exacto contra la DB antes de implementar.**

### 3.2 Qué cambia y qué NO cambia

| Cambia con el estado | No cambia nunca |
|---|---|
| Paleta del hero, header, sticky bar y Close | Orden de las secciones y su contenido en el DOM |
| Foto del hero | El H1 y la línea fija "Open 24/7 · New York time" |
| Frase de estado | Dirección, teléfono, servicios, el número 408 |
| Título y deep link de la Order card | Los dos caminos (Order / Visit) y su posición |
| Qué Day chapter lleva la marca "Now" | Metadata, título, OG image |
| **Color del wordmark: Rooftop de día y Evening, Neon de noche** (recalibrado, 20) | El dibujo del wordmark, su tamaño y su posición |

Los **Day chapters llevan siempre su propia paleta**, sin importar la hora actual: el capítulo Morning es siempre papel, el Night siempre azul. Quien scrollea recorre el día completo y conoce el sistema entero en una visita. El hero muestra *ahora*; los capítulos muestran *el día*.

### 3.3 Mecánica (sin parpadeo, sin mismatch, LCP correcta)

1. **El servidor decide el estado y lo sirve.** La ruta se renderiza con `export const revalidate = 300`. En cada render el servidor calcula la hora de NY y emite `data-bd-state="morning|midday|evening|night"` en el wrapper `.bd-root`, y **la foto de ese estado sale del servidor con `priority` de `next/image` (eager + `fetchpriority="high"` + preload)**. Las otras tres fotos de hero salen con `loading="lazy"` y, al estar ocultas, nunca se descargan. Así la LCP está correcta en el HTML mismo, sin depender de JS (W4).
   - Calcular con `new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' })`. `hourCycle: 'h23'`, no `hour12: false` (algunos motores devuelven "24" a medianoche).
2. **Corrección en el cliente para HTML cacheado.** Con ISR, una página generada a las 15:58 puede servirse después de las 16:00 (stale-while-revalidate; con poco tráfico de madrugada, puede ser bastante más que 5 minutos). Un `<script>` inline de menos de 1 KB, primer hijo de `.bd-root`, recalcula el estado; si difiere del servido, reescribe `data-bd-state` en `document.currentScript.parentElement` e inyecta un `<link rel="preload" as="image" imagesrcset=… imagesizes=… fetchpriority="high">` para la foto correcta. Los `srcset` exactos de las cuatro fotos se generan en el servidor con `getImageProps()` y viajan al script como JSON. El wrapper lleva `suppressHydrationWarning`. En ese caso de borde la LCP es peor; es un caso de borde, no el normal.
   - Se descarta `force-dynamic`: un cold start serverless de madrugada en 4G cuesta más que el caso de borde.
3. **Override para QA y presentaciones:** `?at=0612` (HHMM). Lo lee solo el script inline (leer `searchParams` en el server volvería dinámica la ruta). Imprescindible para el visual-critic y para mostrarle al cliente los cuatro estados.
4. **El estado se fija al cargar.** Si la hora cruza un límite con la página abierta, se actualiza el reloj pero la paleta NO cambia en vivo. Se reevalúa en `visibilitychange` cuando la pestaña vuelve a estar visible.
5. **Las cuatro variantes del hero están en el DOM**, visible solo la activa vía CSS (`[data-bd-state="night"] .bd-hero__v--night`). Contenido indexable completo.
6. **El reloj** reutiliza la lógica de `LiveStatus.tsx` v1 (tick en borde de minuto, vacío en servidor) con el formato de la sección 10.3. Mientras está vacío, reserva su ancho (CLS 0).
7. **El wordmark es un SVG inline con `fill="currentColor"`** (recalibrado, 20). Su color sale de `color: var(--bd-wordmark)`, que cada paleta define (4.2). Cambiar de estado no descarga nada nuevo.

---

## 4. Paleta

> **Recalibrado (20):** entran Rooftop `#C8152A` y Neon `#FF5148` con rol cerrado de firma; Boulevard pasa de `#172645` a `#17225A`; Evening queda solo con la alternativa B; el pin del mapa pasa a Neon.
> **Gate #2 (21.1, 21.5, 21.8):** se corrigen las derivaciones (Yolk y Boulevard son elecciones, no muestras; el rojo del mantel no es Rooftop); la regla del rojo suma la medición solo de UI, la distancia mínima a Yolk, el aislamiento Neon/Yolk por componente y la matriz del header fijo sobre capítulos; el separador de LED se elimina. **Hex, pares prohibidos y tabla de contrastes sin cambios.**
> **Gate #3 (22.6):** la regla 7 se reformula: ningún componente del header usa Yolk como relleno ni como borde.
> **Decisión 24.1:** la regla 6 se mide desde la tinta roja, también con el header fijo. **Decisión 24.5:** foco Paper dentro del header y del footer en Sign. Hex, pares prohibidos y ratios sin cambios.

### 4.1 Dos colores de superficie, el blanco del plato y el rojo del nombre

| Token | Nombre | Hex | Relación con el local (sección 20.1) | Rol |
|---|---|---|---|---|
| `--bd-boulevard` | **Boulevard** | `#17225A` (antes `#172645`) | **Elegido, no muestreado.** Va en la dirección del LED azul de la cornisa y del "Diner" azul del cartel del techo, pero no es ninguno de los dos: el LED es un azul eléctrico saturado que como fondo de lectura vibra, y el cielo de hora azul en las fotos es violeta-índigo (`fachada-noche-neon.png`). El +9.8° de matiz respecto de la versión anterior lo acerca al LED sin copiarlo | Superficie 1. Tinta de día; fondo de noche. Azul, no negro. |
| `--bd-yolk` | **Yolk** | `#F2B33D` | **Marigold elegido, más cálido que el panel.** Los paneles del cartel son amarillo limón saturado; no se usa ese amarillo porque en pantalla, junto a rojo y azul, se lee como señal vial o como logo de cadena, y porque el nombre del token es la yema del desayuno, no el cartel | Superficie 2. Fondo del capítulo Evening y banda del hero Evening; **a la noche, solo lo accionable**. |
| `--bd-paper` | **Paper** | `#FAF4E6` | Caja de luz blanca del cartel del techo, paredes crema del salón | El neutro: fondo de día; tinta de noche. |
| `--bd-rooftop` | **Rooftop** | `#C8152A` | Letras góticas rojas pintadas sobre la caja de luz blanca del cartel del techo. Se calibra con S08 (4.4). (El mantel de papel imprime el nombre en gótico, pero en un rojo magenta-rosa †: el mantel prueba la forma de la letra, no el color) | **Firma de día.** Wordmark sobre Paper. Nada más. |
| `--bd-neon` | **Neon** | `#FF5148` | Tubo rojo de "Buccaneer" y "Diner" en la cornisa de vidrio negro. Elegido para leerse como tubo sobre Boulevard; en las referencias el tubo sale quemado a rosa o naranja, así que el valor se calibra midiendo el borde del tubo en S09 (4.4) | **Firma de noche.** Wordmark sobre Boulevard, pin del mapa. Nada más. |
| `--bd-harbor` | **Harbor** | `#4B5874` | — (derivado) | Tono secundario de Boulevard. Solo metadatos sobre Paper (≥14px). |
| `--bd-fog` | **Fog** | `#AEB6C8` | — (derivado) | Tono secundario de Paper. Metadatos y separadores sobre Boulevard (≥14px en texto). |

No hay gris neutro en el sistema. El texto secundario es siempre un tono de la tinta del estado.

**Por qué dos rojos y no uno.** Un mismo hex no puede cumplir sobre los dos fondos: para 4.5:1 sobre Boulevard el rojo necesita luminancia ≥ 0.265, y para 4.5:1 sobre Paper necesita ≤ 0.163. Son incompatibles. El local tiene el mismo problema resuelto igual: rojo pintado sobre blanco arriba, rojo de tubo sobre negro abajo. Los dos tokens están a 10° de matiz (Rooftop ~353°, Neon ~3°) y nunca se ven sobre el mismo fondo.

**Harbor** conserva su hex: queda a ~10° de matiz del nuevo Boulevard y solo aparece a 14px sobre Paper. Si en el specimen (18) se percibe desfasado, se le aplica el mismo +10° de matiz con luminancia 0.097 ± 0.003 y se recalcula su fila.

### 4.2 Asignación por paleta

| Paleta | Estados / bloques | Fondo | Tinta (texto, reloj) | Secundario | Botón sólido (relleno / texto) | Botón contorno (borde / texto) | Focus ring | Wordmark (`--bd-wordmark`) y su placa |
|---|---|---|---|---|---|---|---|---|
| **Day** | Morning, Midday | Paper | Boulevard | Harbor | Boulevard / Paper | Boulevard 2px / Boulevard | Boulevard 2px, offset 3px | Rooftop sobre placa Paper |
| **Lamp** | Evening | Paper, con banda Yolk a sangre detrás del bloque de texto del hero | Boulevard | Harbor (solo fuera de la banda; dentro de la banda no hay texto secundario) | Boulevard / Paper | Boulevard 2px / Boulevard | Boulevard 2px, offset 3px | Rooftop sobre placa Paper |
| **Sign** | Night | Boulevard | Paper | Fog | Yolk / Boulevard (fuera del header, ver regla 7) | Paper 2px / Paper | **Yolk 2px, offset 3px fuera del header y del footer; Paper 2px, offset 3px dentro del header y del footer** (Decisión 24.5) | Neon sobre placa Boulevard |

**Evening queda resuelto en B (recalibrado, 20; cierra W2).** La alternativa A ponía el header y su wordmark rojo sobre fondo Yolk. Rojo sobre amarillo es la combinación de la comida rápida y del canopy amarillo y rojo de la estación de servicio vecina, visible en `fachada-atardecer-2026.png`. **El capítulo Evening conserva el fondo Yolk**: ahí no hay wordmark.

Regla de pantalla: **de día, Paper + Boulevard; de tarde, Paper + Boulevard con la banda Yolk; de noche, Boulevard + Paper, y el Yolk aparece solo en lo accionable** (Order card, botón sólido de la sticky bar, botones sólidos de Visit, focus ring fuera del header y del footer). El reloj nocturno va en Paper, no en Yolk (W1): a la noche, si algo es amarillo, se toca.

**Regla del rojo (cerrada; puntos 6 a 8 agregados en gate #2, 21.5; punto 7 reformulado en gate #3, 22.6; punto 6 redefinido en la Decisión 24.1):**
1. Usos permitidos, lista completa: wordmark (header, footer, OG image), monograma (favicon, apple-touch-icon), pin del mapa de Visit. Ningún otro.
2. Rooftop solo sobre Paper. Neon solo sobre Boulevard. **Ningún rojo sobre Yolk ni sobre una foto sin su placa.**
3. **El rojo de la UI** ocupa como máximo el **3% del área del viewport** en cualquier captura. **Solo cuenta el rojo de la interfaz** (relleno de los SVG de wordmark y monograma, y el pin); el rojo que esté dentro de fotografías (el neón de S01, ketchup, tomates) no cuenta. Medición: se suma el área de relleno rojo de esos SVG a su tamaño renderizado (contando píxeles del SVG exportado solo) y se divide por el área del viewport. Referencia: lockup A a 116px ocupa ~1.1% de 375×667 en caja; su relleno real es menor.
4. Nunca como fondo, botón, link, subrayado, precio, alerta, badge, hover ni estado de error.
5. Sin brillo: sin `text-shadow`, `filter: drop-shadow`, blur, gradiente ni parpadeo que imite el neón. El neón se cita con el color, no con el efecto.
6. **Distancia mínima a Yolk: 24px, medida desde la tinta roja (Decisión 24.1).** Ningún píxel del relleno rojo del SVG (wordmark o monograma) queda a menos de 24px, en ningún eje, de un píxel Yolk. Se mide desde la tinta y no desde la placa, porque con el header opaco la placa es del mismo color que el header y no se ve. **Vale en flujo y con el header fijo sobre un capítulo**: el fondo opaco del header y su filete cuentan como separación. Cómo cumple cada viewport (posición vertical de la tinta dentro del header, medida desde el borde superior del header sin el safe-area inset):
   - **Mobile:** header 56px; lockup A a 116px, tinta de ~24px de alto en **y = 8–32**; filete en y = 56. Tinta a **25px** del Yolk que pase por debajo. Si el test de legibilidad sube el lockup a 132px (tinta ~27px), el header pasa a 60px y la tinta va en y = 9–36 (25px).
   - **Tablet:** header **64px**; lockup A a 132px, tinta de ~27px en **y = 10–37**; filete en y = 64. Tinta a **28px**.
   - **Desktop:** header 72px; lockup A a 156px, tinta de ~32px en **y = 16–48**; filete en y = 72. Tinta a **25px**. En el hero, la banda Yolk de Evening empieza en el inicio de la columna 8: la tinta queda a ≥ 500px (506 / 590 / 730 a 1280 / 1440 / 1920).
   - En flujo (hero mobile y tablet) los separa además la foto del hero (≥ 164px).
   - Si el SVG v1 tiene otra altura de tinta, se reubica la tinta para que siga a ≥ 24px; la medición final se hace sobre la captura de la Etapa B.
7. **Neon y Yolk no comparten componente. Ningún componente del header usa Yolk como relleno ni como borde**: el botón sólido del header usa la tinta del estado (Boulevard/Paper de día y Evening, Paper/Boulevard de noche, pares 13.5:1 ya verificados), y el link, el teléfono, la placa y **el anillo de foco** (Paper en Sign, Decisión 24.5) tampoco llevan Yolk. Lo que sí ocurre, y está permitido, es que en desktop Evening el header transparente pase por encima de la banda Yolk del hero (columnas 8–12): ahí sus componentes conservan su propio relleno y tinta (botón Boulevard 8.0:1 contra la banda; teléfono en Boulevard, 8.0:1), y la tinta Rooftop queda a ≥ 500px de la banda (regla 6). La sticky bar, la Order card, Visit y Close tienen Yolk de noche pero nunca el wordmark. Es el control del riesgo "logo de cadena" (wordmark rojo + botón amarillo sobre navy), que además se prueba en la Etapa B (18).
8. **Header y sticky bar fijos sobre capítulos de otra paleta.** El header (cuando es opaco) y la sticky bar son superficies sólidas del estado actual: sus pares internos son siempre los de su paleta (4.3) y nunca se mezclan con el fondo del capítulo que pasa por debajo. El único contacto es el borde, y se resuelve con un filete fijo: **1px en Boulevard** en el borde inferior del header Day/Lamp y **1px en Fog** en el del header Sign (la sticky bar lleva el mismo filete en su borde superior). Matriz de bordes:

| Header / sticky bar | sobre capítulo Paper | sobre capítulo Yolk | sobre capítulo Boulevard |
|---|---|---|---|
| **Paper** (Day, Lamp) | mismo fondo → el filete Boulevard marca el borde (13.5:1) | Paper vs Yolk 1.7:1 → el filete Boulevard marca el borde (13.5:1 vs Paper, 8.0:1 vs Yolk) | Paper vs Boulevard 13.5:1 |
| **Boulevard** (Sign) | Boulevard vs Paper 13.5:1 | Boulevard vs Yolk 8.0:1 | mismo fondo → el filete Fog marca el borde (7.3:1) |

El amarillo de la mañana no lo pone la interfaz: lo pone el plato. Yolk sobre Paper no tiene contraste y no se usa.

**El LED azul (gate #2, 21.8).** Se elimina el separador de puntos de LED: en Fog no citaba la luz real, y en el azul real sería un cuarto color saturado. El LED queda en la dirección de matiz de Boulevard y dentro de las fotografías (S01, S05a, S05b, S11).

### 4.3 Contrastes WCAG 2.x

Calculados con la fórmula de luminancia relativa de WCAG 2.x, a mano (sin herramienta ejecutable en esta sesión; verificados por el visual-critic en el gate #2). **Re-verificar con una herramienta en el primer prototipo**; si alguno difiere en más de 0.1, se corrige este documento.

Luminancias: Boulevard **0.0206** (antes 0.0200) · Yolk 0.5146 · Paper 0.9074 · Harbor 0.0973 · Fog 0.4663 · **Rooftop 0.1298** · **Neon 0.2761**.

**Texto (1.4.3 / 1.4.6):**

| Par | Ratio | Resultado | Uso permitido |
|---|---|---|---|
| Boulevard sobre Paper | **13.5:1** | AAA | Todo texto de día |
| Paper sobre Boulevard | **13.5:1** | AAA | Todo texto de noche, reloj nocturno; texto de botón sólido de día; "Diner" del lockup B de noche |
| Boulevard sobre Yolk | **8.0:1** | AAA | Todo texto de la banda Evening y del capítulo Evening; texto de botón sólido de noche |
| Yolk sobre Boulevard | 8.0:1 | AAA | **Sin uso como texto** (era el botón de Evening A, eliminada) |
| Fog sobre Boulevard | **7.3:1** | AAA | Metadatos de noche, ≥14px |
| Harbor sobre Paper | **6.5:1** | AA (no AAA) | Metadatos de día, ≥14px. Nunca para párrafos ni para la línea fija |
| **Rooftop sobre Paper** | **5.3:1** | AA | Wordmark de día (es logotipo: exento de 1.4.3, pero cumple igual) |
| **Neon sobre Boulevard** | **4.6:1** | AA | Wordmark de noche (exento como logotipo, cumple igual) |
| Rooftop sobre Boulevard | 2.5:1 | **FALLA** | **Prohibido** |
| Neon sobre Paper | 2.9:1 | **FALLA** | **Prohibido** |
| Rooftop sobre Yolk | 3.1:1 | Insuficiente | **Prohibido** (regla del rojo, 4.2) |
| Neon sobre Yolk | 1.7:1 | **FALLA** | **Prohibido** |
| Harbor sobre Yolk | 3.8:1 | **FALLA** | **Prohibido.** En fondo Yolk no hay texto secundario |
| Yolk sobre Paper | 1.7:1 | **FALLA** | **Prohibido** como texto, ícono o borde de control |
| Fog sobre Paper | 1.9:1 | **FALLA** | Prohibido |

**Controles, gráficos y estados (1.4.11, mínimo 3:1 contra lo adyacente):**

| Elemento | Par | Ratio |
|---|---|---|
| Botón sólido de día y de Evening | Boulevard vs Paper | 13.5:1 |
| Botón sólido de noche (fuera del header) | Yolk vs Boulevard | 8.0:1 |
| Botón sólido del header de noche | Paper vs Boulevard | 13.5:1 |
| Botón contorno de día / Evening (borde 2px) | Boulevard vs Paper | 13.5:1 |
| Botón contorno sobre la banda Yolk | Boulevard vs Yolk | 8.0:1 |
| Botón contorno de noche (borde 2px) | Paper vs Boulevard | 13.5:1 |
| Focus ring día / Evening / noche (fuera del header y del footer) | Boulevard / Boulevard / Yolk vs fondo | 13.5 / 13.5 (8.0 sobre la banda) / 8.0 |
| Focus ring dentro del header y del footer en Sign (Decisión 24.5) | Paper vs Boulevard | 13.5:1 |
| Pin del mapa | Neon vs fondo Boulevard del mapa; contorno Paper 2px | 4.6:1; contorno 13.5:1 |
| Marco de miniatura IA (1.5px) | tinta vs fondo | ≥8.0:1 |
| Placa del wordmark sobre foto | placa sólida; el contraste que cuenta es rojo vs placa | 5.3:1 / 4.6:1 |
| Separador continuo sobre Boulevard (7.0) y filete del header Sign | Fog vs Boulevard | 7.3:1 |
| Filete del header Day/Lamp | Boulevard vs Paper / Yolk | 13.5:1 / 8.0:1 |

Hairlines entre filas: tinta al 24% de opacidad (decorativas; el ítem se identifica por su texto y flecha). Los **separadores entre bloques del mismo color** no son hairlines decorativas: ver 7.0.

**Daltonismo:** azul/amarillo se conserva en deuteranopía y protanopía, y la diferencia de luminancia es de 8:1 o más en todos los pares de superficie, así que en tritanopía se separan por claridad. **El rojo pierde luminancia percibida en protanopía**; por eso nunca lleva información sola: el nombre está también como texto en el H1, el wordmark tiene `aria-label`, y el pin del mapa lleva contorno Paper de 2px (13.5:1) y la dirección escrita al lado. Ningún significado depende solo del color.

### 4.4 Calibración después de la sesión

La paleta está orientada por el letrero real (referencias). Con los RAW de la sesión se hace una sola calibración fina, sin agregar colores:
- **Neon:** se mide el matiz en S09 (frente prendido, exposición para el tubo) **en el borde del tubo, no en el núcleo**, con cuentagotas sobre 5 puntos promediados, en el archivo ya balanceado con la carta de gris (11). Si difiere más de 10° del de Neon (~3°), se corrige el matiz manteniendo luminancia ≥ 0.2761 (≥ 4.6:1 sobre Boulevard).
- **Rooftop:** igual sobre S08 (cartel del techo de día, letras rojas sobre la caja blanca). Corrección de matiz manteniendo luminancia entre 0.11 y 0.14 (≥ 5.0:1 sobre Paper).
- **Boulevard y Yolk:** no se calibran contra el local; son elecciones (4.1). Boulevard ya usó su margen de ±10°.
- Cualquier corrección se refleja en 4.1 y 4.3 con la fecha. Si hiciera falta algo más que un ajuste de matiz, se escala a Pedro.

### 4.5 Prohibido

Negro (`#000` o cualquier gris por debajo de L 10 como fondo), ámbar sobre negro, gris medio de texto, **rojo como superficie, botón, link o acento** (el rojo de la v1, Ketchup Ember, sigue fuera), **rojo sobre amarillo**, gradientes de dos colores en fondos, cromo, **glow de neón** (sombras, blur, halos), neón rosa, **el azul eléctrico del LED como color de UI**, **turquesa/verde agua** (era la línea de neón de la cornisa en 2019, `fachada-noche-2019.png`; hoy es LED azul: el turquesa ya no es del local), verde menta, el rosa y el violeta del damero de los manteles, el amarillo limón de los paneles, el naranja del vinilo de las butacas como token, cualquier cuarto color saturado.

---

## 5. Tipografía

> **Recalibrado (20):** el wordmark es el gótico del letrero, redibujado (5.6); ninguna fuente gótica se carga.
> **Gate #2 (21.2, 21.4, 21.7):** **Fraunces se reemplaza por Besley** (serif de rótulo de la familia Clarendon); se eliminan el numeral fantasma y su token; la escala sube la Order card y baja el reloj y la frase; el wordmark elige un dibujo canónico, suma test de legibilidad y deja de citar Cloister como base.
> **Gate #3 (22.2, 22.3):** la justificación de Besley por "la voz del cartel" queda condicionada a S08; la verificación 1 de la jerarquía se reformula por fondo.
> **Decisiones 24.2, 24.3 y 24.13:** rangos de viewport nuevos en la escala; Order card mobile de 88px; test de legibilidad también a 132px en tablet.

### 5.1 Display — Besley (Owen Earl / indestructible type*, Google Fonts, OFL 1.1)

- **Qué es:** serif de rótulo inspirada en los diseños de Robert Besley, el autor del Clarendon (1845). El Clarendon es la letra de los rótulos comerciales, carteles de madera y frentes de comercio estadounidenses: trazo grueso, serifas pesadas y bracketed, poco contraste.
- **Por qué reemplaza a Fraunces (21.7).** Fraunces con SOFT sobre crema y navy es hoy el look editorial que genera una IA por defecto, y no tiene ancla en el local. Besley es una **serif de rótulo americana** con licencia libre: el registro de los frentes de comercio de barrio, que es el registro del diner. Esa es la justificación que se sostiene sola, y con ella queda el sistema **gótico para el nombre, serif de rótulo para lo que se dice en voz de cartel (reloj, frases, títulos), grotesca para la interfaz**.
- **Condición S08 sobre "la voz del cartel" (gate #3, 22.3).** Un argumento adicional sería que la serif de los paneles del cartel ("Open 24/7", "Breakfast All Day") es de tipo Clarendon. **Eso no se da por hecho**: a la resolución de `fachada-atardecer-2026.png` y `fachada-dia-calle.png`, el texto de los paneles puede leerse también como una serif de texto de peso regular tipo Times. Regla: si S08 (toma extra a ≥ 200 mm de cada panel) muestra que la serif de los paneles es de tipo Clarendon o slab, se agrega como respaldo documentado; **si no, se retira el argumento "voz del cartel" y Besley queda justificada solo como serif de rótulo americana**. En ninguno de los dos casos se cambia de fuente por este motivo, y en ningún caso se intenta reproducir la fuente exacta del panel.
- **Carga:** `next/font/google`, `subsets: ['latin']`, solo romana (sin itálica), `display: 'swap'`. Si el variable de Google Fonts supera 90 KB, dos pesos estáticos (600 y 700). Total de fuentes de la ruta: máximo 120 KB. Verificar en la ficha el rango de pesos del variable y si conserva `tnum`; si no hay cifras tabulares, el reloj usa cajas de ancho fijo (5.3).
- **Pesos:** 600 (reloj), 700 (frase de estado, títulos de capítulo, `display-3`, horas de capítulo).
- **Cuándo:** reloj, frase de estado, títulos de capítulo, nombres grandes de grupo y platos de Dinner en Midday y Evening (`display-3`), horas de capítulo. Nada más.
- **Al lado del gótico:** Besley nunca comparte línea ni bloque con el wordmark, y el wordmark nunca aparece dentro del hero, los capítulos, Visit ni Close (5.6). Gótico y Clarendon conviven en los carteles comerciales estadounidenses desde el siglo XIX: es un par de rótulo, no dos épocas compitiendo.
- **Sin** itálica, sin "una palabra acentuada", sin Fatface ni versiones Narrow/Condensed.

### 5.2 Texto — Bricolage Grotesque (se conserva de la v1)

- **Carga:** ya la carga el root layout de MENIUS como `--font-display`. Cero bytes extra.
- **Pesos:** 400 (párrafos), 600 (botones, títulos de las tarjetas, nombres de grupo, H1, línea fija).
- **Cuándo:** todo lo que no es display ni wordmark.

### 5.3 Sin monoespaciada, sin gótica tipográfica

JetBrains Mono se elimina. El reloj no la necesita: cada dígito en una caja de ancho fijo (`display: inline-block; width: 0.62em; text-align: center`) si `font-variant-numeric: tabular-nums` no lo resuelve en Besley.

**Ninguna fuente blackletter se carga** (ni UnifrakturMaguntia, ni Pirata One, ni una Old English de Google Fonts). Ningún texto se compone en gótico: ni títulos, ni "Diner" suelto, ni números. El gótico existe solo como el SVG del wordmark.

### 5.4 Reglas de caja y etiquetas

- **Sentence case en todo.** Ninguna mayúscula sostenida, ningún tracking positivo. "OPEN 24/7" del cartel se escribe "Open 24/7".
- **No hay eyebrows ni labels de sección.** Su lugar lo ocupa la hora del capítulo.
- **Sin badge sobre el H1.**

### 5.5 Escala (mobile-first)

Rangos de viewport según la Decisión 24.2: mobile hasta 719px (y teléfonos en horizontal), tablet 720–1279, desktop 1280+.

| Token | Fuente / peso | Mobile 375–719 | Tablet 720–1279 | Desktop 1280+ | Leading | Tracking |
|---|---|---|---|---|---|---|
| `clock` (dígitos del reloj del hero) | Besley 600 | **32px** | 48px | 64px | 1.0 | -0.02em |
| `clock-suffix` ("a.m." / "p.m.") | Besley 600 | 16px | 20px | 24px | 1 | 0 |
| `open-line` ("Open 24/7") | Bricolage 600 | 16px | 17px | 18px | 1.35 | 0 |
| `display-1` (frase de estado) | Besley 700 | **26px**, máx. 2 líneas | 36px | 48px | 1.05 | -0.01em |
| `display-2` (título de capítulo) | Besley 700 | 30px | 40px | 52px | 1.05 | -0.01em |
| `display-3` (Midday: platos fuertes; Evening: platos de Dinner) | Besley 700 | 24px | 26px | 30px | 1.1 | -0.005em |
| `hour-mark` (hora de capítulo, sticky) | Besley 700 | 20px | 22px | 26px | 1.1 | 0 |
| `card-title` (título de Order card y Visit card) | Bricolage 600 | **20px** | 21px | 22px | 1.1 | -0.01em |
| `h1` (descriptor constante) | Bricolage 600 | **17px**, máx. 2 líneas | 19px | 21px | 1.3 | -0.01em |
| `row` (nombre de grupo en línea: Beverage, Appetizers, Bar, links de Night) | Bricolage 600 | 19px | 20px | 22px | 1.25 | -0.01em |
| `index` (subcategorías de Breakfast, platos de Appetizers) | Bricolage 400 | 17px | 18px | 19px | 1.4 | -0.01em |
| `body-lg` | Bricolage 400 | 18px | 19px | 20px | 1.5 | -0.011em |
| `body` | Bricolage 400 | **16px** (piso) | 17px | 17px | 1.55 | -0.011em |
| `meta` | Bricolage 400 | 14px (piso absoluto) | 14px | 15px | 1.45 | 0 |
| `button` | Bricolage 600 | 17px | 17px | 18px | 1 | 0 |

El token `hour-ghost` (numeral fantasma) **se elimina** (21.7). Medida de párrafo: máximo 58ch.

**Jerarquía del hero (21.4; verificación 1 reformulada en gate #3, 22.2; alto de card fijado en la Decisión 24.3), medible.** El reloj bajó de 48 a 32px, la frase de 32 a 26px, y la Order card subió de 72 a **88px en mobile** (dos líneas de título de 20px permitidas; 88 en tablet, 96 en desktop). Se exige y se verifica:
1. La Order card es **la forma rellena más grande dentro de su fondo** (dentro del fondo del hero en Morning, Midday y Night; dentro de la banda Yolk en Evening, donde la banda misma es el fondo y no cuenta) **y la mancha de mayor contraste en la prueba de desenfoque** (punto 3).
2. `card-title` (20px Bricolage 600) es el **texto de interfaz más grande del hero**; solo el reloj y la frase lo superan en tamaño, y son texto sin relleno.
3. **Prueba de desenfoque:** captura del hero en 375×548 con desenfoque gaussiano de 8px; la mancha de mayor contraste debajo de la foto es la Order card. Se adjunta en la entrega, para los cuatro estados. En desktop, la misma prueba en 1280×800 dentro de la columna de texto.
4. En la prueba de 5 segundos (18), a la pregunta "¿qué tocarías primero?" ≥ 4 de 5 señalan la Order card.

**El H1 se queda en 17px, justificado (21.4).** El H1 es semántico (SEO y lectores de pantalla: "Buccaneer, a 24-hour diner on Astoria Blvd, Queens.") y visualmente es el descriptor bajo la frase, como la línea chica de un cartel debajo del nombre. Agrandarlo pondría tres textos grandes (reloj, frase, H1) compitiendo con la Order card, que es lo que el gate pide evitar. Piso: nunca menos que `body` + peso 600, para que se lea como rótulo y no como párrafo.

### 5.6 Wordmark — el gótico del letrero, redibujado

> **Recalibrado (20):** reemplaza el wordmark provisorio en Fraunces (resuelve W7).
> **Gate #2 (21.2):** dibujo canónico = cartel del techo; origen de la "D" y la "i"; test de legibilidad con fallback; Cloister solo se consulta.
> **Decisiones 24.1 y 24.13:** posición vertical de la tinta en cada header; test de legibilidad repetido a 132px en tablet.

**Qué existe en el local (sección 20.1).** El nombre aparece en gótico en tres soportes, y **no son el mismo dibujo**:
- (a) **Frente:** "Buccaneer" y "Diner" como dos palabras separadas en neón rojo sobre la cornisa de vidrio negro. Son letras de canal con tubo: un gótico angular, de trazo casi uniforme, que es la traducción del gótico a tubo de neón.
- (b) **Cartel del techo:** caja de luz blanca con un gótico de tipo Old English **relleno y contrastado** (gruesos y finos), una "B" capital grande que abarca dos renglones, "uccaneer" en rojo arriba y "Diner" en azul oscuro abajo.
- (c) **Mantel de papel †:** "Buccaneer" en gótico relleno contrastado, del tipo del techo, en un rojo magenta (`plato-short-ribs-club.png`).

**Dibujo canónico: el del cartel del techo.** Razones: (1) es el único dibujo relleno; un wordmark de pantalla es relleno, y el tubo del frente a 24px de alto se vuelve una línea doble ilegible; (2) es el único soporte que tiene las nueve letras distintas de "Buccaneer Diner" (B, u, c, a, n, e, r, D, i) en un solo dibujo coherente; (3) † el mantel usa el mismo tipo de gótico, señal de que es la forma que el local usa en impresos (refuerza, pero la decisión se sostiene sin esta foto).

**Cómo se resuelven las diferencias con el frente.** No se mezclan: el frente no aporta ninguna forma de letra. Aporta solo (a) el color de noche (Neon, calibrado con S09) y (b) que el nombre se lee en una línea, que es el lockup A. El barrio reconoce las dos versiones como "el gótico del Buccaneer"; la prueba de 5 segundos (18) lo verifica.

**Tres piezas, todas del dibujo del techo:**

| Pieza | Letras | Composición | Usos |
|---|---|---|---|
| **Lockup A** | "Buccaneer" del techo | Una línea. La "B" es la capital del techo escalada a la altura de mayúscula de la línea; si su cola baja más del 20% de esa altura bajo la línea de base, se recorta a ese 20% (único cambio de forma permitido) | Header (todos los viewports) |
| **Lockup B** | "B" capital de dos renglones, "uccaneer" y **"Diner": la "D" y la "i" salen del "Diner" del cartel del techo** (S08) | Composición del techo tal cual | Footer, OG image |
| **Monograma** | La "B" capital del techo | "B" sola, centrada en cuadrado | favicon 32px, apple-touch-icon 180px, ícono 512px; fallback del header (abajo) |

**Colores:** "Buccaneer" (y la B) en `--bd-wordmark` (Rooftop de día y Evening, Neon de noche); "Diner" del lockup B en la tinta del estado (Boulevard sobre Paper, que repite el "Diner" azul del cartel; Paper sobre Boulevard). Monograma: Rooftop sobre Paper, siempre.

**Cómo se redibuja (procedimiento verificable):**
1. **v0, solo para maquetas internas (ya, sin esperar la sesión):** se traza el cartel del techo desde `fachada-noche-neon.png` (el cartel prendido, ~380px de ancho en la imagen original), contrastado con `fachada-dia-calle.png` para la silueta apagada. Corrección de perspectiva antes de trazar. Resolución baja: la v0 sirve para validar tamaño, placa y color, no el dibujo. Se rotula "wordmark v0 — from reference photo". El archivo de referencia no se copia a ningún lado.
2. **v1, la final:** desde S08 (cartel del techo, frontal, teleobjetivo, ≥ 3000px de ancho de cartel después de la corrección de perspectiva).
3. **Se dibuja la letra rellena del techo**, no el tubo del frente.
4. **A mano, con pluma (Figma o Illustrator).** Prohibido el autotrace (Image Trace / Potrace): redondea las puntas del gótico y deja nodos irregulares.
5. **Trazado del letrero; Cloister Black solo se consulta.** Donde la foto sea ambigua (reflejo, zona quemada), se puede mirar una gótica de cartel (Cloister Black, Old English) para entender la lógica del trazo. No se superpone ningún archivo de fuente al dibujo, no se copia ningún nodo ni contorno, y no se documenta como "basado en" ninguna fuente. El resultado es un dibujo del letrero del cliente.
6. **Correcciones para pantalla, y solo estas:** trazos finos engrosados hasta ≥ 7% del alto de la "B" (1.5px con el lockup A a 116px de ancho); contraformas de "a" y "e" abiertas lo necesario para que no se cierren a 116px; espaciado del par "cc" igualado; la cola de la "B" del lockup A según la tabla. Nada de estilizar, modernizar ni simplificar el gótico.
7. **Tolerancia:** superpuesto al 50% sobre la foto corregida de S08, los fustes no se desvían más del 2% del alto de la "B".
8. **Entrega:** SVG con paths, `fill="currentColor"`, ≤ 4 KB por lockup después de SVGO, `role="img"` y `aria-label="Buccaneer Diner"`. En el header, el SVG es el contenido de un link al tope de la página.

**Test de legibilidad (21.2; tablet agregado en la Decisión 24.13), pasa / no pasa:**
- **Dispositivo mobile:** iPhone real de 375pt de ancho (SE 2/3) y uno de 390pt, brillo automático, a 35 cm, sin zoom. **Dispositivo tablet:** iPad real en vertical a 768–834pt (iPad 10.ª gen o Air 11"), brillo automático, a 45 cm, sin zoom. No vale el emulador de escritorio.
- **Estímulos mobile:** lockup A en su placa a **116px** y a **96px** de ancho. **Estímulo tablet:** lockup A a **132px**. Siempre en las dos versiones (Rooftop sobre Paper y Neon sobre Boulevard), cada una mostrada 3 segundos, sin otro texto en pantalla.
- **Personas:** 5 fuera del equipo, que no hayan visto el sitio (pueden ser las mismas en mobile y tablet; el orden de dispositivo se alterna).
- **Pregunta:** "¿Qué dice?" Pasa si la persona lee "Buccaneer" (vale con errores de pronunciación, no de letras: "Buccaner" pasa, "Bucanero" o "Burger" no).
- **Umbral:** un tamaño y color pasa con **≥ 4 de 5** lecturas correctas.
- **Resultado y fallback mobile:**
  - 116px pasa en los dos colores → header mobile con lockup A a 116px; ancho mínimo absoluto del lockup A = el menor tamaño que pasó (96 o 116).
  - 116px falla en algún color → se prueba 132px. Si 132 pasa, ese es el tamaño mobile, y el header mobile pasa a 60px para mantener la tinta a 25px del Yolk (Decisión 24.1; el fold sigue ≤ 548, ver 7.2).
  - 132px también falla → **el header mobile usa el monograma** (36px de lado en su placa) y el nombre queda en texto en el H1.
- **Resultado y fallback tablet:** 132px pasa en los dos colores → lockup A a 132px en el header tablet. Falla en algún color → **monograma de 40px** en su placa, en la misma posición, y el nombre queda en texto en el H1. El desktop (156px) no se testea: su tinta es más grande que la de tablet.
- **Registro:** planilla con las 5 respuestas por estímulo, adjunta a la Etapa B.

**Tamaños y lugares (cerrado):**

| Lugar | Pieza | Ancho mobile / tablet / desktop | Fondo |
|---|---|---|---|
| Header | Lockup A en su placa (o monograma si falla el test) | **116 / 132 / 156px** | Placa del color de fondo del estado (7.1) |
| Posición de la tinta en el header (Decisión 24.1) | Lockup A | y = 8–32 en 56 / y = 10–37 en 64 / y = 16–48 en 72 | Tinta a ≥ 24px del borde inferior del header |
| Footer | Lockup B | 200 / 240 / 280px | Boulevard (paleta Sign) |
| OG image 1200×630 | Lockup B | 400px | Paper (10.4) |
| Favicon, touch icon | Monograma | 32 / 180 / 512px | Paper |
| Hero, Day chapters, frase 7.4, Visit, Close | **No aparece** | — | — |

- Aire libre alrededor: la mitad del alto de la "B" por lado, salvo abajo en el header, donde manda la distancia de 24px de la regla 6.
- El wordmark no se agranda en ningún lado como recurso gráfico (sin "logo gigante" en el footer ni en el hero).
- **Sin animación, sin brillo, sin contorno de tubo, sin cromo.** El cambio día/noche es un cambio de token al cargar el estado.

**Condición de la Etapa B:** wordmark v1 trazado desde S08, test de legibilidad hecho y registrado (mobile y tablet), y permiso del dueño para usar el lettering del letrero como logo del sitio (Q2). Si el dueño no da permiso, el header usa "Buccaneer Diner" en Bricolage 600 en la tinta del estado, y se escala a Pedro antes de la Etapa B.

---

## 6. Gramática de imagen: lo real va a sangre, lo compuesto va enmarcado

| | Fotos reales (sesión) | Composiciones IA de producto |
|---|---|---|
| Tamaño | Grande: a sangre en mobile, 5–8 columnas en desktop | Chico: miniatura de 72–96px (mobile), máximo 160px en desktop. Nunca más del 40% del ancho de su columna |
| Marco | Sin borde, radio 0 | Cuadrado 1:1, borde de 1.5px en la tinta del estado, radio 0, sin sombra |
| Dónde | Hero, apertura de capítulo, Night, Visit, Close (S10) | Solo dentro de los capítulos Midday (anatomía Plato) y Evening (anatomía Pizarra) |
| Movimiento | Reveal de scroll permitido | Nunca se animan |
| Video | Solo la fachada (S02) | Nunca |
| Contexto | Manos, gente, salón permitidos (con consentimiento) | Plato solo sobre pizarra. Nunca manos, gente, mesa puesta, salón |

**Tratamiento en modo claro (decisión):** la composición IA **no cambia de imagen** entre estados (no se recolorea ni se le aplica duotono: teñir comida la vuelve inapetente y la hace más "diseñada", que es lo contrario de honesto). Cambia el marco: sobre Paper o Yolk, la pizarra oscura queda como un objeto cuadrado con borde Boulevard y se lee como una tarjeta de pizarra de menú, no como una ventana a la realidad. El contraste de tamaño con las fotos reales hace el resto: lo grande es el lugar, lo chico es el catálogo.

**Disclosure:** al pie de cada capítulo con miniaturas IA y en el footer, en `meta`: "Framed thumbnails are styled product compositions." Una foto real de la sesión reemplaza a su IA y pierde el marco.

**Fotos reales sin filtros por estado.** No se tiñen. La luz del turno la pone la toma. **Qué es filtro y qué no (21.1):** filtro es cualquier tinte, duotono, LUT o gradación de estilo, y cualquier corrección distinta por estado. **No es filtro** el balance de blancos tomado de la carta de gris de cada serie (11), aplicado igual a todas las tomas de esa serie y registrado en la planilla de entrega; es una corrección técnica para que la cámara no invente un color que no estaba (por ejemplo, el violeta de la hora azul sobre el revestimiento beige).

**Placeholders:** donde falte una toma real, rectángulo en la tinta al 10% con el ID ("S01 — facade at night, sign on") en `meta`. Nunca stock de otros diners. **Nunca las fotos de referencia de Google Maps** (sección 20.5), ni siquiera en maquetas internas.

**El material de identidad del local entra solo por fotografía documental** (recalibrado, 20): lo náutico, lo greco-americano, la rockola, los manteles y las butacas aparecen porque están en el cuadro de una toma real, en los lugares fijados en 20.4. Ninguno se convierte en ícono, ilustración, patrón, textura ni color.

---

## 7. Estructura

> **Decisión 24.2:** cortes de viewport definitivos y alcance del scroll container. **Decisión 24.12:** margen y tope de contenido por encima de 1280.

**Cortes de viewport (Decisión 24.2):**

| Layout | Rango | Condición adicional |
|---|---|---|
| **Mobile** | ancho ≤ 719px | — |
| Mobile horizontal | 720–1279px de ancho **y** alto ≤ 500px en horizontal | Teléfonos en horizontal (667–932 de ancho): layout mobile con la regla horizontal de 7.1 y 8 |
| **Tablet T1 "stack"** | 720–1023px | alto > 500px |
| **Tablet T2 "split"** | 1024–1279px | alto > 500px. Composición split (foto a sangre a la izquierda, texto a la derecha) **con el header apilado y opaco de tablet**, no el transparente de desktop |
| **Desktop** | ≥ 1280px | cualquier alto (el hero tiene mínimo de 712) |

**Scroll container (iOS) en esta ruta:** el scroll vive en `.root-scroll` (no en el root) cuando `(max-width: 767px)` **o** `(pointer: coarse)`, a cualquier ancho. Así lo reciben todos los teléfonos y todos los iPad, incluido un iPad Pro de 13" en horizontal (1366, layout desktop). La regla global de MENIUS (`globals.css`, `max-width: 768px`) no se toca; la extensión vive en `buccaneer.css`. El JS que lee o mueve el scroll se gatea con el mismo `matchMedia`. En desktop con mouse, el scroll sigue en el documento.

Grid desktop de 12 columnas (gutter 24px, margen 64px a 1280; a 1280px cada columna mide ~74px); **por encima de 1280, margen = el mayor de 64px, 5% del ancho y (ancho − 1536) / 2, con tope de contenido de 1536px**; lo que sangra (foto del hero, foto de Midday, franja de Morning, video de Visit, bandas Yolk) sigue llegando al borde de la ventana; por encima de 1920 la composición se congela en un marco de 1920 centrado y los fondos siguen a todo el ancho (Decisión 24.12). Tablet 8 columnas (gutter 20px, margen `max(32px, env(safe-area-inset-left/right))`); mobile 4 columnas (gutter 16px, margen `max(20px, env(safe-area-inset-left/right))`). Spacing: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`. Ratios: 4:5 (fotos verticales), 3:2 (fachada, salón), 4:3 (tríptico), 3:1 (franja de Morning desktop), 21:9 (video de Visit tablet y desktop), ~2.3:1–2.0:1 (banda del hero mobile), 2.4:1–3.5:1 (banda del hero tablet T1), 1:1 (miniaturas IA y corte del video del hero Night desktop).

**Orden y fondos:**

| # | Bloque | Fondo |
|---|---|---|
| 1 | Header | del estado actual |
| 2 | Now (hero) | del estado actual |
| 3 | Day chapter Morning | Paper |
| 4 | Day chapter Midday | Paper |
| 5 | Day chapter Evening | Yolk |
| 6 | Day chapter Night | Boulevard |
| 7 | Una frase (408) | Paper |
| 8 | Visit | Boulevard |
| 9 | Close | del estado actual |
| 10 | Footer | Boulevard |

### 7.0 Separador entre bloques del mismo color (W6)

> **Gate #2 (21.8):** se elimina la fila de puntos de LED; vuelve el filete continuo en los dos fondos.

Siempre que dos bloques contiguos tengan el mismo fondo (Now + Morning en los estados Morning, Midday y Evening; Morning + Midday siempre; Visit + Close de noche; Close + footer de noche), se marca el corte con un **filete a sangre de 2px**: Boulevard al 100% sobre Paper, Fog al 100% sobre Boulevard. Además, 96px de aire (mobile 64px) antes de la hora del bloque siguiente. No se usan franjas de color intermedio ni cambios de tono del fondo: el corte sigue siendo seco.

### 7.1 Header (fijo, paleta del estado actual)

> **Gate #2 (21.3, 21.5):** en mobile y tablet el header se apila sobre la foto (no la tapa); filete inferior fijo; sin Yolk en el header.
> **Decisiones 24.1, 24.5, 24.8 y 24.9:** alto del header por viewport y posición de la tinta; foco Paper en Sign; hora sticky con la paleta del capítulo y su alto; presupuesto de cromo; objetivos de 48px.

- **Alto:** `calc(56px + env(safe-area-inset-top))` mobile (60 + inset si el test de legibilidad sube el lockup a 132px), **`calc(64px + env(safe-area-inset-top))` tablet**, 72px desktop. Padding lateral con `max(20px, env(safe-area-inset-*))` en mobile y `max(32px, …)` en tablet.
- **Mobile y tablet: opaco desde el primer píxel, apilado.** El header ocupa la parte superior y la foto del hero empieza debajo; el header nunca tapa la foto. Así la banda de foto se ve entera (7.2) y no queda un letterbox de 4:1.
- **Desktop: transparente sobre el hero, opaco al salir.** Al salir el sentinel `#bd-top-sentinel`, aparece el fondo del estado por **`opacity` de un `::before`** (no transición de `background-color`). Mientras es transparente, el wordmark queda sobre la columna de foto y el resto sobre la columna de texto; la placa garantiza el contraste del rojo. Las fotos desktop del hero reservan sus 72px superiores sin sujeto, y además el área bajo la placa (11). Si la página carga a mitad del scroll, el header arranca opaco.
- **Tinta del wordmark y regla 6 (Decisión 24.1):** la tinta va en y = 8–32 (mobile, 56), y = 10–37 (tablet, 64) e y = 16–48 (desktop, 72): siempre a ≥ 24px del borde inferior. Los elementos de la derecha se centran verticalmente en el centro de la tinta, no en el del header.
- Izquierda: **lockup A del wordmark dentro de su placa** (o el monograma, según el test de 5.6). Derecha mobile: link de texto "Order" (Bricolage 600, subrayado 2px) en una placa igual, área táctil 48 × ≥ 64. **Derecha tablet y desktop:** "(718) 429-5188" (`tel:`, texto subrayado, área táctil 48 de alto) + "Order online" (**sólido en la tinta del estado**, nunca Yolk; regla 7 de 4.2; **48px de alto**).
- **La placa** es un rectángulo sólido del color de fondo del estado (Paper en Day y Lamp, Boulevard en Sign), radio 0, sin sombra ni borde, padding 6px × 10px en mobile y tablet y 8px × 12px en desktop. Con el lockup A a 116px, la placa mobile mide ~136 × 36px; a 132px en tablet, ~152 × 39px; a 156px en desktop, ~180 × 48px. Origen: la caja de luz blanca del cartel del techo (día) y el vidrio negro de la cornisa (noche). En mobile y tablet coincide con el fondo del header; en desktop es lo que separa el rojo de la foto.
- **Foco (Decisión 24.5):** anillo de 2px a 3px del elemento, en Boulevard (Day/Lamp) o **Paper (Sign)**. Nunca Yolk en el header.
- **Filete inferior de 1px** cuando el header es opaco: Boulevard en Day/Lamp, Fog en Sign (matriz en 4.2, regla 8).
- Sin hamburguesa, sin nav, sin hide-on-scroll.
- **Teléfonos en horizontal** (layout mobile horizontal, 7): header de 56, la hora sticky deja de ser sticky (pasa a `position: static`) y no hay sticky bar (8).

**Presupuesto de cromo fijo (Decisión 24.8).** Cromo fijo = header + hora sticky + sticky bar, medido mientras se lee un capítulo:

| Viewport de control | Header | Hora sticky | Sticky bar | Total | Tope |
|---|---|---|---|---|---|
| 375×548 (iPhone SE) | 56 | **32** | 72 | **160 (29.2%)** | **≤ 30%** |
| 390×664 (iPhone con home indicator) | 56 | 32 | 94 | 182 (27.4%) | ≤ 30% |
| Teléfono horizontal (ej. 667×375) | 56 | 0 (static) | 0 (oculta) | 56 (15%) | ≤ 30% |
| 768×920 visible (tablet T1) | 64 | 40 | — | 104 (11.3%) | **≤ 15%** |
| 1024×700 visible (tablet T2 horizontal) | 64 | 40 | — | 104 (14.9%) | ≤ 15% |
| 960×540 visible (tablet corto) | 64 | 0 (static) | — | 64 (11.9%) | ≤ 15% |
| 1280×800 (desktop) | 72 | 48 (solo en la columna de texto) | — | 120 (15%) | **≤ 15%** |

Si en implementación algún alto crece (fuente de fallback, inset), lo primero que se ajusta es el padding de la hora sticky, nunca el header ni los botones de la barra.

### 7.2 Now (hero, depende del estado)

> **Decisión 24.3:** Order card mobile de 88px, fold recalculado. **Decisión 24.2:** tablet T1/T2 en vez de "pasa al desktop a 1024".

Tiene que pasar la prueba de los 3 segundos a cualquier hora: **qué es** (wordmark + H1 + foto), **que está abierto** (reloj + línea fija "Open 24/7", visible en los cuatro estados), **qué pedir ahora** (frase de estado + Order card).

**La foto mobile es un acento (21.3).** En 375×548 no hay lugar para una foto que muestre el cartel entero y además las tarjetas. Decisión: la banda mobile muestra **un detalle identificable**, no la escena: el plato en los estados de día y Evening, la palabra "Buccaneer" del neón con la línea de LED en Night. La fachada entera vive en Visit y en tablet/desktop.

**Presupuesto del fold mobile (B1; cifras corregidas y escala nueva en gate #2; tarjetas de 88 en la Decisión 24.3).** Regla dura: **el borde inferior de las tarjetas Order/Visit queda a ≤ 548px del borde superior del viewport**, que es el alto visible de un iPhone SE (375 de ancho) con las barras de Safari desplegadas. Se mide en dos tamaños: **375×548** (peor caso) y **390×664** (iPhone 13/14 con barras). El header se apila (7.1): su alto suma.

| Elemento | Alto en 375×548 | Alto en 390×664 | Regla |
|---|---|---|---|
| Header (apilado, opaco) | 56 | 56 | wordmark y "Order" en sus placas |
| Foto (banda a sangre, debajo del header) | 164 | 199 | `height: clamp(164px, 30svh, 200px)`; ~2.3:1 en 375 y ~2.0:1 en 390, `object-position` por foto, sujeto dentro del 60% central |
| Aire | 12 | 12 | |
| Reloj ("2:14" + "a.m.") | 32 | 32 | `clock` 32px × leading 1.0 |
| Aire | 4 | 4 | |
| Línea fija "Open 24/7 · New York time" | 22 | 22 | 1 línea; "Open 24/7" en `open-line` y tinta plena; "· New York time" en `meta` secundario. **Nunca se omite en ningún estado** |
| Aire | 10 | 10 | |
| Frase de estado | 55 | 55 | `display-1` 26px × 1.05, presupuestada a 2 líneas |
| Aire | 6 | 6 | |
| H1 | 44 | 44 | `h1` 17px × 1.3, **máximo 2 líneas** a 335px (≤ 52 caracteres) |
| Aire | 12 | 12 | |
| Tarjetas Order / Visit | **88** | **88** | 50/50, gap 8px; alto **fijo** de 88 en los cuatro estados (las dos iguales); título `card-title` 20px de hasta 2 líneas + línea `meta` |
| **Borde inferior de las tarjetas** | **505** | **540** | **≤ 548 en ambos** (43px y 8px de margen) |

Suma verificada: 56+164+12+32+4+22+10+55+6+44+12+88 = 505; con foto de 199, 540. (Con header de 60 por el fallback de 5.6: 509 y 544, siguen ≤ 548.) Historial: la tabla de gate #2 daba 497 / 532 con tarjetas de 80; la anterior a esa sumaba 508 y 526, no 512 y 530.

Si en implementación algún elemento crece (fuente de fallback, frase más larga), lo que se achica primero es la foto (hasta 128px) y nunca las tarjetas, la línea fija ni el reloj. Verificación: captura en 375×548 con una línea guía a 548px, adjunta en la entrega al visual-critic, para los cuatro estados, más la prueba de desenfoque de 5.5.

**Mobile, de arriba a abajo:**

```
┌───────────────────────────────┐ 0
│ [Buccaneer]            [Order]│ header 56, opaco, apilado; tinta y 8–32
├───────────────────────────────┤ 56
│   FOTO REAL DEL ESTADO        │ banda 164–199, detalle, sin texto
├───────────────────────────────┤ 220–255
│ 2:14 a.m.                     │ reloj 32px
│ Open 24/7 · New York time     │ línea fija, todos los estados
│ Up late? So are we.           │ frase de estado, 26px
│ Buccaneer, a 24-hour diner on │ H1, 17px, máx. 2 líneas
│ Astoria Blvd, Queens.         │
│ ┏━━━━━━━━━━━━━┓┌────────────┐ │
│ ┃Order        ┃│Come in    →│ │ tarjetas 88px, título 20px
│ ┃breakfast   →┃│            │ │ (hasta 2 líneas)
│ ┃Pickup or del┃│9301 Astoria│ │
│ ┗━━━━━━━━━━━━━┛└────────────┘ │ 505 (≤ 548)
│ Full menu — 408 dishes →      │ (debajo del fold, permitido)
└───────────────────────────────┘
```

- **Foto sin scrim y sin texto encima.** En mobile y tablet nada se apoya sobre ella.
- **Evening:** la banda Yolk va a sangre detrás del bloque que empieza en el reloj y termina 16px debajo de las tarjetas; la foto queda arriba, entre el header y la banda (≥ 164px de separación entre la tinta y el Yolk, regla 6 de 4.2).
- **Tarjetas Order / Visit:** mismo ancho, alto, tipografía y posición. Order es sólida (relleno de acción del estado); Visit es contorno de 2px. Cada una: título en `card-title`, una línea en `meta`, flecha. Order lleva al deep link del estado; Visit abre `https://maps.google.com/?q=9301+Astoria+Blvd,+East+Elmhurst,+NY+11369` en nueva pestaña. El bloque lleva `id="bd-hero-cta"`. **Ninguna tarjeta lleva foto** (Decisión 24.4).
- Debajo de las tarjetas, `meta`: "Full menu — 408 dishes →" a `menius.app/buccaneer` (área táctil 48).

**Tablet (720–1279, Decisión 24.2):** header apilado de 64. **T1 (720–1023):** banda de foto `clamp(220px, 30svh, 320px)` (2.4:1 a 3.5:1; sujeto en el 45% vertical central, 11); mismo orden que mobile; tarjetas 50/50, máximo 560px de ancho total, 88px de alto. **T2 (1024–1279):** foto a sangre a la izquierda (columnas 1–4) y texto a la derecha (columnas 5–8), alineado abajo, con el header apilado (no transparente). Regla tablet: el borde inferior de las tarjetas queda a ≤ alto visible − 24px en 720×760, 768×920, 840×700 y 1024×700; si no cierra, se achica primero la foto (hasta 128).

**Desktop (1280+):** split asimétrico. Foto a sangre desde x = 0 hasta el **inicio de la columna 8** (incluye el gutter 7/8), alto `calc(100svh)` con el header transparente encima, mínimo 712px; el sujeto empieza debajo de los 72px superiores. Texto desde el inicio de la columna 8 + 24px hasta el fin de la columna 12, alineado abajo, mismo orden que mobile; tarjetas de 96px de alto. Nada centrado. En Evening, la banda Yolk ocupa desde el inicio de la columna 8 hasta el borde derecho, a todo el alto del hero.

### 7.3 Day chapters (cuatro capítulos, cuatro anatomías)

> **Gate #2 (21.6, 21.7):** Midday y Evening dejan el directorio de filas y pasan a anatomías propias (Plato y Pizarra); se elimina el numeral fantasma; cada capítulo tiene composición desktop propia.
> **Gate #3 (22.1, 22.4):** la Pizarra de Evening pasa de tres grupos iguales a una jerarquía: Dinner principal, Appetizers y Bar secundarios con tratamientos distintos entre sí; los once platos se confirman a mano contra la DB antes de la Etapa B.
> **Decisiones 24.1, 24.6, 24.8, 24.9, 24.10, 24.12 y 24.15:** hora sticky con la paleta del capítulo; S05a; objetivos de 48px y línea corrida de Bar; D05 desktop con alto derivado en las columnas 8–12; reglas de aire y de D09; lugar del título "Dinner."; cifra de Dinner/Appetizers en mobile.

Orden fijo en el DOM: **Morning → Midday → Evening → Night**. Cada capítulo con su paleta propia y corte seco. Todos comparten **un solo** elemento: la **hora sticky** (`hour-mark`, `position: sticky` bajo el header; la del capítulo siguiente empuja a la anterior; funciona dentro de `.root-scroll`). Es la línea de tiempo del recorrido. El capítulo de la hora actual lleva junto a su hora "Now — 2:14 a.m." en Bricolage 600 (texto, no pastilla).

**La hora sticky (Decisiones 24.1 y 24.8), igual regla en los tres viewports:** es una tira del **color del capítulo** (Paper, Yolk o Boulevard, nunca la paleta del estado), pegada bajo el header, con un hairline inferior de 1px en la tinta del capítulo al 24%. Alto: **32px mobile** (20px de texto + 6 arriba y abajo), **40px tablet**, **48px desktop** (y en desktop ocupa solo la columna de texto del capítulo; en Morning es la cabeza entera de las columnas 1–4, sin tira). En teléfonos horizontales y en tablet corto deja de ser sticky. La regla 6 se cumple por la posición de la tinta en el header (7.1), no por la tira.

**Objetivos táctiles (Decisión 24.9):** **todo** link o botón de la página mide **≥ 48px de alto** en los tres viewports (índice, platos, "All N →", "Beverage (22) →", "On the side", línea de Bar, línea de Night, "Full menu", botón del header). Donde el diseño escribe 44, vale 48. Separación mínima entre objetivos contiguos: 8px.

**Cada grupo del menú aparece en un solo capítulo** (B3). Los 12 grupos (sin "Popular items") se reparten así:

| Capítulo | Paleta | Hora sticky | Título | Bajada | Anatomía | De qué objeto del diner sale | Grupos (sin repetir) |
|---|---|---|---|---|---|---|---|
| Morning | Day | "5 a.m." | "Mornings." | "Breakfast all day." | **Índice** | El índice de una carta de diner | Breakfast (81) · Beverage (22) |
| Midday | Day | "11 a.m." | "Middle of the day." | "Our picks for this part of the day." | **Plato** | El plato del mediodía: un principal y lo que va al costado | Burgers (19) · Lunch (62) · Salads & Soups (21) · Sides (24) |
| Evening | Lamp (fondo Yolk) | "4 p.m." | "Dinner." | "Our picks for this part of the day." | **Pizarra** | La pizarra de la cena: el plato del día arriba y en grande, lo demás al costado | Dinner (68) · Appetizers (21) · Bar (47) |
| Night | Sign | "10 p.m." | "After dark." | "Our picks for this part of the day." | **Par** | La vitrina de postres | Desserts (19) · The Bake Shop (8) · From the Fountain (6) · Smoothies & Shakes (10) |

Total: 12 grupos, 408 platos, cero repeticiones. **Deep links:** verificar con el dev si `?category=` acepta el nombre del grupo; si no, cada link de grupo apunta a la primera subcategoría del grupo en la DB (para Burgers, `7 oz. Certified Angus Beef Burgers`; para Breakfast, `Buttermilk Pancakes`; para Dinner, `Seafood` si es subcategoría de Dinner; el resto se confirma contra la DB, no se adivina). Si existe un deep link a producto en menius.app, los platos de la Pizarra lo usan; si no, apuntan a su subcategoría.

La bajada de cada capítulo es una sugerencia, no disponibilidad. Nunca "served until" ni "only at". Morning dice "Breakfast all day." porque es la frase del cartel y aclara que "5 a.m." marca dónde empieza el día, no hasta cuándo hay desayuno.

**Las cuatro anatomías no comparten estructura de contenido:** Índice = solo palabras; Plato = dos principales grandes y una línea; Pizarra = un grupo principal con cinco platos grandes y dos secundarios de tratamiento distinto entre sí; Par = dos fotos reales. Ninguna es una lista de filas uniformes "nombre + conteo + miniatura + flecha", y ninguna es una grilla de tarjetas iguales.

**Regla de aire interno en desktop (Decisión 24.12).** En las columnas ancladas (cabeza arriba, cierre en la base de la foto vecina: Midday, Night, Close), el aire entre la cabeza y el cierre mide **≤ 256px en 1280–1920**. Si se pasa, la foto vecina limita su alto a `100svh − 120px` (header + hora sticky) recortando de su máster con `object-fit: cover`; si aún se pasa, se recorta más hasta cumplir. Nunca queda aire debajo del último elemento de una columna (D11).

#### A. Índice — Morning (Paper)
- **Mobile:** 1. Hora sticky. 2. Título `display-2` y bajada "Breakfast all day." en `body-lg`. 3. Foto real D02 a sangre, 4:5. 4. **Índice tipográfico** de las subcategorías de Breakfast (las de la DB: Buttermilk Pancakes, Belgian Waffles, French Toast, 3 Egg Specialty Omelettes, Egg Omelettes, The Benedict, Farm Fresh Eggs, Hand Rolled Water Bagels, Greek Yogurt, Juices; verificar la lista completa), en `index`, en una grilla de dos columnas desde 360px, cada celda con un punto medio inicial y hairline inferior, cada nombre es un link de **48px** de alto mínimo. Debajo, "All 81 breakfast dishes →". 5. Una línea de link para Beverage: "Beverage (22) →" en `row`. Sin miniaturas IA.
- **Tablet:** foto 3:2 a sangre; índice a tres columnas.
- **Desktop — "Índice ancho y franja":** hora, título y bajada en las columnas 1–4 (columna fija mientras se lee el índice); el índice en las columnas 5–12 a tres subcolumnas, orden por columna, filas de ≥ 48px; Beverage debajo del índice en 5–12; **cierra el capítulo D02 como franja a sangre de lado a lado, 3:1** (recorte de la toma 3:2, plato en el tercio central). Es el único capítulo cuya foto cruza las 12 columnas.

#### B. Plato — Midday (Paper)
- **Mobile:** 1. Hora sticky. 2. **Foto primero**: **S05a** barra, 4:5 a sangre (invierte el orden de Morning para que el corte entre dos capítulos Paper se perciba). 3. Título y bajada. 4. **Dos principales**, Burgers (19) y Lunch (62): cada uno es un link-bloque de mínimo 112px de alto con miniatura IA enmarcada de 88px a la izquierda, nombre en `display-3` (Besley 700, 24px), debajo el conteo en `meta` ("19 dishes →"). Hairline entre los dos. 5. **Una línea "al costado"** en `body-lg`: "On the side: Salads & Soups (21) · Sides (24)." con cada grupo como link de **48px** de alto. Sin miniaturas en esa línea. 6. Disclosure.
- **Tablet:** foto 3:2 a sangre; los dos principales lado a lado (50/50) con miniatura de 96px arriba del nombre.
- **Desktop — "Foto a la derecha, a sangre":** S05a 4:5 desde el **inicio de la columna 8 hasta el borde derecho de la ventana** (sin margen derecho), alineada arriba con la hora: es el espejo exacto del hero sobre el mismo eje. Columnas 1–6: cabeza arriba (hora, título, bajada) y, anclados a la base de la foto, los dos principales apilados (miniatura de 140px, 160 a 1920; nombre `display-3` 30px) y la línea "On the side". Columna 7 vacía. Aire entre cabeza y platos según la regla de aire interno (a 1920, S05a limita su alto). Es el único capítulo con foto que sangra a la derecha.

#### C. Pizarra — Evening (fondo Yolk)

**Jerarquía (gate #3, 22.1).** Dinner es el principal: es el grupo que da nombre al capítulo y al turno, y el más grande de los tres (68 platos). Appetizers y Bar van al costado, más chicos, y **distintos entre sí**. Criterio de aceptación: **ningún par de grupos comparte a la vez ancho, alto y tratamiento**, en ningún viewport.

| Grupo | Rol | Encabezado | Miniatura IA | Platos que muestra | Tratamiento de los platos | Cierre |
|---|---|---|---|---|---|---|
| **Dinner (68)** | Principal | El título del capítulo, "Dinner.", hace de encabezado del grupo (no se repite la palabra) | Sí: 96px mobile / 120px tablet / 160px desktop | **5** | Uno por línea, en `display-3` (Besley 700), cada uno un link de ≥ 48px (filas de 56 en desktop) | "All 68 dinner dishes →" en `row`, 48px |
| **Appetizers (21)** | Secundario | Nombre en `row` (Bricolage 600) | Sí: 72px en todos los viewports | **3** | Uno por línea, en `index` (Bricolage 400), cada uno link de 48px | "All 21 →" en `meta`, 48px |
| **Bar (47)** | Secundario | Nombre en `row` (Bricolage 600) | **No** | **3** | **Línea corrida** en `body`: los tres platos como links en una fila con `flex-wrap`, cada link de **48px de alto** y ≥ 48px de ancho, separados por un punto medio no interactivo (`aria-hidden`) que deja ≥ 8px entre objetivos. **Máximo 1 fila en tablet T2 y desktop; máximo 2 filas en mobile y tablet T1** (Decisión 24.9) | "All 47 →" en `meta`, 48px |

Todo el texto en Boulevard (en Yolk no hay secundario). Hairline Boulevard al 24% entre grupos. Disclosure al pie.

**Dónde va el título "Dinner." (Decisión 24.12):** siempre arriba del grupo Dinner, después de la hora sticky. Mobile y tablet T1: título y bajada a todo el ancho, el bloque de Dinner debajo. Tablet T2: título y bajada en las columnas 1–3, la miniatura y los platos de Dinner en las columnas 4–8. Desktop: título y bajada encabezan las columnas 1–6.

- **Mobile:** 1. Hora sticky. 2. Título "Dinner." en `display-2` y bajada. 3. **Dinner:** miniatura de 96px alineada a la izquierda bajo la bajada; los cinco platos en `display-3` 24px; "All 68 dinner dishes →". 4. Hairline. 5. **Appetizers:** miniatura de 72px y nombre en la misma línea; tres platos uno por línea; "All 21 →". 6. Hairline. 7. **Bar:** nombre; los tres platos en la línea corrida (hasta 2 filas); "All 47 →". 8. Foto D05 4:5 a sangre (cierra el capítulo). 9. Disclosure. Los tres grupos comparten el ancho de la columna, pero no alto ni tratamiento: **Dinner mide ~1.6 veces el alto de Appetizers** con los objetivos de 48px (Decisión 24.15; la cifra anterior de 2.5 no se sostenía), y Bar es el más bajo y el único sin miniatura.
- **Tablet (8 columnas):** T1: Dinner a todo el ancho arriba (miniatura de 120px a la izquierda en columnas 1–2, platos en columnas 3–8). Debajo, Appetizers en columnas 1–4 y Bar en columnas 5–8, alineados arriba: comparten ancho, pero no alto ni tratamiento. D05 a sangre al final, a todo el ancho (recorte 2:1 del 3:2). T2: como T1, con el título en columnas 1–3 (ver arriba).
- **Desktop — "Plato del día y costado" (Decisión 24.10):** **manda la columna de Dinner**.
  - **Columnas 1–6, Dinner:** hora sticky, título "Dinner." y bajada, miniatura de 160px, cinco platos en `display-3` 30px en filas de 56px (sin filetes entre platos), "All 68 dinner dishes →" (48px). Alto con los objetivos de 48px: **738px** desde el borde superior del contenido del capítulo (29 + 32 + 55 + 16 + 30 + 32 + 160 + 40 + 280 + 16 + 48), igual a 1280, 1440 y 1920 porque los tokens no escalan.
  - **Filete vertical** Boulevard al 24% en el centro del gutter 6/7, desde la hora hasta la base del capítulo: es el filete entre grupos, en vertical.
  - **Columnas 7–12, costado, de arriba a abajo:** Appetizers (miniatura de 72px en la columna 7; nombre, 3 platos de 48px y "All 21 →" de 48px en las columnas 8–12: 232px); aire 24 + filete horizontal + aire 24 (49px); Bar (nombre, línea corrida de 1 fila de 48px, "All 47 →" de 48px, en las columnas 8–12: 136px); aire de 32px. Suman **449px**.
  - **D05 en las columnas 8–12** (el eje del sitio, alineada con el texto del costado), con **alto derivado = 738 − 449 = 289px** y su base en la misma línea que la base de "All 68 dinner dishes →": 0px de hueco en cualquier columna. Proporción resultante: **466×289 (1.61:1) a 1280, 526×289 (1.82:1) a 1440, 626×289 (2.17:1) a 1920**, siempre dentro de la banda permitida de **3:2 a 2.2:1**, recortada del máster 3:2.
  - **Condiciones para que la banda no se rompa** (se verifican en la revisión de los once platos): cada plato de Dinner ≤ 30 caracteres (1 línea de 30px en 564px); cada plato de Appetizers ≤ 40 caracteres (1 línea en 466px); **los tres platos de Bar con sus separadores ≤ 48 caracteres** (1 fila en 466px). Si un nombre no cumple, se elige el siguiente del grupo en `sort_order`. Nunca se resuelve con aire bajo Dinner (D11).

**Qué platos se muestran (gate #3, 22.4).** La regla no cambia: **salen de la DB**, por defecto los primeros de cada grupo según `sort_order` del menú vivo (5 de Dinner, 3 de Appetizers, 3 de Bar: once en total). **Paso nuevo antes de la Etapa B:** Pedro o el director revisan los once contra la DB. Si alguno no sirve para una pizarra (un agregado tipo "add cheese", un "side of", una variante de tamaño o un ítem poco apetecible), o no cumple los topes de caracteres de arriba, se reemplaza por el siguiente del mismo grupo en `sort_order` que sí sirva. La lista resultante se fija por **ID de producto** en la configuración del sitio; si un ID deja de existir en la DB, ese lugar cae al siguiente en `sort_order` del grupo (nunca a un nombre tipeado a mano). La revisión queda registrada (fecha, quién, los once IDs) en la entrega de la Etapa B.

#### D. Par — Night (Boulevard)

**Qué foto es la grande (Decisión 24.12):** **D09 (Desserts) es la grande y S06 (The Bake Shop) la chica** en tablet y desktop; en mobile van 50/50.

- **Mobile:** 1. Hora sticky. 2. Título. 3. **Dos links grandes lado a lado** (50/50), cada uno con una foto real 4:5 y el nombre debajo en `row`: **Desserts** con D09 (porción servida) y **The Bake Shop** con S06 (vitrina). 4. Debajo, una línea de texto con dos links de 48px: "From the Fountain (6) · Smoothies & Shakes (10)". Sin miniaturas IA. Es la vitrina de noche, no un catálogo.
- **Tablet:** D09 en columnas 1–5 y S06 en columnas 6–8, con el título y la bajada arriba de S06; las dos fotos alineadas en su borde inferior (no tienen el mismo tamaño ni empiezan a la misma altura).
- **Desktop — "Par desigual":** D09 grande en las columnas 1–7; columna 8 vacía; en las columnas 9–12, arriba la hora y el título, abajo S06 (4:5) **alineada al borde inferior de D09**, y la línea de From the Fountain / Smoothies debajo de S06. **Alto de D09 (Decisión 24.12): ≤ `100svh − 120px`**, recortado del máster 4:5 con `object-fit: cover` (proporción entre 4:5 y 1:1): **662×680 a 1280×800, 746×780 a 1440×900, 886×960 a 1920×1080**. Así el par entero entra en una pantalla y el escalón entre la cabeza y S06 mide 66 / 106 / 186px (regla de aire interno ≤ 256). Las dos fotos no tienen el mismo tamaño ni empiezan a la misma altura.

**Resumen de composiciones desktop (21.6; Evening actualizado en gate #3, 22.1, y en la Decisión 24.10):** hero [foto hasta el inicio de la columna 8 | texto 8–12] · Morning [texto 1–4 | índice 5–12 | franja 3:1 a todo el ancho] · Midday [contenido 1–6 | foto desde la columna 8 sangrando a la derecha] · **Evening [Dinner principal 1–6 | Appetizers y Bar 7–12 + D05 de alto derivado en 8–12, tres alturas y tres tratamientos]** · Night [D09 grande 1–7, ≤ 100svh − 120 | texto y S06 en 9–12, alineada abajo] · Visit [video 21:9 a todo el ancho | datos 1–5 y mapa 7–12 | tríptico 8+4] · Close [foto 2–5 | relojes y tarjetas 7–12]. Ningún bloque repite la grilla de otro, y ningún bloque tiene grupos o tarjetas de contenido iguales en ancho, alto y tratamiento.

### 7.4 Una frase (el lugar del número)

Paleta Day. Oración con los números adentro, no banner de stats:

> "408 dishes, breakfast all day, open 24/7. Dine in, pickup or delivery."

(Recalibrado, 20: incorpora las dos frases del cartel.) `display-2` en mobile, máximo 18ch por línea; en desktop, columnas 3–10, alineada a la izquierda. Números sin color de acento ni contador animado. `&nbsp;` entre número y unidad y dentro de "24/7".

### 7.5 Visit

> **Decisiones 24.6, 24.11 y 24.12:** S05b en el tríptico; tríptico tablet 5+3 y desktop con gap de 32; "Open in Google Maps" como link de texto.

Paleta Sign siempre: muestra cómo se reconoce el lugar de noche, que es su imagen identitaria. No pretende ser "ahora".

**Mobile:**
1. **Video de fachada S02** (poster S01) a sangre, 4:5. Reglas de carga en la sección 9. Si existe S03 (fachada de mañana), va como imagen chica debajo del video, con la línea `meta` "By day." para quien llega de día. S03 muestra el cartel del techo con sus dos banderas (20.4).
2. Título `display-2`: "9301 Astoria Boulevard."
3. `<dl>` de hechos (término en `meta` Fog, dato en `body-lg` Paper): "Address" — 9301 Astoria Boulevard, East Elmhurst, NY 11369 · "Hours" — Open 24/7 · "Phone" — (718) 429-5188 · "Service" — Dine in, pickup, delivery.
4. Dos botones del mismo tamaño (56px de alto): "Get directions" (sólido Yolk) y "Call the diner" (contorno Paper).
5. **Tríptico del lugar:** S04 salón (grande, 3:2), **S05b** detalle de barra (4:5), **S11 rockola de mesa en su butaca (4:5)**. El grande a sangre, los chicos 50/50. Captions solo con el nombre del espacio: "The dining room.", "The counter.", "The booth." Si S11 no existe, vuelve S06 en su variante horizontal con "The case.".
6. **Mapa (W5, decidido):** imagen propia estática, **sin proveedor con token**. Se genera una sola vez a partir de datos de OpenStreetMap (por ejemplo, exportando el área con un estilo propio desde MapLibre/Maputnik, o calcando un export de openstreetmap.org), se guarda como AVIF en `/public/buccaneer/`, y lleva visible la atribución "© OpenStreetMap contributors" (exigida por la licencia ODbL) en `meta` Fog. Estilo: fondo Boulevard, calles en Fog, nombres de calle en Fog ≥ 14px; **pin en Neon con contorno Paper de 2px**. **"Open in Google Maps →" es un link de texto** (`meta` Paper, área táctil de 48px, en la misma línea que la atribución), no un botón: "Get directions" ya es el botón al mismo destino (Decisión 24.12). Todo el mapa es además un link. Sin iframe. Las calles salen de los datos de OSM, no se dibujan a mano.

**Tablet (Decisión 24.11):** video 21:9 a sangre; dirección, `<dl>` y botones en columnas 1–4, mapa en columnas 5–8 (4:5 en T1, 16:10 en T2). **Tríptico 5+3:** S04 en columnas 1–5 y S05b + S11 apiladas en columnas 6–8 con 20px entre ellas; la altura de la fila es fija por CSS (T1 480px; T2 `clamp(480px, 47vw, 560px)`), así que la pila iguala a S04 por construcción.

**Desktop — "Llegada" (21.6; tríptico ratificado en la Decisión 24.11):** el video S02 como **banda 21:9 a todo el ancho** (1280×548), sin texto encima. Debajo, dos zonas: columnas 1–5 con título, `<dl>` y los dos botones lado a lado; columnas 7–12 con el mapa (16:10). Debajo, el **tríptico en 8 + 4**: S04 en columnas 1–8 y, en las columnas 9–12, S05b y S11 apiladas (4:3 cada una), con **32px** entre ellas para que la caption "The counter." entre en ese espacio sin ambigüedad; **S04 se recorta a ≈ 1.30:1 desde su máster 4:3** para igualar el alto de la pila con **0px** de diferencia (760×584 a 1280, 856×656 a 1440, 1016×776 a 1920). Captions "The dining room." bajo S04 y "The booth." bajo S11, en la misma línea de base. Es el único bloque con una banda horizontal de video y el único con una pila de dos fotos.

### 7.6 Close

> **Decisión 24.12:** Close en Evening lleva la banda Yolk.

Paleta del estado actual. **En Evening (paleta Lamp) Close repite el dispositivo del hero:** mobile y tablet, banda Yolk a sangre detrás del bloque que empieza en el reloj y termina 16px debajo de las tarjetas; desktop, banda Yolk desde el inicio de la columna 7 hasta el borde derecho, a todo el alto de Close, detrás del bloque de texto. Close no lleva wordmark; con el header fijo encima, la tinta queda a ≥ 24px de la banda por la regla 6 (7.1).

**Mobile:**
1. **S10 a sangre**, 4:5. Caption `meta`: "The dining room clock." Es el único objeto náutico del sitio y entra porque es un reloj: el reloj real del diner al lado del reloj de la página.
2. Reloj + línea fija "Open 24/7 · New York time".
3. Una línea: "Whatever time it is on Astoria Boulevard, we're open."
4. Las tarjetas Order / Visit idénticas a las del hero (88px, sin foto). El bloque lleva `id="bd-close-cta"`.

**Desktop — "Dos relojes" (21.6):** S10 4:5 en las columnas 2–5; columnas 7–12 con el reloj de la página en `clock` desktop (64px), la línea fija, la frase y las tarjetas; **el reloj digital se alinea verticalmente con el centro de la esfera del reloj-timón de S10** (la posición se fija en el diseño con la foto real) y las tarjetas se alinean con la base de S10. Columna 1 y 6 vacías.

Separador 7.0 si su fondo coincide con Visit o con el footer. Sin newsletter. Si S10 no existe, Close queda sin foto y el texto pasa a columnas 1–7 en desktop; nunca se reemplaza por otra imagen.

### 7.7 Footer

Paleta Sign. **Lockup B del wordmark** (Neon + "Diner" en Paper, 200/240/280px), dirección, teléfono, link al menú, links sociales **solo si existen y están activos** (Q5), "Powered by MENIUS", disclosure. Padding inferior: `calc(var(--bd-bar-h) + max(24px, env(safe-area-inset-bottom)))` en mobile; `max(32px, env(safe-area-inset-bottom))` en tablet (sin barra, `--bd-bar-h: 0`). Sin Yolk en el footer (regla 7 de 4.2): el anillo de foco es Paper (Decisión 24.5).

---

## 8. Order y Visit: igual peso

> **Decisión 24.7:** sticky bar con columnas `1fr 1fr 48px`, oculta sobre Close y en teléfonos horizontales; sin barra en tablet. **Decisión 24.9:** botón del header de 48px.

- **Hero y Close:** dos tarjetas con nombre, mismo tamaño, misma fila (patrón Qissa "Dine In / At Home"). Order es sólida y Visit contorno; esa es la única asimetría, y la compensa que Visit tiene su sección completa (7.5) con su propio botón sólido. Ninguna tarjeta lleva foto (Decisión 24.4).
- **Sticky bar mobile** (paleta del estado actual; aparece cuando `#bd-hero-cta` sale por arriba; se oculta con `visibility` además de transform, como en la v1):
  - Columnas **`1fr 1fr 48px`**, gap 8: `[ Order online → ]` · `[ Directions ]` · `[ teléfono ]` (ícono de 24px centrado en un cuadrado de **48×48 fijo**, `aria-label="Call (718) 429-5188"`). A 375: 139.5 / 139.5 / 48px. Order y Directions del mismo ancho (igual peso).
  - Order sólido; Directions y Call contorno. Todos de 48px de alto.
  - Padding: `0.75rem` arriba, `max(0.75rem, env(safe-area-inset-bottom))` abajo, laterales `max(16px, env(safe-area-inset-left/right))`. Requiere `viewport-fit=cover`.
  - Filete superior de 1px: Boulevard en Day/Lamp, Fog en Sign (matriz de 4.2, regla 8).
  - En Evening, la sticky bar usa la paleta Lamp: fondo Paper (no Yolk). Nunca lleva el wordmark.
  - **Se oculta mientras cualquier parte de `#bd-close-cta` está en el viewport** (las tarjetas de Close son el mismo CTA; dos Order a la vez es ruido) y vuelve a aparecer al salir.
  - **No se muestra en teléfonos horizontales** (alto ≤ 500px): el "Order" del header queda como acceso.
- **Tablet: sin sticky bar** (confirmado). El header opaco de tablet lleva "Order online" y el teléfono siempre visibles; Visit tiene su camino en las tarjetas del hero y de Close y en su sección. `--bd-bar-h: 0` desde 720px.
- **Desktop:** sin barra; header con "Order online" (sólido en la tinta del estado, 48px) + teléfono; Visit con "Get directions".
- **Nunca:** DoorDash/Uber Eats/Grubhub, "Reserve a table", gift cards, tres CTAs iguales en el header.

---

## 9. Motion

> **Decisión 24.12:** corte de video del hero Night en desktop.

**Intensidad: sutil, con cortes secos.** Solo `transform` y `opacity`. Sin GSAP, Lenis, WebGL, loader ni librerías. Todo lo ligado a scroll usa **`view()` timelines**, que toman el contenedor de scroll más cercano: `.root-scroll` donde aplica (7, Decisión 24.2), el documento en desktop con mouse. **Prohibido `scroll(root)`** donde el scroller es `.root-scroll`. Si hiciera falta un timeline de página, se nombra en `.root-scroll` (`scroll-timeline: --bd-page block`) y se replica con `scroll(root)` solo cuando el scroller es el documento.

| # | Qué | Cuándo | Cómo / duración | Fallback sin soporte | `prefers-reduced-motion: reduce` |
|---|---|---|---|---|---|
| ~~M1~~ | ~~Numeral fantasma~~ | **Eliminado en gate #2 (21.7)** | — | — | — |
| M2 | Reveal de foto real de capítulo, de la franja de Morning y de S10 | Al entrar al viewport | `view()`, `animation-range: entry 0% entry 60%`; `opacity 0 → 1` + `translateY(32px → 0)`; `fill-mode: both` | **Visible por defecto**: el estado oculto inicial se declara solo dentro de `@supports (animation-timeline: view())` | Visible, sin animación |
| M3 | Corte entre capítulos | Siempre | Borde duro + separador 7.0 si el color se repite | — | Igual |
| M4 | Hora sticky que empuja a la anterior | Al cambiar de capítulo | CSS `position: sticky` | Igual | Igual |
| M5 | Video de fachada (S02) | Hero Night y Visit | Loop de 6 s; `opacity 0 → 1` en 300ms sobre el poster al dispararse `canplay` | Poster | Solo poster; el video no se pide |
| M6 | Fondo del header (**solo desktop**) | Al salir el sentinel | `opacity` de `::before`, 200ms, `ease-out` | Igual | Instantáneo |
| M7 | Entrada de la sticky bar (solo mobile) | Al salir las tarjetas del hero | `translateY(100% → 0)` + `opacity`, 220ms, `cubic-bezier(0.2, 0, 0, 1)` | Igual | Sin desplazamiento |
| M8 | Press de botón, tarjeta y link-bloque | `:active` | `scale(0.98)`, 120ms | Igual | Se conserva |
| M9 | Reloj | Borde de minuto | Cambio de dígito sin transición | Igual | Igual |

Cero animaciones en loop salvo el video. Sin punto pulsante, sin parallax, sin hover que escale miniaturas IA, sin contadores animados, sin texto que se tipea, sin marquee, sin cursor custom, sin transiciones de página. **El wordmark, la placa y el pin no se animan nunca** (ni encendido, ni parpadeo de neón, ni barrido de luz).

**Video, reglas de carga:**
- `<video muted playsinline loop preload="none" poster="…">`, sin audio, H.264 MP4; WebM/AV1 como primer `<source>` solo si resulta más chico.
- Formatos (todos del mismo máster 4K de S02): Visit mobile y hero Night tablet T2 **720×900 (4:5)**; Visit tablet/desktop y hero Night tablet T1 **1280×548 (21:9)**; **hero Night mobile 720×360 (2:1)**, recorte del cartel según 7.2; **hero Night desktop 1080×1080 (1:1)**, para una caja de 0.94:1 a 1.25:1 (Decisión 24.12). Todos con `object-fit: cover`. Objetivo ≤ 1 MB cada uno, medido con el archivo real. Si el corte 1:1 no se entrega, el hero Night desktop queda con el poster S01 fijo (recorte del máster 4:5).
- `src` + `play()` recién después de `load` + `requestIdleCallback`, y solo si no hay reduced-motion, no hay `navigator.connection.saveData` y `effectiveType` no es `slow-2g`, `2g` ni `3g`.
- Pausa por IntersectionObserver fuera del viewport.
- El poster (o la foto del estado) es la LCP: AVIF ≤ 120 KB a 750px de ancho, servido con `priority` desde el server (3.3).

**Presupuesto de la ruta (mobile, primera carga, sin video):** ≤ 450 KB transferidos; LCP ≤ 2.5 s en 4G simulado; CLS 0. El wordmark inline suma ≤ 4 KB al HTML; S10, S11 y la franja de Morning son lazy y no cuentan en la primera carga.

---

## 10. Voz y copy

### 10.1 Voz

Inglés. Frases cortas, presente, segunda persona cuando invita, primera plural cuando habla el diner. Contracciones. Sentence case. La hora es el sujeto. Sin superlativos, sin adjetivos de agencia ("delicious", "culinary", "experience", "passion", "tradition"), sin signos de exclamación, sin emojis. **Las dos frases del cartel ("Open 24/7", "Breakfast all day") se citan textuales**: no se parafrasean ni se les agrega hora.

### 10.2 Copy por estado

> **Decisión 24.3:** títulos de la Order card sin cambio (la tarjeta crece a 88px en mobile); línea `meta` de tablet/desktop con tope de 42 caracteres y texto de Morning fijado.

| Estado | Reloj (ejemplo) | Línea fija | Frase de estado | Order card (título / línea mobile) | Línea `meta` de la Order card en tablet/desktop (≤ 42 caracteres, 2 líneas) |
|---|---|---|---|---|---|
| Morning | "6:42 a.m." | "Open 24/7 · New York time" | "Breakfast time." | "Order breakfast" / "Pickup or delivery" | **"Breakfast all day — pancakes, the Benedict"** (42; verificar nombres contra la DB) |
| Midday | "12:20 p.m." | ídem | "Lunch hour." | "Order lunch" / "Pickup or delivery" | Dos platos de Burgers o Lunch con el formato "{plato}, {plato}", ≤ 42, elegidos en la revisión de 22.4 |
| Evening | "6:05 p.m." | ídem | "Dinner, here or at home." | "Order dinner" / "Pickup or delivery" | Dos platos de Dinner con el mismo formato, ≤ 42, elegidos en la misma revisión |
| Night | "2:14 a.m." | ídem | "Up late? So are we." | "Order now" / "Pickup or delivery" | "Burgers, disco fries" (20; verificar contra la DB; ajustar con Q4) |

Visit card, igual en todos los estados: "Come in" / "9301 Astoria Blvd".
H1, constante (48 caracteres, 2 líneas a 375px): "Buccaneer, a 24-hour diner on Astoria Blvd, Queens."

**Alto de las tarjetas:** mobile 88px fijo (el título de 20px puede ocupar 2 líneas: "Order breakfast" no entra en una a 375); tablet 88px; desktop 96px. Las dos tarjetas siempre del mismo alto, y el alto no cambia entre estados.

"Breakfast all day" no se usa en la Order card de Night ni en ninguna frase de madrugada: "all day" en el cartel no prueba que la cocina haga desayuno a las 3 a.m. (Q1 sigue abierta para la madrugada).

### 10.3 Formato de la hora

"2:14 a.m." / "12:20 p.m.": minúsculas con puntos. `Intl` devuelve "AM"/"PM": se transforma a mano. El sufijo va en `clock-suffix`. Texto accesible: "2:14 a.m. in New York". La línea fija dice "New York time" para quien abre desde otra zona horaria.

### 10.4 Otros textos

- Capítulos: títulos y bajadas de la tabla 7.3 (Morning: "Breakfast all day."; el resto: "Our picks for this part of the day.").
- Midday: "On the side: Salads & Soups (21) · Sides (24)." (conteos de la DB).
- Evening: "All 68 →", "All 21 →", "All 47 →" (conteos de la DB).
- Frase de números: "408 dishes, breakfast all day, open 24/7. Dine in, pickup or delivery."
- Visit: "9301 Astoria Boulevard." / "Hours — Open 24/7" / "Get directions", "Call the diner" / "Open in Google Maps →" (link de texto) / "By day." si hay S03 / captions "The dining room.", "The counter.", "The booth."
- Close: "The dining room clock." (caption de S10) / "Whatever time it is on Astoria Boulevard, we're open."
- Disclosure: "Framed thumbnails are styled product compositions."
- Metadata (constante): título "Buccaneer Diner — Open 24 Hours on Astoria Blvd, East Elmhurst, Queens"; descripción "Open 24/7 at 9301 Astoria Boulevard, East Elmhurst, NY. Breakfast all day. Dine in, pickup or delivery. Order online or call (718) 429-5188." El título conserva "Open 24 Hours" porque es la forma en que se busca ("24 hour diner").
- **OG image (1200×630):** S01 recortada a 720×630 a la izquierda; a la derecha, 480×630 en Paper con el lockup B a 400px (Rooftop + "Diner" en Boulevard). Sin otro texto.

### 10.5 Frases de la v1 que se eliminan

"Always been here" (historia no confirmada), "Breakfast at 4am, burgers at midnight" (disponibilidad de madrugada: vuelve solo si Q1 = sí; "Breakfast all day" textual sí está permitido), "The shift at LaGuardia ends…" y "The people who keep Queens running…" (clientela), "It's 3am and we're cooking" (cocina abierta: vuelve solo si Q1 = sí), "Open now" (no informa en un 24h).

---

## 11. Shot list (sesión de fotos y video)

> **Recalibrado (20):** tomas nuevas S08–S11; S01 desde la esquina; reglas de superficie, vajilla, butaca, manteles, TVs y exposición del neón; horarios de noviembre.
> **Gate #2 (21.1, 21.3, 21.9):** muestra de color obligatoria y criterio de aceptación para el cast violeta/magenta; límite de cielo en S01; manteles fuera de los heros y de la Order card; S08 pasa a ser la fuente del wordmark; formatos nuevos para las composiciones desktop.
> **Decisiones 24.4, 24.6, 24.10, 24.12 y 24.14:** D07 baja a Media; S05 se divide en S05a y S05b; nota de D05 (68% central); corte 1:1 de S02 y nota de D09 (80% central); sujeto de los heros en el 45% vertical central para la banda tablet y en el cuadrado central del 4:5 para desktop.

**Reglas generales:**
- Dos bloques: **mañana (7:00–10:00)** y **tarde-noche (desde ~20 min antes de la puesta hasta las 21:30)**. Para la semana del 17 de noviembre de 2026 la puesta en Queens es cerca de las 16:35 y el crepúsculo civil termina cerca de las 17:05 (aproximado: **confirmar en timeanddate.com el día de la sesión**). La hora azul de S01, S02 y S08-noche cae entonces entre ~16:40 y ~17:10; las tomas de cena (D05, D06) siguen después, con las lámparas del salón. Cada toma en el turno que representa.
- **Las fotos de hero de Morning, Midday y Evening (D01, D04, D06) se encuadran SIN ventana, puerta vidriada ni cielo en cuadro** (B2): solo el plato, la mesa o la butaca y la luz que cae. La luz de ventana puede iluminar el plato; la ventana no aparece.
- Luz existente del local, sin flash frontal, sin HDR, sin filtros (definición de filtro en 6). Conservar lo cálido del tungsteno de noche.
- **Muestra de color y control del cast (21.9).** La primera toma de cada serie (mañana, mediodía, hora azul, noche cerrada) y cada cambio de lugar llevan en cuadro, en el plano del sujeto, **una carta de gris 18% y una carta de color de 24 parches** (tipo ColorChecker). En el revelado, el balance de blancos de toda la serie se toma de esa carta y se registra (Kelvin y tint) en la planilla de entrega. **Aceptación, medida con cuentagotas de 5×5 px en el JPEG sRGB final:** el parche gris neutro tiene |R−G|, |G−B| y |R−B| ≤ 6 (sobre 255). En la hora azul el cielo puede quedar violeta, porque es real; lo que no puede quedar violeta o magenta son las superficies neutras del edificio (caja blanca del cartel apagada, revestimiento beige), que se verifican visualmente contra la toma de día S03. Si una toma no pasa con el balance de su serie, se descarta; no se corrige por zonas.
- **El neón se expone para el tubo.** En las referencias, el rojo de los tubos sale quemado a rosa o blanco (`fachada-noche-2019.png`). En S01, S02 y S09-atardecer, el borde del tubo no puede tener el canal rojo saturado (alerta de altas luces apagada en el borde, aceptada en el núcleo). Por eso la principal es de hora azul: el cielo y el tubo se equilibran sin HDR.
- **Vertical y horizontal se disparan por separado.** Las tres fotos de hero diurnas y S01 tienen que funcionar en tres recortes (Decisión 24.14): **banda mobile de ~2.3:1 a 2.0:1** (7.2), con el plato o la palabra del neón dentro del 60% central horizontal; **banda tablet T1 de 2.4:1 a 3.5:1**, con el sujeto además dentro del **45% vertical central** del máster 3:2; y **caja desktop de 0.94:1 a 1.25:1**, con el sujeto dentro del **cuadrado central del máster 4:5**, libres los 72px superiores y la esquina superior izquierda donde va la placa. **En mobile y tablet el header no tapa la foto**; en desktop sí tapa los 72px superiores.
- Entrega: RAW + JPEG sRGB, mínimo 4000px de lado largo, con fecha y hora en los metadatos (S08 la necesita como prueba del texto del cartel). Planilla con los balances de cada serie. Sin food styling que borre migas o grasa.
- Gente: solo con consentimiento firmado; personal y manos sí, clientes identificables solo con release. Patentes borrosas en edición.
- Platos **en las mesas y la barra del local, con su vajilla**, a 25–45° (altura de alguien sentado). No cenital, no fondo negro, no pizarra.
- **Superficie y fondo:** la mesa es la fórmica moteada del local, tal cual (visible bajo la rockola en `jukebox-mesa-2025.png`). El plato va en la vajilla en que la cocina sirve ese plato: si es el plato de borde dorado ornamental †, mejor, pero no se cambia de vajilla para la foto. En D01, D04 y D07, el fondo desenfocado (f/2.8 o más abierto) es el vinilo naranja de la butaca † en el tercio superior.
- **Manteles de papel (21.9):** el borde de damero rosa y violeta choca con Paper y con Yolk. **Se retiran de la mesa en D01, D04, D06 y D07**. En las demás tomas de plato pueden entrar ocupando como máximo el 10% del cuadro, sin centrarlos.
- **Qué evitar, aprendido de las referencias:** cenital o casi cenital † (`plato-bagel-salmon-new-yorker.png`); altas luces quemadas en platos claros † (`plato-avocado-toast.png`, `plato-steak-salad.png`); cuerpos y celulares de comensales en el fondo † (`plato-short-ribs-club.png`); autos tapando la fachada (`fachada-noche-neon.png`, `fachada-noche-2019.png`); **televisores encendidos con noticias** en el salón (`salon-2024.png`; también † `salon-panoramica.png`: se apagan o quedan fuera de cuadro); rayos de sol y flare cruzando el salón (`salon-2024.png`); decoración estacional de las ventanas (corazones en 2019, flores pintadas en 2024) como sujeto de una foto de hero.

### 11.1 Lugar y video

| ID | Prioridad | Toma | Uso | Hora | Orientación / formatos | Encuadre y óptica | Notas |
|---|---|---|---|---|---|---|---|
| **S01** | **Bloqueante** | Letrero prendido, **desde la esquina de Astoria Blvd y 93rd St** (ángulo de `fachada-noche-neon.png`) | Hero Night (mobile: recorte de la palabra), Visit (poster), OG image | Hora azul (~16:40–17:10) + una serie de noche cerrada | 4:5 vertical, 3:2 horizontal **y** una toma cerrada de la palabra "Buccaneer" con su línea de LED para la banda mobile | Trípode, 1.5 m. Plano general a 24–28 mm: "Diner" sobre la entrada, "Buccaneer" en la cornisa, la línea de LED, el cartel del techo y **las dos banderas**. Toma cerrada a 50–85 mm: la palabra ocupa el 60–75% del ancho | La de hora azul es la principal. **Cielo ≤ 25% del cuadro** en 4:5 y 3:2, **≤ 15%** en la toma cerrada (21.1: el cielo de hora azul sale violeta-índigo, no Boulevard; se limita por encuadre y se balancea con la carta, nunca se tiñe). Ningún vehículo cubriendo más del 15% del cuadro. Recortes de 11 (Decisión 24.14). Repetir si hay asfalto mojado |
| **S02** | **Bloqueante** | Video de fachada, cámara fija | Hero Night, Visit | Hora azul (A) y noche cerrada (B) | 4K, 24/30 fps, **mismo trípode que S01**; de ese master salen 4:5, 21:9, 2:1 y **1:1** (hero Night desktop, Decisión 24.12) | Sin movimiento ni zoom, 1/50. 10–15 s por toma, 3 tomas por horario. Encuadrar para que el letrero entre también en el corte 1:1 central | Tramo de 6 s sin entradas/salidas de borde al inicio y al final (o tráfico continuo). Sin caras identificables. Mismo límite de cielo que S01 en el recorte 21:9 |
| S03 | Alta | Fachada de mañana, **desde la vereda opuesta de Astoria Blvd** (ángulo de `fachada-dia-calle.png`) | Visit ("By day."); referencia neutra para el control del cast | 8:00–10:00 | 3:2 horizontal | 35 mm, 1.5 m. El edificio entero, el cartel del techo legible y las dos banderas contra el cielo | Esperar a que la vereda tenga la menor cantidad de autos estacionados |
| **S04** | **Bloqueante** | Salón, plano general | Visit (grande) | Mañana | 3:2, 4:3 y 4:5 | Desde un rincón del fondo, 24–28 mm, altura de ojos sentado. En cuadro: las sillas de asiento naranja, al menos una ventana trapezoidal, un cuadro de galeón y el reloj-timón, la línea de LED azul del cielorraso si se ve. El 4:3 tiene que admitir el recorte a ≈ 1.30:1 de desktop (perder ~2.5% de ancho) | Acá sí pueden verse ventanas: Visit no es "ahora". **TVs apagados o fuera de cuadro.** Los cuadros de barcos aparecen solo como parte del salón, nunca recortados como sujeto (son obras de terceros) |
| **S05a** | **Bloqueante** | Barra: banquetas y mostrador, **en diagonal a lo largo de la barra** (Decisión 24.6) | Apertura del capítulo Midday | Mediodía | 4:5 y 3:2 | ~90 cm de altura, 35–50 mm. Para Midday desktop (foto que sangra a la derecha) el sujeto se concentra en la mitad izquierda del 4:5; admite recorte en alto hasta 0.85:1 (regla de aire interno, 7.3) | Personal detrás, mejor (con consentimiento). Si la barra tiene la cornisa de LED azul (se ve detrás de la rockola en `jukebox-mesa-2025.png`), que entre arriba en cuadro |
| **S05b** | **Bloqueante** | Barra: **detalle de mostrador, de frente y más cerrado que S05a** (pase, dispensers, tazas, banquetas en primer plano) | Tríptico de Visit ("The counter.") | Mediodía, en la misma serie que S05a | 4:3 y 4:5 | 50 mm, de frente al mostrador, a la altura de una banqueta. **Tiene que ser otra toma, no un recorte de S05a**: la misma imagen no aparece dos veces en la página | Sin TV en cuadro |
| **S06** | **Bloqueante** | Vitrina de postres | Par de Night (The Bake Shop) | Noche, con la luz propia de la vitrina | 4:5 **y** 3:2 | Frontal levemente fuera de eje, 50 mm, polarizador | Sin flash. Que se lean las tortas, no el vidrio |
| S07 | Deseable | Plancha en uso, de noche | Posible hero Night (3.1) | 22:00 en adelante si se puede; si no, después de las 21:00 sin ventanas en cuadro | 3:2 + 4:5 | 35–50 mm, desde el lado del mostrador | Manos del cocinero sí (consentimiento) |
| **S08** | **Bloqueante para la Etapa B** | **Cartel del techo, frontal**: caja de luz blanca con "Buccaneer" rojo, "Diner" azul y los paneles amarillos | **Fuente del wordmark v1 (lockup A, lockup B y monograma, 5.6)**; verificación de "Open 24/7" y "Breakfast All Day" (0); calibración de Rooftop (4.4); documentación de la serif de los paneles (5.1) | Día nublado o a la sombra, **y** una de hora azul con la caja prendida | 3:2, con el cartel ocupando ≥ 70% del ancho | Teleobjetivo 85–200 mm desde el punto más lejano posible (vereda opuesta de Astoria Blvd o fondo del estacionamiento), cámara a la altura máxima disponible, eje perpendicular al cartel | Los dos paneles laterales legibles. Fecha en metadatos. Carta de gris en el mismo encuadre de luz. Una toma extra a ≥ 200 mm de cada panel para leer la tipografía |
| **S09** | **Bloqueante para la Etapa B** | **Frente, "Buccaneer" y "Diner" de la cornisa, frontales** | Calibración de Neon (4.4). Ya no es fuente de formas de letra (21.2) | Atardecer con el tubo prendido, expuesto para el tubo (−1.5 a −2 EV respecto de la medición del edificio); una de día como registro | 3:2; cada palabra por separado, ocupando ≥ 80% del ancho | 50–85 mm, desde el estacionamiento, centrado en el eje de cada palabra; corrección de perspectiva en revelado | Ningún reflejo de faroles de auto sobre el vidrio negro de la palabra. Carta de gris en la primera toma |
| S12 | Media (sube a Alta si Q9 = sí) | **Menú impreso sobre la mesa**: tapa con el pirata y el loro, en su butaca, como lo recibe el cliente | Tríptico de Visit o Close, solo si Q9 = sí | Mañana o mediodía | 4:5 y 3:2 | 35–50 mm, 30–40°, la tapa entera legible, sin reflejo del plástico (polarizador o ángulo) | Vinilo de la butaca o fórmica alrededor; sin manos de clientes |
| S10 | Alta | **Reloj-timón con ancla** de la pared del salón | Close (7.6) | Mañana o mediodía, luz del salón | 4:5 | Frontal, 50 mm, a la altura del reloj (escalera o desde lejos con 85 mm), con 20–30% de pared y la moldura bordó alrededor; la esfera en el tercio superior, para alinear el reloj digital en desktop | Sin TV ni cartel de "Exit" en cuadro. La hora que marquen las agujas da igual |
| S11 | Alta | **Rockola de mesa** (Rowe/AMI "Compact Disc") en su butaca | Tríptico de Visit ("The booth.") | Mediodía o tarde | 4:5, 3:2 y 4:3 | 35–50 mm, altura de ojos sentado, de frente a la rockola, con el vinilo de la butaca y, detrás, la cornisa de LED azul desenfocada | Ketchup, salero y salsas como estén; etiquetas de marca ni frontales ni centradas. Tarjetas de canciones fuera de foco. Sin gente identificable |

### 11.2 Platos reales (8–10)

| ID | Prioridad | Plato | Uso | Hora y luz | Orientación | Encuadre | Superficie y fondo |
|---|---|---|---|---|---|---|---|
| **D01** | **Bloqueante** | Pila de panqueques (Buttermilk Pancakes) | Hero Morning | Mañana, luz de ventana lateral, **ventana fuera de cuadro** | 3:2 (bandas) + 4:5 (desktop) | 30–40°, mesa, taza o vaso real en el borde; recortes de 11 (Decisión 24.14) | Fórmica del local; vinilo naranja de la butaca desenfocado arriba; **sin mantel** |
| D02 | Alta | Huevos u omelette con guarnición (home fries) | Apertura del capítulo Morning (mobile), franja 3:1 (desktop) | Mañana | 4:5 **y** 3:2 con el plato en el tercio central horizontal | 30–40°, en la barra | Mostrador de la barra; mantel ≤ 10% si está |
| D03 | Media | The Benedict o French Toast | Reserva para Morning / OG alternativa | Mañana | 4:5 + 1:1 | 30–40° | Plato de borde dorado si es el que usa la cocina |
| **D04** | **Bloqueante** | Hamburguesa 7 oz Certified Angus | Hero Midday | Mediodía, interior | 3:2 (bandas) + 4:5 (desktop) | 15–25°, que se vea la altura; recortes de 11 | Fórmica; vinilo naranja desenfocado arriba; **sin mantel** |
| D05 | Alta | Plato de Dinner o appetizer para compartir | Cierre del capítulo Evening (mobile 4:5; tablet 2:1; desktop alto derivado de 289px, 1.61:1 a 2.17:1) | Tarde, luz interior | 4:5 + 3:2 | 30–40°, mesa de booth. **En el 3:2 el plato queda dentro del 68% central en alto**, para que el recorte a 2.2:1 no lo corte (Decisión 24.10) | Plato de borde dorado si corresponde †; mantel ≤ 10% |
| **D06** | **Bloqueante** | Plato de mariscos (Seafood) | Hero Evening | Tarde, lámparas del salón, sin ventanas | 3:2 (bandas) + 4:5 (desktop) | 30–40°; recortes de 11 | Fórmica; sin vinilo naranja (la banda Yolk ya pone el cálido); **sin mantel** |
| D07 | **Media** (Decisión 24.4) | Cowboy burger (9 oz Specialty Steak) | Material de presentación al cliente; OG alternativa nocturna. **No va en la Order card** | Noche, luz del local | 4:5 + 1:1 | 15–25°, en el pase o la barra | Vinilo naranja desenfocado o el pase de la cocina; **sin mantel** |
| D08 | Media | Disco fries | Reemplazo de IA en la Pizarra de Evening (Appetizers) | Noche | 1:1 | 30–40° | Fórmica; mantel ≤ 10% |
| **D09** | **Bloqueante** | Porción de torta o pie de la vitrina, servida | Par de Night (Desserts) | Noche | 4:5 | 30–40°, vitrina desenfocada detrás. **La porción queda dentro del 80% central en alto**, para que el recorte hacia 1:1 de desktop no la corte (Decisión 24.12) | Mostrador frente a la vitrina |
| D10 | Media | Waffle fries u onion rings (Sides) | Reemplazo de IA en el Plato de Midday | Cualquiera | 1:1 | 30–40° | Fórmica; mantel ≤ 10% |

**Bloqueantes para lanzar:** S01, S02, S04, S05a, S05b, S06, S08, S09, D01, D04, D06, D09.
**Bloqueantes para convocar la Etapa B:** S01, D01, D04, D06 (fotos de los cuatro heros) + S08 (wordmark v1 y Rooftop) y S09 (Neon). D07 deja de serlo (Decisión 24.4).
**Orden sugerido del día de la sesión (mediados de noviembre):** 7:00–10:00 carta de color, S03, S04, S10, S12, D01, D02, D03 y S08 de día · 11:00–14:00 carta de color, S05a, S05b, S11, D04, D10 · 16:15–17:15 carta de color, S01, S02-A, S08 prendido, S09 atardecer · 17:15–21:30 carta de color, D05, D06, D07, D08, D09, S06, S02-B, S07 si se puede.

---

## 12. Qué se conserva de la v1 y por qué

| Se conserva | Por qué |
|---|---|
| Wrapper `.root-scroll`, sentinels + IntersectionObserver de `SiteChrome.tsx`, sticky bar con safe-areas, ocultamiento por `visibility` | Funciona, resuelve el bug de iOS y no depende de `window` |
| Lógica del reloj de `LiveStatus.tsx` | Correcta; cambia formato y deja de ser badge |
| Bricolage Grotesque como texto | No era parte del problema y no cuesta bytes |
| CSS a mano con prefijo `bd-`, sin Tailwind, sin librerías de motion, sin loader | Sigue siendo lo correcto para 4G de noche |
| La frase con los números adentro en vez de banner de stats | Ya era la respuesta correcta |
| El índice de subcategorías de Breakfast | Pasa de tile a anatomía propia del capítulo Morning |
| El dispositivo de la hora como subtítulo | Era la semilla de esta dirección |
| Deep links a menius.app/buccaneer | Objetivo comercial |
| Disclosure de composiciones IA y nunca usarlas como documental | Más necesaria que en agosto |
| Espacio honesto en vez de stock ajeno | Se sostiene |
| Sin DoorDash/Uber Eats, reservas, newsletter, carrusel horizontal, emojis | Las razones no cambiaron |
| Disciplina de hechos | Es la base de la voz |

**Se abandona:** fondo negro permanente, Anton, JetBrains Mono, labels/eyebrows/botones en mayúscula con tracking, ámbar sobre negro, rojo Ketchup Ember como acento (el rojo vuelve solo como firma del letrero, 4.2), punto pulsante y "Open now", scrim sobre la foto del hero, bento de tiles, `background-color` animado en el header, las frases de 10.5, el wordmark provisorio en Fraunces, **Fraunces, el numeral fantasma y las filas uniformes de Midday y Evening** (gate #2).

---

## 13. Riesgos y cómo se evitan

| Riesgo | Cómo se evita |
|---|---|
| **Se vuelve un truco / no se entiende en 3 s** | Esqueleto constante del hero en los cuatro estados, presupuesto del fold (7.2) y línea fija "Open 24/7" en todos. Prueba de 5 segundos en la Etapa B (18) |
| **El turno no coincide con la luz de afuera (diciembre vs julio)** | Concepto precisado como turnos de comida (sección 1); heros diurnos sin ventana ni cielo; Night desde las 22:00; el pitch nunca promete "cambia con el cielo" |
| El fold no entra en iPhones chicos | Presupuesto con medidas por elemento y suma verificada (7.2: 505 / 540); regla de qué se achica primero; capturas en 375×548 con línea guía |
| **La Order card no domina** | Escala nueva (reloj 32, frase 26, tarjeta 88 con título 20) y cuatro verificaciones medibles en 5.5 |
| **El header tapa la foto y la deja en letterbox** | Header apilado en mobile y tablet (7.1); la foto mobile es un acento con un detalle identificable (7.2) |
| **El rojo queda pegado al Yolk con el header fijo** | Regla 6 medida desde la tinta, con su posición fijada en cada header (Decisión 24.1) |
| **El cromo fijo se come la pantalla de lectura** | Presupuesto por viewport en 7.1 (Decisión 24.8): ≤ 30% mobile, ≤ 15% tablet y desktop |
| **Breakpoints ambiguos entre equipos** | Cortes únicos en 7 (Decisión 24.2) y scroll container para todo dispositivo táctil |
| El visitante de otra zona horaria se confunde | "New York time" en la línea fija; H1 constante |
| Parpadeo o LCP incorrecta | Estado y foto prioritaria decididos en el server; script inline solo corrige HTML cacheado (3.3) |
| Cambio de paleta en medio de la lectura | Estado fijo al cargar; reevaluación en `visibilitychange` |
| QA de cuatro estados | `?at=HHMM`; 12 capturas de hero (4 estados × 3 viewports) por entrega |
| El cliente lo ve a una hora y cree que "el sitio es amarillo" | Presentación con los cuatro estados lado a lado |
| La sesión no trae las tomas en su turno | Bloqueantes definidos (11); sin ellos no hay Etapa B (sección 18). Si falta todo el bloque de mañana, se escala a Pedro antes de recortar a 3 estados |
| **Cast violeta/magenta de la hora azul** | Carta de gris y de color por serie, criterio numérico de aceptación, cielo limitado por encuadre (11); el balance de carta no es filtro (6) |
| El rojo se vuelve acento | Regla del rojo cerrada (4.2): lista completa de usos, ≤ 3% de UI, nunca superficie ni acción |
| Rojo + amarillo se lee como comida rápida | El rojo nunca sobre Yolk, ≥ 24px desde la tinta, Evening B (4.2) |
| **Night se lee como logo de cadena (IHOP, Pepsi, Denny's)** | Neon y Yolk nunca en el mismo componente, foco Paper en el header (4.2, reglas 7 y Decisión 24.5); prueba específica de Night con umbral y remedios decididos (18) |
| **Header fijo sobre capítulos de otra paleta** | Header y sticky bar opacos con filete fijo; matriz de bordes en 4.2, regla 8 |
| Neón kitsch (glow, parpadeo, tubo dibujado) | Prohibido en 4.2, 5.6 y 9 |
| Rechazo a las fotos IA | Gramática real-grande / IA-chica-enmarcada; IA solo en Midday y Evening; ninguna en hero, aperturas, Night, Visit ni Close |
| **Capítulos que se leen como directorio de filas** | Cuatro anatomías con estructura de contenido distinta (Índice, Plato, Pizarra, Par) y composición desktop propia para cada una (7.3) |
| **Desktop repite la misma grilla en todos los bloques** | Resumen de composiciones en 7.3: ningún bloque repite la grilla de otro |
| **Aire muerto en desktop ancho (D11)** | Regla de aire interno ≤ 256px y tope de alto de D09 y S05a (Decisión 24.12); D05 de alto derivado (Decisión 24.10) |
| Bloques contiguos del mismo color se funden | Separador 7.0 |
| **El wordmark no se lee a 116 o 132px** | Test de legibilidad en mobile y tablet con umbral y fallback al monograma (5.6) |
| **Dos dibujos de gótico distintos (frente y techo)** | Canónico = techo; el frente aporta solo el color de noche (5.6) |
| **Obra derivada de una fuente** | "Trazado del letrero; Cloister Black solo se consulta": ningún archivo de fuente se superpone ni se copia (5.6) |
| **Serif editorial "de IA"** | Fraunces reemplazada por Besley, serif de rótulo americana (5.1) |
| Tematizado (pirata, griego, rockola, damero) | Solo fotografía documental en lugares fijos (20.4); prohibido como gráfico (15) |
| Las fotos de referencia terminan publicadas | Viven en `scripts/.product-output/reference-buccaneer/`, en `.gitignore` y fuera de `/public` (20.5) |
| El cartel cambia sus paneles | Re-verificación con S08 antes del deploy (0) |
| Afirmaciones sin confirmar en el copy | Sección 0, revisión del copy antes de cada deploy |
| Scroll-driven en Safari dentro de `.root-scroll` | Solo `view()`, todo visible fuera de `@supports`, prueba en iPhone y iPad reales (Safari 26+) y Android de gama media. Playwright no valida el scroll de iOS |
| SEO | H1, metadata y texto de los cuatro estados en el DOM |

---

## 14. Referencias (inspiran, no se copian)

### 1. Delta Cafés — https://deltacafes.com/en
- **Tomar:** la jornada en capítulos ligados al scroll.
- **Adaptar:** capítulos por turnos, con corte seco, paleta, anatomía y composición propias.
- **No tomar:** video por capítulo, Blender, quiz.

### 2. Tengile Malamala — https://tengilemalamala.com/
- **Tomar:** sitio claro, dos colores, gran fotografía real, ganando en hospitality en 2026; timeline narrativo.
- **Adaptar:** el timeline es la hora sticky.
- **No tomar:** quiet luxury, preloader.

### 3. TÒPAS — https://bar-topas.ch/
- **Tomar:** reloj vivo como contenido, frases cortas, voz de barra, nombres de plato a la vista.
- **Adaptar:** la frase de estado cambia con el turno; la Pizarra de Evening muestra platos con nombre.
- **No tomar:** la ausencia de pedido; las ilustraciones.

### 4. Délice — https://delice.ca/
- **Tomar:** dos colores que no son negro + ámbar; horario y servicios como contenido; una identidad de barrio con historia propia.
- **Adaptar:** al ser 24h, el horario es la estructura; el rojo de Buccaneer sale de su propio letrero y solo firma, mientras que Délice usa su rojo como superficie.
- **No tomar:** su rojo + durazno como paleta de fondos y los tres CTAs de igual peso.

### 5. Lajoya — https://lajoya-foods.com/en
- **Tomar:** animación "blunt".
- **Adaptar:** el corte es entre capítulos, sin animar fondos.
- **No tomar:** verde saturado, split scroll de videos.

### 6. El propio local — las 14 referencias de la sección 20.1
- **Tomar:** el gótico del cartel del techo, el rojo de pintura y el de tubo, la dirección de matiz del LED, la serif de los paneles (familia y peso por confirmar con S08, ver 5.1), las frases del cartel, los objetos del salón como fotografía.
- **Adaptar:** todo pasa por las reglas de 4.2, 5.1, 5.6 y 20.4.
- **No tomar:** ninguna de esas fotos como imagen del sitio; nada del local como patrón gráfico.

---

## 15. Anti-patrones específicos de este proyecto

1. **La receta medida por Krebs:** dark permanente, labels en mayúscula, banner de stats, cards iguales, badge sobre el H1.
2. **Condensadas industriales** (Anton, Bebas, Archivo Black, Big Shoulders) y **monoespaciadas**.
3. **Itálica de acento**; pares Space Grotesk / Instrument Serif / Geist; **serifs blandas o editoriales como voz display** (Fraunces, Instrument Serif, Playfair, DM Serif Display, Newsreader).
4. **Náutico o pirata como gráfico:** íconos, ilustraciones o patrones de anclas, timones, calaveras, sogas, barcos, mapas del tesoro, parches. Lo náutico existe en el local (cuadros de galeones, reloj-timón con ancla) y entra **solo como fotografía documental**: S10 en Close y lo que aparezca dentro de S04. Nunca recortado como sujeto decorativo.
5. **Nostalgia de los 50 literal.**
6. **Texto sobre foto con scrim** en el hero.
7. **Foto IA en contexto documental**, en tamaño grande, animada o teñida.
8. **Afirmar disponibilidad** de madrugada sin Q1 confirmada, o reformular "Breakfast all day" con una hora.
9. **Animar `background-color`, `height`, `top`, `clip-path`** o cualquier propiedad que no sea transform/opacity.
10. **`scroll(root)` o listeners de `window.scroll`** donde el scroller es `.root-scroll`.
11. **Cambiar orden o contenido de secciones según la hora.**
12. **Un quinto estado** o estados por día de la semana.
13. **Repetir un grupo del menú en dos capítulos**, volver a una sola anatomía, o **convertir cualquier capítulo en una lista uniforme "nombre + conteo + miniatura + flecha"**.
14. **Ventana o cielo en las fotos de hero de Morning, Midday y Evening**, o prometer en el pitch que el sitio "sigue el cielo".
15. **Plataformas de delivery de terceros, reservas, newsletter, carrusel horizontal, emojis, íconos genéricos de restaurante.**
16. **Copy de agencia** ("welcome", "experience", "passion", "tradition", "delicious").
17. **Neón simulado:** glow, `text-shadow` de color, parpadeo, encendido animado, letras con contorno de tubo, cromo, reflejos. También el rojo sobre amarillo, el rojo usado como acento o acción, y el wordmark en el mismo componente que un botón Yolk.
18. **Gótico como tipografía:** cargar una fuente blackletter, componer títulos o "Diner" suelto en gótico, usar una Old English de Google Fonts como wordmark, o trazar el wordmark sobre un archivo de fuente.
19. **Greco-americano como decoración:** grecas o meandros, columnas, laureles, bandera griega como ícono o color, franjas azul y blanco, "Opa", tipografías "griegas". La bandera aparece solo como parte de la fachada en S01 y S03. Nada de "Greek family" en el copy.
20. **Objetos del salón como interfaz o patrón:** damero de los manteles como fondo, borde o separador; rockola como selector de capítulos, botón o sonido; fórmica moteada como textura; ventanas trapezoidales como máscara o `clip-path` de fotos; naranja del vinilo como color de UI.
21. **Las fotos de referencia de Google Maps** en cualquier pantalla, maqueta compartida, presentación al cliente o asset (son de terceros y tienen caras).
22. **Numerales fantasma, parallax decorativo y misma grilla de dos columnas repetida en desktop.**

---

## 16. Brief para los diseñadores

`disenador-mobile` (375–719 y teléfonos en horizontal), `disenador-tablet` (720–1279) y `disenador-desktop` (1280+) deben poder responder con este documento (cortes en la Decisión 24.2):

- **¿Sensación primaria?** El mismo diner con la luz de cada turno: mesa del desayuno, mostrador del mediodía, lámparas de la cena, letrero de la noche. Obrero y digno. El nombre es el letrero que el barrio ya conoce.
- **¿Paleta y dónde?** Boulevard `#17225A` y Yolk `#F2B33D` (elecciones, no muestras) como superficies, Paper `#FAF4E6` como blanco; Rooftop `#C8152A` (sobre Paper) y Neon `#FF5148` (sobre Boulevard) solo como firma. Asignación en 4.2 (Evening = B); pares prohibidos en 4.3; regla del rojo en 4.2 (8 puntos, con la matriz del header y la regla 6 medida desde la tinta).
- **¿Tipografía?** Wordmark: gótico del cartel del techo redibujado (SVG, 5.6), lockup A en el header dentro de su placa (o monograma si falla el test), lockup B en el footer. **Besley** (600/700, sin itálica) para reloj, frase de estado, títulos, `display-3` y horas; Bricolage para todo lo demás. Sentence case. Sin mono, sin fuente gótica.
- **¿Jerarquía del hero?** La Order card manda: escala y cuatro verificaciones en 5.5; presupuesto en 7.2 (505 / 540px con tarjetas de 88).
- **¿Chrome y objetivos?** Header 56 / 64 / 72 con la tinta en la posición de 7.1; hora sticky del color del capítulo (32 / 40 / 48); presupuesto de cromo de 7.1; todo objetivo táctil ≥ 48px.
- **¿Motion?** Reveal de foto con `view()`, cortes secos, video de fachada con condiciones de carga. Nada de marca se anima. Sin numeral fantasma.
- **¿Layout base?** Header apilado en mobile y tablet; hero de esqueleto constante con foto-acento; cuatro capítulos con hora sticky y cuatro anatomías (Índice, Plato, Pizarra, Par); Visit en azul con banda de video y tríptico (8+4 en desktop, 5+3 en tablet); Close con los dos relojes. **El diseñador desktop parte del resumen de composiciones de 7.3**, no de la grilla del hero.
- **¿Qué evito?** La sección 15, en especial 3, 4, 13, 17–22.

**Cada viewport es un diseño propio** (paridad de marca, no de layout). **Mientras no hay sesión, se diseña con placeholders con ID y el wordmark v0**; ninguna foto de referencia entra en un archivo de diseño.

---

## 17. Preguntas abiertas para el dueño (vía Pedro)

1. **Q1 — ¿La cocina sirve el menú completo las 24 horas? ¿El desayuno también de madrugada (22:00–05:00)?** ("Breakfast All Day" del cartel ya respalda el desayuno en horario diurno; queda abierta la madrugada.)
2. **Q2 — ¿Permiso para usar el lettering del cartel del techo, redibujado, como logo del sitio?** Condiciona la Etapa B (5.6).
3. **Q3 — ¿El dueño y el personal aceptan salir en fotos?**
4. **Q4 — ¿Qué se vende más de madrugada?** Si no son hamburguesas, cambia la línea `meta` de la Order card de Night (D07 ya no va en la tarjeta, Decisión 24.4).
5. **Q5 — ¿Instagram o Facebook activos? ¿Cuáles son las cuentas?** La tapa del menú impreso (`menu-tapa-2026.jpg`, 2026-11-11) anuncia Facebook, Instagram y www.BuccaneerDiner.com; la investigación encontró 3 páginas de Facebook (una dice "Jackson Heights") y ningún Instagram. Las cuentas confirmadas van al `sameAs` del JSON-LD.
6. **Q6 — Confirmar que la landing va solo en inglés.**
7. **Q7 — ¿Se puede fotografiar el cartel del techo y el frente desde una escalera o desde el techo, apagar los televisores del salón y retirar los manteles de algunas mesas durante la sesión?** Condiciona S08, S09, S04 y D01/D04/D06/D07.
8. **Q8 — ¿Cuál es el logo oficial: el gótico del cartel del techo o el lettering ornamentado de la tapa del menú ("BUCCANEER / Diner Restaurant")?** Son dos dibujos distintos (2026-11-11). La AD toma el del cartel (5.6). Si el dueño dice que es el del menú, el director-creativo revisa el wordmark; **la paleta no cambia** (ver 20.4, fila "Menú impreso").
9. **Q9 — ¿Quiere que aparezca el pirata con el loro (mascota de la tapa del menú)?** Propuesta: solo documental, como la toma S12 (el menú sobre la mesa), nunca como ilustración o motivo gráfico del sitio.

---

## 18. Gates y qué se muestra mientras tanto (B4)

> **Gate #3 (22.4, 22.5):** la Etapa B suma la revisión de los once platos de la Pizarra; la prueba de Night empieza por una pregunta abierta y cuenta solo menciones espontáneas.
> **Decisiones 24.4 y 24.13:** D07 deja de condicionar la Etapa B; el test de legibilidad suma tablet a 132px.

### Etapa A (este documento)
Gate sobre la dirección: aprobado en el gate #4 (23). Las decisiones de la sección 24 pasan al visual-critic junto con los tres diseños ajustados.

### Antes de la sesión — maquetas de estructura (solo internas)
Lo que se le muestra a Pedro mientras no hay fotos reales, rotulado en cada pantalla como **"Structure only — real photography pending"**:
1. Los **4 heros mobile en código**, con placeholders con ID de toma y el **wordmark v0** en su placa, capturados en 375×548 y 390×664 con la línea guía del fold y la prueba de desenfoque: valida el presupuesto 7.2, la jerarquía de 5.5, la paleta por estado y el cambio Rooftop/Neon del wordmark.
2. **Evening B** en mobile y desktop.
3. **Las cuatro anatomías** (Índice, Plato, Pizarra, Par) en mobile y desktop, con las miniaturas IA reales en Plato y Pizarra (es su uso final) y placeholders en las fotos.
4. Un **specimen** de los **7 tokens** (Boulevard, Yolk, Paper, Rooftop, Neon, Harbor, Fog) + wordmark v0 en sus tres piezas + Besley/Bricolage con la escala de 5.5, y la tabla de contrastes 4.3 verificada con herramienta.
5. El header fijo sobre los tres fondos de capítulo, en las tres paletas (matriz de 4.2, regla 8), con la medición de la tinta a ≥ 24px del Yolk en los tres viewports (Decisión 24.1).

Esto no se le muestra al cliente, no pasa por la Etapa B y no se usa para la prueba de 5 segundos (una prueba con rectángulos grises no mide nada). **Ninguna foto IA, stock ni foto de referencia de Google Maps entra en un placeholder de hero, apertura, Night, Visit ni Close**, ni siquiera en estas maquetas.

### Etapa B (gate sobre diseños)
**El re-gate corre sobre capturas reales del sitio en código** (no sobre mockups estáticos), con las tomas reales colocadas, **más el specimen de los 7 tokens** del punto 4 de arriba, ya con S08/S09 calibrados. Se convoca **solo cuando están colocadas S01, D01, D04 y D06** y existen S08 y S09. Para aprobar la Etapa B:
- **wordmark v1** trazado desde S08 según 5.6, con el **test de legibilidad** hecho y registrado en mobile (116/96) y tablet (132), y Q2 respondida (o el fallback de 5.6 decidido por Pedro);
- calibración 4.4 hecha con S08 y S09, y 4.1/4.3 actualizadas si cambió algún matiz;
- **resultado de la condición S08 sobre la serif de los paneles** (5.1) registrado: argumento "voz del cartel" agregado o retirado;
- **control del cast de color** de S01 y S02 según el criterio de 11 (planilla adjunta);
- **los once platos de la Pizarra de Evening revisados** por Pedro o el director contra la DB y fijados por ID (7.3C), con los topes de caracteres de la Decisión 24.10 y registro de fecha, quién y los IDs;
- **prueba de 5 segundos** con 5 personas fuera del equipo, en iPhone real, sobre los **4 heros mobile** con fotos reales. Preguntas: "¿Qué es?", "¿Está abierto?", "¿Qué tocarías primero?" (umbral: ≥ 4 de 5 en cada una, y la Order card en la tercera);
- **prueba específica de Night (riesgo "logo de cadena")**: el hero Night mobile y la vista con la sticky bar Night visible (wordmark Neon en el header, botón Yolk abajo), 5 segundos cada una, con personas distintas de las de la prueba anterior. **Orden de preguntas:** (1) primero, abierta: **"¿Qué es esto?"**; (2) después: "¿Es una cadena o un lugar del barrio?". **Para el umbral solo cuentan las menciones espontáneas de una cadena o marca en la respuesta a la pregunta 1** (IHOP, Denny's, Pepsi, Waffle House, "una cadena", etc.); la respuesta 2 se registra como dato pero no cuenta para el umbral. No se pregunta "¿a qué te recuerda?". **Pasa si ≤ 1 de 5** menciona espontáneamente una cadena o marca. Si **≥ 2 de 5** lo hacen, remedios en este orden, re-testeando después de cada uno: (1) la Order card y el botón sólido de la sticky bar de Night pasan a sólido Paper/Boulevard, y el Yolk de noche queda solo en el focus ring y en los botones de Visit; (2) si sigue fallando, se escala a Pedro con la opción de wordmark Night en Paper (se pierde el cambio de luz del nombre, que es parte del concepto: decisión suya, no del equipo);
- entregables: 12 capturas de hero (4 estados × 3 viewports, vía `?at=`), cada anatomía en mobile y desktop, Visit en mobile y desktop, Close con S10 (o placeholder), la sticky bar en las tres paletas, capturas del fold con línea guía, prueba de desenfoque, una captura por paleta con la medición del rojo de UI (≤ 3%) y la tabla de cromo de 7.1 medida en los viewports de control.

Las demás tomas bloqueantes (S02, S04, S05a, S05b, S06, D09) son condición para **lanzar**, no para la Etapa B; donde falten en la Etapa B, van placeholders con ID.

### Al cliente
El cliente ve el sitio por primera vez **después** de aprobada la Etapa B, con los cuatro estados mostrados lado a lado y luego en vivo.

---

## 19. Cambios tras gate A (2026-11-10)

Se conservan sin cambios: concepto, paleta Boulevard/Yolk/Paper y sus contrastes, Fraunces + Bricolage, gramática de imagen, motion y presupuesto de performance.

| Punto | Qué cambió |
|---|---|
| **B1** Fold mobile | Presupuesto explícito por elemento en 7.2: tarjetas Order/Visit con borde inferior a ≤ 548px. Foto de hero bajada a banda `clamp(148px, 25svh, 200px)`; reloj de 72 a 48px; frase de estado de 40 a 32px con tope de 2 líneas; H1 a 17px y máximo 2 líneas con copy nuevo de 48 caracteres; se eliminó la bajada larga del hero. Nueva **línea fija "Open 24 hours, 7 days · New York time"** debajo del reloj en los cuatro estados. Regla de qué se achica primero y capturas con línea guía como entregable |
| **B2** Luz vs estación | Concepto precisado: "la luz" es la de adentro en cada turno de comida, no la del cielo (sección 1). Heros de Morning, Midday y Evening sin ventana ni cielo en cuadro (shot list 11). Night movido a 22:00–04:59, de noche todo el año en NYC. El pitch dice "sigue los turnos del diner", nunca "sigue el cielo". Anti-patrón 14 |
| **B3** Capítulos repetidos | Los 12 grupos del menú vivo repartidos sin repetir (tabla 7.3). Tres anatomías: Índice, Filas y Filas espejadas, Par. Lo único compartido es la hora sticky. Anti-patrón 13 |
| **B4** Etapa B | Nueva sección 18: la Etapa B solo con S01, D01, D04, D06 y D07 reales en las maquetas, más wordmark resuelto, Evening elegida y prueba de 5 s con fotos reales |
| **W1** Reloj vs Order card | Reloj a 48px mobile, y de noche en Paper (tinta), no Yolk. Yolk de noche reservado a lo accionable (4.2) |
| **W2** Evening | Plan B ascendido a alternativa decidida; A y B se prototipan juntas |
| **W3** Umbral de Night | Night empieza a las 22:00; Evening se extiende a 21:59 (3.1) |
| **W4** LCP | El server calcula el estado y sirve la foto activa con `priority`; las otras tres, lazy (3.3) |
| **W5** Mapa | Imagen propia estática a partir de datos de OpenStreetMap, sin token ni iframe (7.5) |
| **W6** Separadores | Filete a sangre de 2px + aire entre bloques contiguos del mismo color (7.0) |
| **W7** Wordmark | El provisorio queda solo para maquetas internas; resolverlo es condición de la Etapa B |
| **N2** Idioma | Copy visible solo en inglés; nombres internos normalizados en inglés |
| Otros | Grupos y conteos tomados del menú vivo. D09 pasa a bloqueante. Recorte específico del video para la banda del hero Night |

Esta tabla es histórica. Donde las secciones 20 o 21 la contradicen (Fraunces, numeral fantasma, Filas, presupuesto del fold, línea fija), mandan 20 y 21.

---

## 20. Recalibración con referencias reales del local (2026-11-10)

**Qué es.** Pedro consiguió 14 fotos del local (Google Maps, de terceros, algunas con caras). Son **referencia de identidad**: no se publican, no se copian a ningún directorio servido y no entran en maquetas compartidas. Con ellas se recalibró la v2 sin concepto nuevo: el concepto, los cuatro estados, el presupuesto del fold (con su regla), la estructura de bloques y el motion quedaron como estaban. Ninguna foto los contradice; la del letrero los refuerza (sección 1).

### 20.1 Qué muestran las referencias (verificado foto por foto)

Archivos en `scripts/.product-output/reference-buccaneer/`. **†** = foto que el visual-critic no abrió en el gate #2.

| Archivo | Qué se ve | Qué se toma |
|---|---|---|
| `fachada-noche-2019.png` (ene 2019) | Frente nocturno casi frontal: "Diner" y "Buccaneer" en neón rojo gótico angular sobre cornisa de vidrio negro con bordes de acero; **línea de neón turquesa** (no azul) en la cornisa; cartel del techo con paneles "Baking" y "Sea Food"; banderas de EE. UU. y Grecia en el techo; revestimiento de mármol beige; ventanas trapezoidales | Prueba de que el turquesa era de antes y de que los paneles del cartel cambian. El tubo sale quemado a rosa-blanco → regla de exposición |
| `fachada-noche-neon.png` (sin fecha visible) | Esquina de noche, **cielo violeta-índigo**: neón rojo, línea de puntos LED azul arriba y LED rojo abajo; cartel del techo prendido: "B" capital grande roja, "uccaneer" rojo, **"Diner" azul**, panel amarillo "Open 24/7"; banderas en el techo; una camioneta tapa un tercio | Ángulo de S01. Fuente del wordmark v0 (cartel del techo). Dirección de matiz de Boulevard. Prueba del cast violeta → control de color (11). Regla de autos |
| `fachada-atardecer-2026.png` (2026) | Atardecer: "Diner" y "Buccaneer" en neón rojo-naranja prendido; LED azul y rojo en la cornisa; terraza con faroles; cartel del techo con **"Open 24/7" y "Breakfast All Day"** en los paneles amarillo limón, con texto en serif (familia y peso por confirmar con S08); canopy amarillo y rojo de la estación de servicio vecina a la izquierda | Las dos frases verificables. La serif del cartel, condicionada a S08 (5.1). El argumento contra rojo sobre amarillo |
| `fachada-jun-2026.png` † (jun 2026) | Día nublado lavado: letras del frente sin prender, cartel del techo de costado e ilegible | Nada que no esté en otras fotos |
| `fachada-dia-calle.png` (sin fecha visible) | Desde la vereda opuesta de Astoria Blvd: edificio entero, "Buccaneer" plateado sin prender sobre vidrio negro, cartel del techo legible ("Open 24/7", "Buccaneer Diner", "Breakfast All Day"), banderas contra el cielo | Ángulo de S03. Segunda prueba de las frases. Silueta apagada para la v0 |
| `salon-2024.png` (mar 2024) | Salón: paredes crema, moldura bordó, **sillas negras con asiento de vinilo naranja**, mesas redondas con manteles de papel, **cuadro de galeón**, **reloj-timón con ancla**, ventanas trapezoidales con flores pintadas, **cornisa de LED azul** en el cielorraso, TV con noticias, rayos de sol | Contenido de S04 y S10. Regla de TVs y de flare |
| `salon-panoramica.png` † | Mismo salón, más ancho: dos cuadros de barcos, reloj-timón, butacas color caramelo, TV encendida | Encuadre de S04 (refuerza; todo lo necesario está en `salon-2024.png`) |
| `jukebox-mesa-2025.png` (nov 2025) | **Rockola de mesa Rowe/AMI "Compact Disc"** en una butaca junto a la ventana, sobre fórmica moteada, con ketchup, salero, Tabasco y Cholula; detrás, la barra con LED azul | S11. Fórmica de la mesa. Solo se ve una rockola: "una en cada mesa" no se puede afirmar |
| `plato-bagel-salmon-new-yorker.png` † | Bagel con salmón en plato de borde dorado ornamental, butaca de vinilo naranja, fórmica moteada, borde de mantel a cuadros; toma casi cenital | Vajilla y butaca como fondo de D; contraejemplo de ángulo |
| `plato-omelette-western.png` † | Omelette con home fries, plato blanco, mantel de papel con borde magenta | Referencia de D02 |
| `plato-ensalada-griega-pollo.png` † | Ensalada con feta en plato blanco sobre mantel con borde a cuadros rosa y violeta | Damero: retirado de los heros |
| `plato-steak-salad.png` † (dic 2025) | Ensalada con bife, mantel con damero rojo-magenta y azul oscuro, quemada | Contraejemplo de exposición |
| `plato-avocado-toast.png` † (may 2025) | Tostada con palta en plato de borde dorado, manteles con damero, quemada | Contraejemplo de exposición; vajilla |
| `plato-short-ribs-club.png` † | Short ribs en plato de borde dorado; atrás club sandwich, butaca naranja y una comensal con celular; el mantel muestra "Buccaneer" impreso en **gótico relleno, en rojo magenta-rosa**, y promociones recortadas | Refuerza que el gótico relleno del tipo del techo es la forma de la marca en impresos (no el color: no es Rooftop). Contraejemplo de gente en cuadro |

**Correcciones a las notas previas (verificado en las fotos):**
- El cartel con "OPEN 24/7" y "Breakfast All Day" **no es interior**: es la caja de luz del **techo del edificio, afuera**, con los dos paneles amarillos a los costados del nombre.
- La bandera griega está **en un mástil del techo, afuera**, junto a la de EE. UU.
- Las sillas son **de madera negra con asiento de vinilo naranja**; las butacas fijas son de vinilo naranja † o caramelo †.
- Los manteles de papel tienen un **borde de damero rosa-magenta con violeta o azul oscuro** †.
- El azul exterior es **reciente**: en 2019 la línea de la cornisa era neón turquesa; desde las fotos de 2026 es LED azul en puntos. Adentro, la cornisa de LED azul ya está en marzo de 2024.
- Los paneles del cartel **cambian** (2019: "Baking" / "Sea Food").
- **El gótico del frente y el del techo no son el mismo dibujo** (gate #2): el frente es un gótico angular de tubo; el techo, un Old English relleno y contrastado. Canónico: el techo (5.6).

### 20.2 Qué se mantiene

Concepto y texto de la sección 1; cuatro estados y sus horas; tres paletas; presupuesto del fold y su regla; estructura y fondos de bloques; reparto de grupos; gramática de imagen; motion y presupuesto de performance; voz; gates.

### 20.3 Qué cambió y dónde (recalibración; los cambios del gate #2 están en 21)

| Sección | Cambio |
|---|---|
| 0 | Entran "Open 24/7" y "Breakfast All Day" textuales, con re-verificación en S08. Prohibiciones nuevas: origen griego o familiar, rockolas funcionando o en cada mesa, promociones de los manteles |
| 1 | El letrero como prueba del concepto (el wordmark cambia de luz) |
| 3 | "Breakfast time." sin Q1; color del wordmark entre lo que cambia; wordmark como SVG `currentColor` |
| 4 | Rooftop y Neon con regla del rojo; Boulevard `#172645` → `#17225A`; Evening solo B; pin en Neon |
| 5 | Wordmark del letrero en vez de Fraunces; ninguna gótica cargada |
| 6 | Material de identidad solo como fotografía documental |
| 7 | Placa del wordmark; línea fija "Open 24/7"; "Breakfast all day." en Morning y en 7.4; tríptico con rockola; Close con reloj-timón; mapa Boulevard con pin Neon; footer con lockup B |
| 10, 11, 13–18 | Copy, shot list (S08–S11), riesgos, referencias, anti-patrones 17–21, brief, Q7, Etapa B |

### 20.4 Material de identidad: qué entra, dónde y cómo

| Material del local | Entra | Dónde, exactamente | Tratamiento | Qué no |
|---|---|---|---|---|
| **Letrero gótico** | Sí, como marca. **Canónico: cartel del techo** | Header (lockup A), footer y OG (lockup B), favicon (monograma) | Redibujado a mano, relleno, `currentColor` (5.6) | Fuente gótica, tubo dibujado, glow, logo gigante |
| **Rojo del letrero** | Sí, como firma | Wordmark, monograma, pin | Rooftop sobre Paper, Neon sobre Boulevard, ≤ 3% de UI (4.2) | Superficie, botón, link, rojo sobre Yolk |
| **LED azul** | Solo como dirección y en fotos | Matiz de Boulevard; S01, S05a, S05b, S11 | — | Color de UI, separador de puntos (eliminado en 21.8), animación de luces |
| **Paneles amarillos y sus frases** | Las frases sí; el color no | "Open 24/7" y "Breakfast all day" en hero, Morning, 7.4, Visit, Close, metadata | Textual, sentence case. Yolk es un marigold elegido, no el limón del panel | Mayúsculas, reformulaciones con hora, amarillo limón |
| **Serif de los paneles** (familia y peso por confirmar con S08) | Solo si S08 la confirma tipo Clarendon/slab (5.1) | Besley en reloj, frases y títulos (5.1), justificada como serif de rótulo americana | Serif de rótulo de licencia libre | Copiar la fuente exacta del cartel |
| **Caja de luz blanca / vidrio negro** | Sí | Placa del wordmark (7.1) | Rectángulo sólido, radio 0 | Sombras, bordes, cromo |
| **Cuadros de galeones** | Solo documental | Dentro de S04 | Parte del salón, sin recorte | Ícono, ilustración, recorte como sujeto |
| **Reloj-timón con ancla** | Solo documental | S10 en Close | Foto real 4:5 | Ancla o timón como ícono o patrón |
| **Bandera griega (techo)** | Solo documental | Dentro de S01 y S03 | Parte de la fachada | Ícono, colores, grecas, copy sobre origen |
| **Vajilla de borde dorado †** | Solo documental | Platos D cuando la cocina los sirve así | Sin cambiar la vajilla real | Borde ornamental como gráfico o marco |
| **Rockola de mesa** | Solo documental | S11 en el tríptico de Visit | Foto real; tarjetas fuera de foco | Interfaz de rockola, sonido, afirmar que funciona |
| **Manteles con damero †** | Solo documental, fuera de los heros | Platos D no-hero, ≤ 10% del cuadro | Como están | Damero como fondo, borde, separador o color; en D01, D04, D06, D07 |
| **Vinilo naranja** | Solo documental | Fondo desenfocado de D01, D04, D07; S04; S11 | Tercio superior, f/2.8 | Token de color |
| **Fórmica moteada** | Solo documental | Superficie de los platos D | Tal cual | Textura en la UI |
| **Ventanas trapezoidales** | Solo documental | S04, S03 | Parte de la arquitectura | Máscara o `clip-path` |
| **TVs, cartel de salida, decoración estacional** | No | — | Apagados o fuera de cuadro | Cualquier hero con ellos |
| **Neón turquesa (2019)** | No | — | Ya no existe | Cualquier turquesa |
| **Menú impreso: tapa con pirata y loro, lettering ornamentado, marco menta/rosa/turquesa** (`menu-tapa-2026.jpg`, 2026-11-11) | Solo documental (S12), pendiente de Q8 y Q9 | Tríptico de Visit o Close, si el dueño quiere al pirata | Foto real del menú sobre la mesa | Paleta pastel (menta, rosa y turquesa siguen en 4.5), el pirata como ilustración, ícono o patrón, el lettering como fuente. Si Q8 dice que es el logo oficial, el director revisa el wordmark, no los colores |

**Criterio que ordena la tabla:** lo que el barrio ve desde la calle (letrero, frases, voz del cartel) se vuelve sistema; lo que hay adentro (barcos, reloj, bandera, rockola, manteles, butacas) se muestra fotografiado donde está. Así el sitio se parece al local sin disfrazarse de "diner": ningún objeto se convierte en motivo gráfico.

### 20.5 Uso de las fotos de referencia (restricciones)

- Quedan donde están: `scripts/.product-output/reference-buccaneer/`, que está en `.gitignore` (`scripts/.product-output/`) y fuera de `/public`. No se copian, no se mueven, no se suben a Supabase ni a Figma compartido.
- Uso permitido: mirarlas para decidir (este documento), calcar el wordmark v0 para maquetas internas, planificar encuadres de la sesión.
- Uso prohibido: placeholder, mood board para el cliente, presentación, OG, cualquier archivo que salga de la máquina de trabajo. Tienen autoría de terceros (los nombres figuran en las capturas) y caras.

---

## 21. Respuesta al gate Etapa A #2

El visual-critic bloqueó con 9 de 10 categorías entre 8.4 y 8.8 (Dirección artística 9.0, Claridad comercial 9.2), sin pedir rehacer el concepto. Los huecos eran de especificación.

**No se tocaron:** el concepto, el nombre que cambia de luz por token, los contratos de hechos (0), el rol cerrado del rojo (solo se le sumaron reglas), los pares prohibidos, la tabla de contrastes (mismos valores; solo se reetiquetó la fila del separador y se agregaron dos filas de pares ya existentes), la placa del wordmark, el confinamiento náutico/greco a fotografía (20.4), la regla del fold "se achica primero la foto", ni la gramática de imagen (solo se actualizó el nombre de los capítulos donde viven las IA).

| # | Punto del gate | Resolución | Dónde |
|---|---|---|---|
| **21.1** | Derivaciones sobredichas | **Yolk** declarado "marigold elegido, más cálido que el panel" (el panel es limón; hex sin cambio). **Boulevard** declarado elección en la dirección del LED, no el LED; se quitó "cielo del color Boulevard". **Cast violeta de S01:** encuadre (cielo ≤ 25% / ≤ 15% en la toma cerrada) + balance de blancos de carta de gris por serie, definido como corrección técnica y no como filtro, con criterio numérico. **Mantel:** su rojo es magenta-rosa; prueba la forma de la letra, no el color de Rooftop | 1, 4.1, 4.4, 6, 11 (reglas generales y S01), 20.1 |
| **21.2** | Wordmark | **Canónico: cartel del techo** (relleno, contrastado, con las nueve letras); el frente angular de tubo no aporta formas, solo el color de noche. La **"D" y la "i"** del lockup B salen del "Diner" del techo (S08). La "B" del lockup A es la capital del techo a altura de mayúscula, cola recortada a ≤ 20%. **Test de legibilidad** a 116 y 96px en iPhone real de 375pt, 5 personas, pasa con ≥ 4/5, escalones 116 → 132 → monograma. "**Trazado del letrero; Cloister Black solo se consulta**", sin superponer ni copiar archivos de fuente. S08 pasa a ser la fuente del dibujo; S09 queda para calibrar Neon | 5.6, 11.1 (S08, S09), 15.18, 20.1 |
| **21.3** | Fold mobile | Suma corregida (la anterior daba 508/526, no 512/530). **Header apilado** en mobile y tablet: no tapa la foto. **Foto mobile = acento** (detalle identificable, no el cartel entero) con `clamp(164px, 30svh, 200px)`. Nueva suma verificada: **497** en 375×548 y **532** en 390×664, ambos ≤ 548. Regla "se achica primero la foto, hasta 128px" intacta | 7.1, 7.2, 3.1, 11 (reglas generales) |
| **21.4** | Jerarquía | Reloj 48 → **32px**, frase 32 → **26px**, Order card 72 → **80px** con `card-title` **20px**. Cuatro verificaciones medibles (forma rellena más grande, texto de UI más grande, prueba de desenfoque de 8px, "¿qué tocarías?" ≥ 4/5). H1 en 17px **justificado** (semántico, descriptor; piso = body + 600) | 5.5, 7.2, 18 |
| **21.5** | Regla del rojo | El 3% cuenta **solo el rojo de la UI**, con método de medición. **≥ 24px** entre la placa Rooftop y cualquier Yolk. **Neon y Yolk nunca en el mismo componente** (el header no lleva Yolk). **Matriz** de header y sticky bar fijos sobre capítulos de las tres paletas, con filete de 1px que mantiene pares de 4.3 | 4.2 (reglas 3, 6, 7, 8), 4.3 (filas del header), 7.1, 8 |
| **21.6** | Desktop | Composición propia por bloque: Morning "Índice ancho y franja 3:1", Midday "Foto a la derecha, a sangre", Evening "Pizarra de tres columnas", Night "Par desigual", Visit "Llegada" (video 21:9 + datos/mapa + tríptico 8+4), Close "Dos relojes". Resumen comparativo y regla de que ninguno repite la grilla de otro | 7.3 (cada anatomía + resumen), 7.5, 7.6, 16, 11 (formatos 4:3, 3:1, 21:9) |
| **21.7** | Originalidad | **Midday = Plato** (dos principales grandes + una línea "On the side"); **Evening = Pizarra** (tres grupos con los tres primeros platos de la DB cada uno). Ninguna es lista uniforme. **Numeral fantasma eliminado** (token, motion M1 y referencias). **Fraunces reemplazada por Besley** (Google Fonts, OFL, inspirada en el Clarendon de Robert Besley), (ancla en el cartel superada por 22.3: condicionada a S08) | 5.1, 5.5, 7.3, 9, 15.3, 15.13, 15.22 |
| **21.8** | Separador de LED | **Eliminado.** Vuelve el filete continuo (Boulevard sobre Paper, Fog sobre Boulevard). El LED queda como dirección de matiz y en fotos | 4.2, 4.3, 7.0, 20.4 |
| **21.9** | Shot list | **Carta de gris + carta de color** en la primera toma de cada serie, balance registrado, aceptación |R−G|, |G−B|, |R−B| ≤ 6 en el parche gris; superficies neutras del edificio sin violeta/magenta. **Manteles retirados** en D01, D04, D06 y D07; ≤ 10% en el resto | 11 (reglas generales, 11.2), 17 (Q7) |
| **21.10** | Etapa B | Re-gate **sobre capturas reales en código + specimen de los 7 tokens**. Prueba de 5 s con umbrales y **prueba específica de Night** (riesgo "IHOP/Pepsi"): pasa si ≤ 1/5 nombra una cadena; dos remedios decididos de antemano | 18 |
| **21.11** | Fotos no abiertas por el crítico | Marcadas con **†** en todo el documento. Dependen solo de ellas: butacas naranja/caramelo, vajilla de borde dorado, manteles con damero y su color, el gótico del mantel, los contraejemplos de platos. **Ninguna decisión bloqueante depende solo de ellas:** el canónico del wordmark se sostiene por el cartel del techo (`fachada-noche-neon.png`, `fachada-dia-calle.png`); el naranja de las sillas está en `salon-2024.png`; la fórmica, en `jukebox-mesa-2025.png`; el retiro de manteles es una precaución que no requiere la foto | Encabezado, 5.6, 11, 20.1, 20.4 |

Esta tabla es histórica en dos puntos que el gate #3 ajustó: la Pizarra de 21.7 ya no son "tres grupos con tres platos cada uno" (ver 22.1) y el anclaje de Besley en el cartel quedó condicionado a S08 (ver 22.3). Las cifras del fold (497/532) y de la regla 6 (medida desde la placa) quedaron superadas por la sección 24.

---

## 22. Respuesta al gate Etapa A #3

El re-gate #3 bloqueó por una sola categoría, **Composición 8.8**; las otras nueve quedaron en ≥ 9.0. El crítico verificó que no se perdió nada de su lista "no tocar" y aprobó Besley como voz de rótulo. **Se tocaron solo las secciones nombradas** (4.2 regla 7, 5.1, 5.5, 7.3C y su resumen desktop, 18) y las marcas de cambio que las señalan; el resto del documento queda textual. La corrección del coordinador en 4.2 regla 6 ("≥ 500px") se conserva.

| # | Punto del gate | Tipo | Resolución | Dónde |
|---|---|---|---|---|
| **22.1** | Pizarra de Evening: tres grupos iguales (roza D4, cards idénticas en grilla uniforme) | **Bloqueante** | Jerarquía explícita. **Dinner es el principal**: lo encabeza el título del capítulo, lleva miniatura grande (96/120/160px) y **cinco platos en `display-3`**. **Appetizers** es secundario con miniatura de 72px y tres platos uno por línea en `index`. **Bar** es secundario **sin miniatura**, con tres platos en una línea corrida en `body`. Desktop "Plato del día y costado": Dinner en columnas 1–6; Appetizers, Bar y D05 apilados en 7–12 con tres alturas y tres tratamientos. Tablet: Dinner a todo el ancho, Appetizers y Bar 4+4 debajo. Mobile: apilados, Dinner ~2.5 veces el alto de Appetizers, Bar el más bajo y sin miniatura. **Criterio de aceptación escrito: ningún par de grupos comparte a la vez ancho, alto y tratamiento, en ningún viewport.** Resumen desktop actualizado | 7.3 (tabla de capítulos, línea de anatomías, 7.3C, resumen), 5.1 (uso de `display-3`), 5.5 (filas `display-3`, `row`, `index`) |
| **22.2** | Verificación 1 de la jerarquía falsa en Evening (la banda Yolk es un relleno mayor) | Ajuste | Reformulada: la Order card es **la forma rellena más grande dentro de su fondo** (en Evening, dentro de la banda Yolk, que es el fondo y no cuenta) **y la mancha de mayor contraste en la prueba de desenfoque**. La prueba de desenfoque se pide para los cuatro estados | 5.5 |
| **22.3** | Justificación de Besley por "la voz del cartel" dada como hecho | Ajuste | Besley queda justificada como **serif de rótulo americana**, que se sostiene sola. El argumento "es la serif de los paneles" pasa a ser **condicional a S08**: si la toma de los paneles muestra una serif de tipo Clarendon o slab, se agrega como respaldo; si muestra una serif de texto tipo Times, se retira. En ningún caso cambia la fuente. Las menciones de la serif del cartel en 14.6, 20.1 y 20.4 quedan subordinadas a esta condición | 5.1, 18 (registro del resultado) |
| **22.4** | Los "tres primeros por `sort_order`" pueden ser poco apetecibles | Ajuste | La regla de que salen de la DB no cambia. Paso nuevo: **Pedro o el director revisan los once platos (5 + 3 + 3) contra la DB antes de la Etapa B**; los que no sirven se reemplazan por el siguiente del mismo grupo en `sort_order`; la lista se fija por ID de producto, con caída automática al siguiente si un ID desaparece, y la revisión se registra | 7.3C, 18 |
| **22.5** | "¿A qué te recuerda?" induce a nombrar una marca | Ajuste | Primero la pregunta abierta **"¿Qué es esto?"**, después "¿Es una cadena o un lugar del barrio?". **Para el umbral ≤ 1/5 solo cuentan las menciones espontáneas** de cadena o marca en la primera respuesta. Se eliminó "¿A qué te recuerda?". Personas distintas de las de la prueba general | 18 |
| **22.6** | "El header nunca contiene Yolk" falso en desktop Evening (header transparente sobre la banda) | Ajuste | Reformulada: **ningún componente del header usa Yolk como relleno ni como borde**. Se explicita que en desktop Evening el header transparente pasa sobre la banda (columnas 8–12) conservando el relleno y la tinta de sus componentes (8.0:1 contra la banda) y que la placa Rooftop queda a ≥ 500px de la banda | 4.2 regla 7 |

## 23. Gate Etapa A #4 — APROBADO con ajustes menores (2026-11-10)

Visual-critic: 10/10 categorías ≥ 9.0 (Originalidad 9.0, Dirección artística 9.2, Jerarquía 9.1, Tipografía 9.0, Composición 9.0, Premium 9.0, Claridad comercial 9.2, Mobile 9.1, Desktop 9.0, Diferenciación 9.1). Ningún delito D1–D12.

- **Ajuste 1 (cerrado):** las afirmaciones sobre la serif del cartel en 14.6, 20.1, 20.4 y 21.7 quedan como "familia y peso por confirmar con S08", subordinadas a 5.1.
- **Ajuste 2 (cerrado en la Decisión 24.10):** en Evening desktop (7.3C) la alineación del borde inferior de D05 con el link "All 68 dinner dishes →" no cierra con los tamaños escritos (izquierda ~585px, derecha ~790px). Decidir: D05 en otra proporción (2:1 o 16:9) para acercar alturas, o quitar la regla de alineación y declarar qué columna manda el alto. Prohibido resolverlo con ~200px de espacio muerto bajo Dinner (D11).

Siguiente etapa: diseñadores mobile / tablet / desktop sobre esta dirección, y gate Etapa B sobre capturas reales con fotos de la sesión (S08/S09 bloquean).

---

## 24. Decisiones cross-viewport (post diseñadores, 2026-11-10)

**Qué es.** Los tres diseños (`DESIGN_MOBILE_BUCCANEER_V2.md` sección 14, `DESIGN_TABLET_BUCCANEER_V2.md` sección 17, `DESIGN_DESKTOP_BUCCANEER_V2.md` sección 17) reportaron contradicciones y huecos de la AD. Esta sección los decide. Cada decisión está escrita también en su sección, marcada "Decisión 24.N". Los documentos de diseño no se tocaron: los ajustan sus diseñadores con esta tabla y vuelven al visual-critic.

**No cambia nada de lo aprobado en el gate #4:** concepto, hechos, tokens y hex, pares prohibidos y ratios, rol cerrado del rojo, placa, confinamiento a fotografía, gramática de imagen, anatomías y regla de "se achica primero la foto".

| # | Tema | Decisión (concreta y medible) | Origen | Secciones actualizadas |
|---|---|---|---|---|
| **24.1** | Regla 6 (≥ 24px rojo–Yolk) contra el header fijo | **Una regla común: los 24px se miden desde la tinta roja del SVG hasta cualquier píxel Yolk, en flujo y con el header fijo; el fondo opaco del header y su filete cuentan como separación.** Posición de la tinta: mobile header 56, tinta y = 8–32 (25px al Yolk); tablet header **64**, tinta y = 10–37 (28px); desktop header 72, tinta y = 16–48 (25px). Si mobile sube a 132px por el test, header 60 y tinta y = 9–36. **La hora sticky lleva la paleta del capítulo en los tres viewports** (se descarta la tira con la paleta del estado de mobile y la acotación a "layout en flujo" de tablet) | Mobile C1, tablet C6, desktop 1 | 4.2 regla 6, 5.6, 7.1, 7.3 |
| **24.2** | Breakpoints | **Mobile ≤ 719px** (más teléfonos en horizontal: 720–1279 de ancho con alto ≤ 500px). **Tablet 720–1279**: T1 720–1023, T2 1024–1279 (split con header apilado de tablet; se elimina "≥ 1024 pasa al layout desktop"). **Desktop ≥ 1280.** Scroll container `.root-scroll` cuando `(max-width: 767px)` o `(pointer: coarse)` a cualquier ancho, en `buccaneer.css` (la regla global de `globals.css` no se toca); el JS que lee o mueve scroll se gatea con el mismo `matchMedia` | Tablet C2, C3; desktop 10; mobile C9 | 5.5, 7, 7.2, 9, 16 |
| **24.3** | Copy de las Order cards | **Se mantiene el copy de los títulos** ("Order breakfast/lunch/dinner/now": el verbo del turno es el concepto) **y se acepta la altura**: tarjetas de **88px fijos en mobile** (título de hasta 2 líneas), 88 en tablet, 96 en desktop; las dos tarjetas siempre iguales y sin cambio entre estados. Fold: **505 en 375×548, 540 en 390×664** (≤ 548). Línea `meta` de tablet/desktop con **tope de 42 caracteres en 2 líneas**; Morning = **"Breakfast all day — pancakes, the Benedict"** (42); Midday y Evening = "{plato}, {plato}" ≤ 42 elegidos en la revisión de 22.4; Night = "Burgers, disco fries" | Mobile C3, desktop 4 | 5.5, 7.2, 10.2 |
| **24.4** | D07 en la Order card de Night | **Sale de las tarjetas en todos los viewports.** Ninguna tarjeta lleva foto: la igualdad Order/Visit (7.2, 8) vale más que la foto, y a 1280 no entra. D07 baja a prioridad **Media** (material de presentación, OG alternativa nocturna) y deja de condicionar la Etapa B | Tablet C4, desktop 3 | 3.1, 7.2, 8, 11.2, 17 (Q4), 18 |
| **24.5** | Anillo de foco en el header de noche | **Paper (13.5:1) dentro del header y del footer en Sign**; Yolk solo fuera de ellos. Así la regla 7 se cumple también en el foco | Desktop 2 | 4.2 (tabla y regla 7), 4.3, 7.1, 7.7 |
| **24.6** | S05 dos veces | **Se divide en S05a** (barra en diagonal, 4:5 + 3:2, apertura de Midday) **y S05b** (detalle de mostrador de frente, 4:3 + 4:5, tríptico de Visit). Tomas distintas, no recortes de la misma; las dos bloqueantes para lanzar | Mobile C8, desktop 7 | 7.3B, 7.5, 11.1, 18, 20.4 |
| **24.7** | Sticky bar mobile | Columnas **`1fr 1fr 48px`** (Call de **48×48 fijo**; Order y Directions del mismo ancho, 139.5px a 375). **Se oculta mientras cualquier parte de `#bd-close-cta` está en el viewport.** **No se muestra en teléfonos horizontales.** **Tablet sin barra: confirmado** (header con "Order online" y teléfono siempre visibles) | Mobile C2, C5; tablet 5 | 8, 7.6 |
| **24.8** | Cromo fijo | Presupuesto (header + hora sticky + barra, leyendo un capítulo): **≤ 30% del alto visible en mobile, ≤ 15% en tablet y desktop.** Para entrar: hora sticky de **32px en mobile** (antes 40), 40 en tablet, 48 en desktop (solo en la columna de texto); en teléfonos horizontales y tablet corto la hora deja de ser sticky y en horizontal no hay barra. Resultados: 160px (29.2%) en 375×548, 182 (27.4%) en 390×664, 104 (14.9%) en 1024×700, 120 (15%) en 1280×800 | Mobile C6, tablet C12 | 7.1 (tabla), 7.3 |
| **24.9** | Objetivos táctiles | **48px en todo**, los tres viewports (índice, platos, "All N →", líneas de links, botón del header, "Full menu"). **Línea corrida de Bar:** fila `flex-wrap` de links de 48px de alto y ≥ 48 de ancho, separados por un punto medio no interactivo con ≥ 8px entre objetivos; **máximo 1 fila en T2 y desktop, 2 en mobile y T1**. Lo mismo para "On the side" y la línea de Night | Mobile C4 | 7.1, 7.3 (A, B, C, D), 8 |
| **24.10** | D05 en desktop (cierra el ajuste 2 de 23) | **Se ratifica que manda la columna de Dinner**, con las cifras recalculadas por los 48px: Dinner **738px**; costado **449px**; **D05 = 289px de alto en las columnas 8–12** (eje del sitio): **1.61:1 a 1280, 1.82:1 a 1440, 2.17:1 a 1920**, dentro de la banda 3:2–2.2:1, base alineada con "All 68" con 0px de hueco. Se corrige el diseño (357px en columnas 7–12), que a 1920 daría 2.62:1 con los objetivos de 48. Topes en la revisión de platos: Dinner ≤ 30 caracteres, Appetizers ≤ 40, **los tres de Bar con separadores ≤ 48**. Shot list: plato de D05 dentro del 68% central en alto del 3:2 | Desktop 9, sección 23 ajuste 2 | 7.3C, 11.2, 18, 23 |
| **24.11** | Tríptico de Visit | **Se ratifican los dos.** Tablet **5+3** con altura de fila fija por CSS (T1 480px; T2 `clamp(480px, 47vw, 560px)`), la pila iguala a S04 por construcción. Desktop **8+4 con 32px entre S05b y S11** (la caption "The counter." va en ese espacio) y **S04 recortada a ≈ 1.30:1** desde su 4:3: 0px de diferencia de alto | Tablet C10, desktop 6 | 7.5, 11.1 (S04) |
| **24.12** | Huecos sin definir | **Video del hero Night desktop:** corte **1:1 (1080×1080)** del máster de S02; sin él, poster S01 fijo. **Close en Evening:** lleva la banda Yolk (mobile/tablet detrás del bloque de texto; desktop columnas 7 al borde). **"Open in Google Maps":** link de texto, 48px de área, junto a la atribución. **Margen > 1280:** el mayor de 64px, 5% del ancho y (ancho − 1536)/2, tope de contenido 1536, lo que sangra llega al borde; > 1920, marco de 1920 centrado. **Aire a 1920:** regla de **aire interno ≤ 256px** en columnas ancladas; si se pasa, la foto vecina se limita a `100svh − 120px`. **D09:** alto **≤ `100svh − 120px`** (662×680 / 746×780 / 886×960), recorte del 4:5 hacia 1:1; porción dentro del 80% central en alto. **Foto grande de Night:** D09 en tablet y desktop; 50/50 en mobile. **Título "Dinner.":** arriba del grupo Dinner (todo el ancho en mobile y T1; columnas 1–3 en T2; encabeza 1–6 en desktop) | Desktop 8, 11, 12, 13, 16; tablet C8, C9 | 7, 7.3 (C, D, regla de aire), 7.5, 7.6, 9, 10.4, 11 |
| **24.13** | Wordmark en tablet | **Test de legibilidad repetido a 132px** en iPad real en vertical (768–834pt, 45 cm), las dos versiones de color, 5 personas, ≥ 4/5. Si falla: **monograma de 40px** en la placa del header tablet y el nombre en texto en el H1. Desktop (156px) no se testea | Tablet C13 | 5.6, 18 |
| **24.14** | Banda del hero en tablet (2.4–3.5:1) | **Sí: se agrega al shot list** que D01, D04, D06 y S01 tengan el sujeto dentro del **45% vertical central** del máster 3:2 (además del 60% horizontal central), y para desktop dentro del **cuadrado central del 4:5**, con los 72px superiores y la esquina de la placa libres | Tablet C7, 12; desktop 3.4 | 7.2, 11 (reglas generales, S01, D01, D04, D06) |
| **24.15** | Dinner / Appetizers en mobile | La cifra correcta es **~1.6 veces** (con objetivos de 48px), no 2.5. El criterio de aceptación (ningún par igual en ancho, alto y tratamiento) se cumple igual | Mobile C7 | 7.3C |

**Fuera de esta tabla y a cargo de cada diseñador** (no contradicen la AD): margen de 600–719 con contenido de 560px centrado (mobile), S03 debajo del video en mobile, grilla del índice con punto medio por celda, filete vertical de la Pizarra desktop, lenguaje de hover "segundo filete" en desktop (sin rojo, regla 4), presupuesto de performance tablet propuesto (≤ 600 KB primera carga), y la nota de proceso de desktop sobre `constitution-cliente.md` (va al coordinador).


---

## 25. Wordmark gótico (2026-11-23)

**Qué es.** Pedro pidió "súper premium" y la auditoría visual marcó el wordmark como el cambio de mayor retorno: hoy el header dice "Buccaneer" en Besley rojo de ~28px y el gótico del cartel no aparece en la interfaz. Esta sección fija el wordmark definitivo, construido sobre **Manufacturing Consent (OFL 1.1) convertida a trazos** (`wm-a.svg`, `wm-b.svg`), y **manda sobre 5.6, 5.3, 5.1 (párrafo "Al lado del gótico"), 7.1, 7.2 desktop, 7.7, 20.4 (fila "Letrero gótico") y 4.2 regla 1** en todo lo que las contradiga. Lo demás de esas secciones sigue vigente. Las decisiones se citan como "25.N".

**Por qué ahora sí hay un momento grande (revisa "sin logo gigante en el hero", 5.6).** La regla original evitaba que el gótico se volviera decoración. El research sigue en pie: el gótico de diner se lee premium cuando es **un recurso puntual y real**, y cliché cuando se multiplica con glow, cromo y damero. La versión de 5.6 lo dejaba tan chico (156px en una placa) que se leía como texto tipeado, y el hero desktop tiene 250–330px vacíos arriba de la columna de texto (capturas de 1366 y 1920). Se permite **un solo momento grande, en un solo lugar (hero desktop), con un solo dibujo (el del cartel del techo)**. En ningún otro lugar se agranda.

---

### 25.1 Fuente y procedencia (reemplaza el procedimiento de redibujo de 5.6)

- **Base:** Manufacturing Consent, OFL 1.1, convertida a trazos. La fuente **no se carga**: entra solo como SVG en el HTML. Sigue valiendo que ningún texto se compone en gótico (5.3).
- **Licencia:** la OFL permite usar contornos de la fuente en un logotipo (es una obra hecha con la fuente, no la fuente). Igual, el dev deja anotado en el repo el nombre, la versión y la licencia del archivo usado, con su `OFL.txt`. Nada de esto se muestra en el sitio.
- **Se retira** el trazado a mano desde S08 (pasos 1 a 7 de 5.6) y la prohibición de que el dibujo se base en una fuente. S08 sigue en el shot list para calibrar Rooftop (4.4) y verificar "Open 24/7" y "Breakfast all day" (0).
- **Cómo se describe:** "la textura Old English del cartel, con la misma B de doble trazo". **Nunca** "el logo del cartel" ni "la letra del letrero": no es el mismo dibujo.
- **Q2 sigue abierta.** Hace falta el permiso del dueño para usar el gótico como logo del sitio. Si no lo da, rige el fallback de 5.6 (Bricolage 600 en la tinta del estado).

---

### 25.2 Lockups: dos piezas y el monograma

| Pieza | Composición | Dónde | Dónde no |
|---|---|---|---|
| **Lockup A** | "Buccaneer" en una línea | Header (mobile, tablet, desktop) | Hero, footer, OG |
| **Lockup B ("cartel")** | **B capital de dos renglones**, "uccaneer" arriba y **"Diner" en gótico** abajo, como el cartel del techo | **Hero desktop (momento grande, 25.5)**, footer, OG | Header, mobile y tablet fuera del footer |
| **Monograma** | La B sola, del mismo dibujo | Favicon 32, apple-touch-icon 180, ícono 512; fallback del header (5.6) | — |

**"Diner" va en gótico, no en otra voz.** El cartel lo dice en gótico y en azul. Si se pone "DINER" en Bricolage con tracking, se arma el típico logo con descriptor en versalitas espaciadas, que es lo que hace un template. El gótico del cartel es lo real. "Diner" solo existe dentro del lockup B; nunca se compone suelto.

**Por qué el lockup B lleva la B de dos renglones.** La B grande que abarca las dos líneas es lo que hace que el cartel sea un logotipo y no una palabra escrita. El `wm-b.svg` actual pone "Diner" chico y alineado a la derecha debajo de "eer": se lee como texto con una etiqueta abajo. Se recompone como el cartel (25.3).

---

### 25.3 Ajustes de dibujo (solo escala, espaciado y posición sobre los trazos)

**Unidades.** Todas las cifras están en las unidades del SVG de `wm-a.svg`. Ahí la altura-x de "uccaneer" mide **85** (tope de la "u" en y = −85, línea de base en 0) y la B mide **134.5** de tinta (de −129.2 a +5.3). Se escribe *xh* = 85.

**Comunes a las tres piezas:**
1. **Condensado horizontal de 90%** (escala X 0.90, Y 1.00) aplicado al lockup entero, igual para todos los glifos. Acerca la proporción a la del cartel, que es más alta y angosta, y aligera los fustes verticales un 10% (el cartel es más fino que la fuente). **No se pasa de 0.90**: por debajo se deforman las diagonales y los rombos de los remates.
2. **Espaciado igualado por tinta.** En la fuente, los blancos entre letras van de +7.3 a −1.8: "a-n", "n-e", "e-e" y "e-r" se tocan, y a 116px "eer" se vuelve una mancha. Regla: la distancia mínima de tinta entre dos letras vecinas es la **misma en todos los pares**, medida antes del condensado. Cada glifo es un subpath y se mueve como bloque.
3. **Sin redibujar nada.** Sin cambiar el grosor con contornos ni con trazos del color de fondo, sin engrosar los finos, sin retocar nodos.

**Lockup A (header):**
- Blanco entre letras: **0.10 *xh* = 8.5 unidades**, también entre B y u. A tamaños chicos el gótico necesita aire para no cerrarse.
- **B a 1.12×**, anclada en la línea de base (tope en −144.7, cola en +5.9). La B queda un poco más alta que en la fuente y recuerda la capital del cartel. La cola baja menos del 20% (regla de 5.6).
- Resultado: tinta de **700 × 150.6 unidades, proporción 4.65:1**.

**Lockup B (cartel):**
- Blanco entre letras: **0.06 *xh* = 5 unidades**. A tamaño grande el gótico apretado se ve más rico; la diferencia con el lockup A es compensación óptica por tamaño.
- **"uccaneer":** línea de base en y = 0.
- **"Diner" a 0.9×** de la escala de "uccaneer" (altura-x de 76.5). El borde superior de la tinta de la D queda **4 unidades (0.05 *xh*) debajo** de la línea de base de "uccaneer". Línea de base de "Diner" en **y = 121**.
- **B a 1.60×.** Su tinta va de y = −94 (0.1 *xh* por encima del tope de "uccaneer") hasta la línea de base de "Diner" (121). Si no calza exacto, manda la base de "Diner" y el tope se acepta con ±0.05 *xh*.
- **Horizontal:** B de x = 0 a 207. "uccaneer" empieza **0.10 *xh* (8.5)** a la derecha de la tinta de la B. La D empieza **0.5 *xh* (42.5)** a la derecha de la tinta de la B, como en el cartel, donde "Diner" se apoya contra la panza de la B. El hueco bajo "eer" es parte del cartel y no se rellena.
- Resultado: tinta de **734 × 221 unidades, proporción 3.32:1** (*xh* en píxeles = 0.116 × ancho).

**Verificación.** Render del lockup B junto a `roof-dia.png`, a la misma altura. Se revisa a ojo: B de dos renglones, "Diner" debajo y a la izquierda del centro de "uccaneer", ritmo parejo de fustes. Pedro lo aprueba sobre ese render, no sobre los números.

---

### 25.4 Color por superficie (la regla del rojo no se relaja)

| Superficie | "Buccaneer" (y la B) | "Diner" (lockup B) | Fondo |
|---|---|---|---|
| Header y hero en Day (Morning, Midday) | Rooftop `#C8152A` | Boulevard `#17225A` (el azul del "Diner" del cartel) | Paper |
| Header y hero en Lamp (Evening) | Rooftop | Boulevard | Paper (en el hero, ver 25.5: la banda Yolk empieza debajo) |
| Header y hero en Sign (Night) | Neon `#FF5148` | Paper `#FAF4E6` | Boulevard |
| Footer (siempre Sign) | Neon | Paper | Boulevard |
| OG 1200×630 | Rooftop | Boulevard | Paper |
| Monograma | Rooftop | — | Paper |

- **La regla "el rojo nunca pinta UI" no se toca.** El wordmark ya era un uso permitido (regla 1). Lo único que cambia es que a la lista de lugares se suma el **hero desktop (lockup B)**.
- **"Diner" nunca va en rojo**, aunque el "Diner" de la fachada sea neón rojo: el canónico es el cartel del techo, rojo arriba y azul abajo.
- Siguen igual: Rooftop solo sobre Paper, Neon solo sobre Boulevard, ningún rojo sobre Yolk ni sobre foto sin placa, tope del 3% de rojo de UI (estimado del hero desktop con lockup B: ~0.8% del viewport a 1366×900 y ~0.75% a 1920×1080) y 24px como mínimo entre la tinta roja y cualquier píxel Yolk.
- **SVG:** dos `path` por lockup. "Buccaneer" usa `fill: var(--bd-wordmark)` y "Diner" usa la tinta del estado. El color cambia solo por token (3.3).
- El link del header no cambia de color, no se subraya y no tiene efecto al pasar el mouse. El foco usa el anillo del estado (7.1, Decisión 24.5).

---

### 25.5 Dónde y a qué tamaño

**Tabla de tamaños** (ancho de tinta; el alto sale de la proporción):

| Lugar | Pieza | Ancho | Alto de tinta | Posición de la tinta | Placa |
|---|---|---|---|---|---|
| Header mobile (56 + inset) | A | **116px** | 24.9px | **y = 7–32** (24px al borde inferior; regla 6) | Sí (coincide con el fondo) |
| Header tablet (64 + inset) | A | **132px** | 28.4px | **y = 10–38.4** (25.6px) | Sí |
| Header desktop (72) | A | **156px** | 33.5px | **y = 14–47.5** (24.5px) | Sí, 8 × 12px |
| **Hero desktop** | **B** | **`min(26vw, 440px, 3.32 × espacio libre)`**, mínimo 296px | 89–133px | Arriba de la columna de texto (abajo) | **No** (va sobre fondo sólido) |
| Footer | B | **240 / 280 / 320px** (mobile / tablet / desktop) | 72 / 84 / 96px | Primer elemento del footer, alineado a la izquierda con el margen | No |
| OG | B | 480px | 145px | Como en 10.4 | No |
| Close | — | **No lleva wordmark** | — | — | — |
| Capítulos, frase 7.4, Visit | — | No lleva wordmark | — | — | — |

**Mínimos absolutos.** Lockup A: 96px de ancho, el menor tamaño que pase el test de 5.6. Lockup B: 200px; por debajo se usa el A. Monograma: 32px.

**Test de legibilidad.** Se repite con el SVG nuevo, con el protocolo de 5.6 y la Decisión 24.13: lockup A a 96 y 116px en iPhone y a 132px en iPad, en Rooftop y en Neon. El dibujo cambió, así que el resultado anterior no vale. Los escalones de fallback (132px y luego el monograma) siguen igual.

**Header: comportamiento al scrollear.**
- **Mobile y tablet:** lockup A siempre visible. Header opaco y fijo, sin achicarse y sin hide-on-scroll (7.1).
- **Desktop:** mientras el lockup B del hero está a la vista, **el header no muestra el lockup A**. Se oculta con `visibility: hidden` y conserva su lugar para que la derecha no se mueva. Así nunca hay dos logos en pantalla, y la esquina de la foto queda limpia: se acaba la placa sobre la foto.
- **El relevo:** el lockup A aparece **de golpe, sin transición**, cuando el borde inferior del lockup B pasa por debajo de los 72px del header (IntersectionObserver sobre el lockup B, con `rootMargin` superior de −72px). Es un corte seco, como los cortes entre capítulos.
- **Sin morph.** Prohibido animar un lockup que se achique y viaje al header.
- Si la página carga a mitad del scroll, o si el hero no muestra el lockup B (alto insuficiente, ver abajo), el header muestra el lockup A desde el inicio.

**El momento grande: hero desktop (≥ 1280).** "El cartel va en el techo": el lockup B corona la columna de texto como el cartel corona el edificio.
- **Horizontal:** tinta alineada a la izquierda con la columna de texto (inicio de la columna 8 + 24px). Sin sangría óptica de la B hacia la foto. Lo que sobra a la derecha queda libre.
- **Vertical:** tope de la tinta en **y = 104** (72 del header + 32). El bloque de texto sigue alineado abajo, como hoy.
- **Aire entre el lockup y el reloj:** mínimo **56px**, máximo **256px** (la regla de aire interno de la Decisión 24.12). Si el aire pasa de 256, el lockup baja hasta quedar a 256 del reloj, y el aire que sobra queda arriba, entre el header y el lockup: cielo sobre el cartel, nunca hueco debajo de las tarjetas.
- **Espacio libre** = tope del reloj − 104 − 56. En la build actual el bloque de texto más su padding inferior mide ≈ 552px (captura de 1366), así que el espacio libre es ≈ `100svh − 712px`. El dev mide la constante real y la fija.
- **Si el ancho calculado da menos de 296px** (alto visible menor a ~801px), **el hero no muestra el lockup B** y el header muestra el lockup A todo el tiempo. Nunca se agranda el hero ni se bajan las tarjetas para hacerle lugar: las tarjetas siguen siendo lo primero que se toca (5.5). Referencias:
  - 1280×800: 296–333px.
  - 1366×900: 355px (107px de alto).
  - 1440×900: 374px.
  - 1920×1080: 440px (133px de alto; aire hasta el reloj de ≈ 160px).
  - 1366×768 y 1536×864 con barras del navegador: sin momento grande, lockup A en el header.
- **Área de respeto:** 0.5 *xh* libre de texto y controles por lado (21–26px). El borde de la foto, a 24px, es otro plano y se acepta. Los botones del header terminan en y = 60, a 44px del lockup.
- **Evening (Lamp):** la banda Yolk **ya no ocupa todo el alto del hero**. Empieza **32px arriba del tope del reloj** y baja hasta el pie del hero; la franja de arriba de la columna (header y lockup) queda en Paper. Así:
  - la tinta Rooftop queda a ≥ 24px del Yolk (regla 6);
  - el header desktop ya no pasa sobre la banda (se cierra el caso de 22.6 y de la regla 7);
  - la columna repite el cartel real: caja blanca con el nombre arriba y panel amarillo abajo.
  - Esto reemplaza "la banda Yolk ocupa … a todo el alto del hero" de 7.2. Close en Evening no cambia (no lleva wordmark).
- **Jerarquía (5.5, verificaciones 1 y 3):** la prueba de desenfoque de 8px en 1280×800, con el lockup puesto, para los cuatro estados. La Order card tiene que seguir siendo la mancha de mayor contraste: Boulevard sobre Paper (13.5:1) contra el lockup Rooftop (5.3:1); de noche, Yolk sobre Boulevard (8.0:1) contra el lockup Neon (4.6:1). Si falla, el lockup baja al mínimo de 296px; no se toca la card.
- **Besley y gótico:** el lockup B y el reloj comparten columna, pero no bloque. Los separan al menos 56px; son el cartel y el panel. Sigue prohibido que compartan línea.
- **Accesibilidad:** el lockup B del hero lleva `aria-hidden="true"` (el nombre ya está en el H1) y no es link. El del footer lleva `role="img"` y `aria-label="Buccaneer Diner"`. El del header es el contenido del link al tope de la página, con el mismo `aria-label`.

**Tablet T2 y mobile:** no tienen momento grande en el hero. El fold mobile (505/540 ≤ 548) no tiene lugar, y en Night la banda mobile ya muestra el "Buccaneer" del neón real. La identidad en mobile la llevan el lockup A del header y el lockup B del footer.

**Peso:** lockup A ≤ 4 KB y lockup B ≤ 6 KB después de SVGO (1 decimal). El lockup B se define una sola vez como `<symbol>` y se usa en el hero y en el footer.

---

### 25.6 Qué NO hacer

1. Brillo de cualquier tipo: `text-shadow`, `drop-shadow`, blur, halo, resplandor o `mix-blend-mode`. El neón se cita con el color (regla 5 de 4.2).
2. Tubo dibujado: contorno o línea interna doble que imite el neón de la fachada. Tampoco versión solo-contorno.
3. Cromo, dorado, foil, gradiente, bisel, extrusión 3D ni sombra proyectada.
4. Animación de cualquier tipo: encendido, parpadeo, barrido de luz, entrada en el scroll, morph al header, parallax, hover. El único cambio es de token al cargar el estado y el relevo seco del header desktop (25.5).
5. Textura gastada, grunge o efecto "vintage". El cartel está limpio.
6. Rotar, inclinar, arquear o poner en perspectiva el lockup, como sale en las fotos de la fachada.
7. Adornos agregados: estrellas, ancla, timón, pirata, "Est." o "Since", "24/7" dentro del lockup, emblema circular, filetes que lo enmarquen, damero.
8. "Diner" en rojo, en Besley o en Bricolage, en versalitas con tracking, o compuesto suelto en gótico fuera del lockup B.
9. Lockup B en el header. Lockup A agrandado como recurso. Cualquier lockup por encima de 440px de ancho en pantalla.
10. Logo gigante en el footer (más de 320px), marca de agua, patrón o fondo hecho con el gótico.
11. Wordmark en Close, capítulos, frase 7.4, Visit, sticky bar, Order card o Visit card.
12. Rojo sobre Yolk o sobre foto sin placa. Neon sobre Paper. Rooftop sobre Boulevard.
13. Condensar por debajo de 0.90, cambiar la escala de la B fuera de lo fijado en 25.3, o deformar un glifo suelto.
14. Dos logos góticos a la vez en el mismo viewport de UI (el neón de una foto no cuenta).

---

### 25.7 Entrega y verificación (antes de pushear)

- Capturas del hero desktop en 1280×800, 1366×900, 1440×900 y 1920×1080, en los cuatro estados (`?at=0800`, `?at=1300`, `?at=1800`, `?at=2300`); 1366×768 para confirmar el fallback; header mobile en 375 y 390 en Day y en Night; footer en los tres viewports.
- Medidas que se adjuntan: tinta del header a ≥ 24px del borde inferior; rojo a ≥ 24px de Yolk en Evening desktop; aire entre lockup y reloj entre 56 y 256; rojo de UI ≤ 3%; prueba de desenfoque.
- Render del lockup B junto a `roof-dia.png` para aprobar el dibujo (25.3).
- **Pedro aprueba** sobre esas capturas antes del commit (regla de no pushear diseño sin renderizarlo).
- **Abiertas, solo para Pedro:** Q2 (permiso del dueño) y el visto bueno al cambio del trazado a mano por la fuente OFL (25.1).
