# Brief: MENIUS counter app — sonidos, colores, confiabilidad, PIN e IA

## ⚠️ Contexto real del repo (leer primero)
Este brief se escribió antes de revisar el código. Ajustes obligatorios:
- **Archivos ya ubicados en esta rama**: los sonidos están en `public/sounds/<tema>/` y el catálogo en `src/lib/sound-themes.ts`. No hay que copiar nada desde `menius-sounds/`.
- **Audio**: `src/components/orders/CounterView.tsx` YA usa Web Audio (AudioContext + decodeAudioData + gate de desbloqueo) con `/sounds/new-order.mp3` y `/sounds/order-accepted.mp3`. **Extiende esa implementación** (cargar el tema elegido, loop, urgente, variaciones); no crees un motor paralelo. Mantén los dos MP3 actuales como fallback.
- **Importación de menú con IA**: YA existe `src/app/api/ai/import-menu/route.ts`. La sección 8 pasa a ser **revisar y mejorar** lo existente (pantalla de revisión, marcar baja confianza, no publicar sin confirmar), no crear otra.
- **Impresión**: la app Android (`apps/menius-counter-android/`) YA imprime por **Bluetooth ESC/POS** (`MeniusAndroid.printReceipt`). La impresión en la nube (sección 6.1) es una **opción adicional** por restaurante; no romper ni quitar la vía Bluetooth.
- **Audio en la app Android**: verifica que el loop de alerta y el desbloqueo funcionen dentro del WebView (en `CounterView` hay lógica `inApp`).
- Sigue todas las reglas de `CLAUDE.md` (RLS, `schema.sql` como fuente de verdad, migraciones nuevas e inmutables, `getTenant()`, Zod, etc.).
- Verifica si ya hay integración de SMS/Twilio en el repo antes de agregarla.

## Contexto
La tablet del restaurante (dashboard de órdenes) necesita:
1. Una **alerta** que suene en loop cuando llega una orden nueva, hasta que alguien la acepte.
2. Una versión **urgente** si nadie acepta en 30 segundos.
3. Un **sonido de aceptada** cuando se acepta (una de 3 variaciones, elegida al azar).
4. Que cada restaurante elija su **tema de sonido** y su **color de pantalla** en ajustes.

Antes de escribir código, revisa la estructura actual del proyecto (dashboard de órdenes, página de ajustes del restaurante, tabla de restaurantes/tenants en Supabase, cómo llegan las órdenes en tiempo real) y adapta esto a lo que ya existe.

## Sonido oficial
**Firma** es el sonido oficial de MENIUS: default para todos los restaurantes nuevos, siempre primero en el selector con una etiqueta "Oficial", y el que se usa en el modo demo, la landing y cualquier video de marketing. Su código fuente queda en `firma-source-gen.py` (no se despliega; es para regenerarlo).

Todos los demás temas quedan como **opciones secundarias** que el cliente puede escoger libremente desde la counter app. En el selector: Firma arriba destacada; debajo, una fila de "Recomendados" (aurora, diner, entertainer, chonta); el resto detrás de un botón "Ver todos los sonidos", agrupado por categoría.

## Archivos incluidos
- `public/sounds/<tema>/alert.mp3`, `urgent.mp3`, `accepted-1.mp3`, `accepted-2.mp3`, `accepted-3.mp3`: 19 temas, 95 archivos. Cópialos tal cual a `/public/sounds`.
- `public/sounds/bonus/feliz-cumpleanos.mp3`: sonido especial (ver sección 5).
- `sound-themes.ts`: el catálogo con ids, nombres y descripciones. Ponlo en `lib/`.

## 1. Base de datos (Supabase)
Migración que agregue a la tabla de restaurantes (o settings del tenant):
- `sound_theme text not null default 'firma'` con check contra los 19 ids.
- `sound_volume smallint not null default 80` (0–100).
- `screen_theme text not null default 'menius'` (ver sección 4).
- `custom_accent text null` (hex, opcional).
- `staff_can_customize boolean not null default true`.
- `urgent_after_seconds smallint not null default 30`.

Respeta las políticas RLS existentes: solo el owner/staff del restaurante puede leer y editar sus settings.

## 2. Motor de audio (hook `useOrderSounds`)
- Usa **Web Audio API** (`AudioContext` + `decodeAudioData`), no `<audio>`: menos latencia y loop confiable.
- **Precarga** los 5 archivos del tema activo al montar el dashboard.
- **Desbloqueo**: los navegadores bloquean audio hasta la primera interacción. Muestra un overlay de pantalla completa "Toca para activar alertas de órdenes" que llame a `audioContext.resume()`. No ocultes el overlay hasta que `state === 'running'`.
- **Loop de alerta**: mientras haya ≥1 orden en estado pendiente, reproduce `alert` cada 3.5 s. Después de `urgent_after_seconds` desde la orden pendiente más antigua, cambia a `urgent` cada 3.5 s.
- **Al aceptar**: detén el loop de inmediato (si no quedan pendientes) y reproduce un `accepted-N` al azar, sin repetir el mismo dos veces seguidas.
- Si hay varias órdenes pendientes a la vez, **un solo loop**, no uno por orden.
- **Volumen** con un `GainNode` según `sound_volume`.
- Reanuda el `AudioContext` en `visibilitychange` (iOS lo suspende).
- **Wake Lock API** (`navigator.wakeLock.request('screen')`) para que la tablet no se duerma; vuelve a pedirlo al regresar a la pestaña.

## 3. Personalización DESDE LA COUNTER APP (prioridad)
El selector de sonido y color debe estar **dentro de la counter app** (la tablet del dashboard de órdenes), no solo en el panel de ajustes del restaurante. Es quien está en el counter todo el día el que decide.

- Botón con ícono (paleta/engranaje) en el header de la counter app que abre un **panel lateral (sheet)** con 3 pestañas: **Sonido**, **Colores**, **Volumen**.
- **Sonido:** grid de tarjetas por categoría (Firma, Premium, Clásicos, Culturales, Famosos). Al tocar una tarjeta suena `alert` y 1.5 s después `accepted-1`; un botón "Usar este" la aplica.
- **Colores:** tarjetas con preview en miniatura de cada tema (ver sección 4), más un **color picker de acento personalizado**. El cambio se ve en vivo en toda la pantalla mientras navega; "Usar este" lo guarda.
- **Volumen:** slider con preview inmediato.
- Los cambios se guardan en Supabase por restaurante y se sincronizan en vivo (Realtime) a todas las tablets del mismo restaurante.
- **Permisos:** cualquier usuario del staff con acceso a la counter app puede cambiarlo. Agrega en los ajustes del owner un toggle "Permitir al staff cambiar sonido y colores" (default: sí); si está apagado, el panel pide el PIN del owner.
- No pausar ni tapar las órdenes: si llega una orden con el panel abierto, la alerta suena igual y el panel se cierra solo.
- El panel de ajustes del owner muestra las mismas opciones (misma componente reutilizada).

## 4. Temas de color de pantalla
Implementa con CSS variables (`--kds-bg`, `--kds-surface`, `--kds-text`, `--kds-muted`, `--kds-accent`, `--kds-alert`, `--kds-success`) aplicadas con un `data-theme` en el contenedor de la counter app. Temas iniciales:

**Oficial (default):**
- `menius`: el verde que la counter app usa HOY. No lo inventes: extrae los colores exactos actuales del código (Tailwind config, CSS variables o clases usadas en la counter app) y conviértelos en este tema, para que nada cambie visualmente para los restaurantes que ya la usan. Va primero en el selector con la etiqueta "Oficial", igual que Firma en sonidos. Todos los demás temas son opcionales.

Oscuros (recomendados para turnos largos):
- `midnight`: casi negro con azul eléctrico.
- `forest`: verde profundo con dorado.
- `ocean`: azul marino con turquesa.
- `sunset`: grafito con naranja coral.
- `royal`: morado oscuro con champagne.
- `espresso`: café oscuro con crema y cobre.
- `neon`: negro con magenta y cian, estilo Miami.

Claros (para lugares con mucha luz):
- `daylight`: blanco de alto contraste con azul.
- `diner`: crema con rojo cereza y cromado (estilo diner americano clásico).
- `blush`: blanco cálido con rosa palo.
- `mint`: blanco con verde menta.

Además: **acento personalizado** (color picker). Con el color elegido, genera automáticamente las variantes de hover/fondo suave y elige texto blanco o negro según contraste. Guarda `screen_theme` + `custom_accent text null` (hex).

Verifica contraste WCAG AA (texto ≥ 4.5:1) en todos los temas y bloquea acentos personalizados que no lo cumplan sobre el fondo (muestra aviso y sugiere uno cercano que sí cumpla).

## 4b. Modo demo (para vender)
Botón "Modo demo" en el panel de la counter app (visible solo para owner/admin de MENIUS) que simula el flujo completo para mostrárselo a un dueño de restaurante:
1. A los 2 s entra una orden falsa ("Mesa 4 · 2 burgers, 1 milkshake · $38.50"): suena la alerta, pulsa la pantalla y aparece la tarjeta.
2. Si no se acepta en 10 s (en demo, no 30), pasa a urgente.
3. Al aceptarla suena la aceptada y pasa a "en preparación".
4. Entran 2 órdenes más (una pickup y una delivery) con 4–6 s de separación.
5. Al terminar, tarjeta resumen: "3 órdenes · $112 · Lista para tu restaurante".
6. Banner fijo "MODO DEMO" visible todo el tiempo, y un botón para salir.

**Regla crítica:** las órdenes demo viven solo en memoria del cliente (estado local), nunca se escriben en Supabase, nunca disparan notificaciones reales, impresoras, emails ni Stripe, y no aparecen en reportes.

## 5. Extras (si da el tiempo)
- **Flash visual**: cuando llega una orden, la pantalla pulsa suavemente con `--kds-alert`, por si no se oye.
- **Anuncio por voz opcional**: `speechSynthesis` diciendo "Nueva orden, mesa 5" después del sonido (toggle en ajustes, idioma configurable).
- **Horario silencioso**: bajar el volumen automáticamente en ciertas horas.
- **Cumpleaños**: si una orden trae una nota con "cumpleaños"/"birthday" (o un checkbox de cumpleaños en el checkout), al aceptarla suena `BIRTHDAY_SOUND` en vez de la aceptada normal, y la tarjeta de la orden muestra un ícono de pastel para que el staff lleve el postre o cante.

## 6. Confiabilidad: que nunca se pierda una orden
Objetivo: que fallen varias cosas a la vez antes de perder una orden. Bluetooth NO se usa para imprimir (se desconecta, y Safari en iPad no soporta Web Bluetooth).

### 6.1 Impresión en la nube (independiente de la tablet)
La impresora se conecta por cable de red y consulta (polling) al servidor de MENIUS cada pocos segundos. Imprime aunque la tablet esté apagada.

- Soportar **Star CloudPRNT** primero (Star mC-Print3 / TSP143IV) y dejar la arquitectura lista para **Epson Server Direct Print** (TM-m30III). **Antes de implementar, lee la documentación oficial de cada protocolo**; no asumas el formato de memoria.
- Tabla `printers`: `id`, `restaurant_id`, `name`, `protocol` ('star_cloudprnt' | 'epson_sdp'), `token` (secreto aleatorio), `mac`, `last_poll_at`, `last_status jsonb`, `paper_low bool`, `online bool`, `print_on` ('arrival' | 'accept').
- Tabla `print_jobs`: `id`, `printer_id`, `order_id`, `status` ('pending' | 'sent' | 'printed' | 'failed'), `attempts`, `created_at`, `printed_at`, `error`. Con RLS por restaurante.
- Route handlers en Next.js: `/api/print/cloudprnt/[token]` (POST de estado → responde si hay trabajo; GET → entrega el ticket; DELETE → confirma impresión y marca `printed`). Igual para Epson en `/api/print/epson/[token]`. El token identifica y autentica la impresora; usa el service role de Supabase solo del lado del servidor.
- Crear el `print_job` automáticamente (trigger o en la misma transacción) cuando la orden llega o se acepta, según `print_on`.
- Un trabajo que no se confirma en 60 s vuelve a `pending` (máximo 3 intentos, después `failed` y alerta).
- Guardar el estado que reporta la impresora (sin papel, tapa abierta, error) y mostrarlo en la counter app con un banner.
- Pantalla de ajustes "Impresoras": agregar impresora, mostrar la URL que se pega en la configuración de la impresora, botón "Imprimir prueba", y estado en vivo (en línea / última conexión / papel).
- Diseño del ticket: logo/nombre del restaurante, número de orden grande, tipo (mesa/pickup/delivery), items con modificadores, notas resaltadas, total, hora.

### 6.2 Monitoreo y alertas fuera de la tablet
- La counter app manda un heartbeat a `/api/devices/heartbeat` cada 30 s. Tabla `devices`: `id`, `restaurant_id`, `name`, `last_seen_at`, `app_version`, `battery`, `charging`.
- Job programado cada minuto (Vercel Cron o pg_cron + edge function, lo que ya use el proyecto) que revisa:
  1. Órdenes pendientes hace más de 90 s **y** ninguna tablet vista en los últimos 90 s → SMS al dueño ("MENIUS: tienes una orden nueva y tu tablet no responde"). Si a los 3 min sigue pendiente → llamada automática.
  2. Impresora sin polling en 3 min, o `print_job` en `failed` → SMS.
  3. Tablet con batería < 20% y sin cargar → aviso en la app y SMS.
- SMS y llamadas con **Twilio** (variables de entorno, nunca en el cliente). No mandar más de 1 SMS por tipo de alerta cada 10 min por restaurante.
- Ajustes del dueño: teléfono(s) de alerta, toggles por tipo de alerta, botón "Enviar SMS de prueba".
- Tabla `alerts_log` para auditar qué se envió y cuándo.

### 6.3 Resiliencia de la counter app
- Si se pierde la conexión: banner rojo fijo "Sin conexión — las órdenes pueden no llegar", sonido distinto (urgent del tema) cada 30 s hasta que vuelva, y reconexión automática de Realtime con backoff.
- Al reconectar: volver a cargar órdenes pendientes desde la base de datos (no confiar solo en eventos de Realtime perdidos).
- Respaldo por polling: además de Realtime, consultar órdenes pendientes cada 15 s.
- Mostrar en el header: estado de conexión, impresora(s) y batería.

## 7. Botón counter ↔ dashboard (con PIN)
- En el header de la counter app: botón "Panel" que lleva al dashboard del dueño. En el dashboard: botón "Abrir counter".
- La tablet del counter es compartida, así que entrar al panel desde ahí **pide el PIN del dueño**:
  - El dueño crea un PIN de 4–6 dígitos en sus ajustes. Se guarda **hasheado** (bcrypt/argon2), nunca en texto plano, y se verifica **en el servidor**.
  - Máximo 5 intentos fallidos; después, bloqueo de 5 minutos.
  - Sesión de panel desbloqueada por 10 min de inactividad; luego vuelve sola a la counter app.
  - Registrar en un log cada entrada al panel desde el counter (fecha, dispositivo).
- Si el usuario ya tiene sesión de owner/admin (por ejemplo, en su celular), el botón no pide PIN.
- El mismo PIN sirve para el bloqueo de personalización de la sección 3.
- Mientras el panel está abierto en la tablet, las alertas de órdenes **siguen sonando** y se muestra un aviso para volver al counter.

## 8. IA: importar el menú desde foto o PDF
Objetivo: que un restaurante nuevo tenga su menú montado en minutos, no en horas. Es la principal herramienta de venta.

- En el panel del dueño, "Importar menú con IA": sube una o varias fotos (JPG/PNG/HEIC) o un PDF del menú impreso.
- Ruta de servidor que envía las imágenes a la **API de Claude** (`@anthropic-ai/sdk`, con visión). Revisa la documentación actual en https://docs.claude.com para el modelo vigente y el formato de salida estructurada; no asumas el ID del modelo de memoria. API key solo en variables de entorno del servidor.
- Pedir salida JSON con esquema estricto (validar con zod): categorías → items con `name`, `description`, `price` (número), `variants`/tamaños con precio, `modifiers` si aparecen, y `confidence` por item. PDFs de varias páginas: procesar página por página y unir.
- **Pantalla de revisión obligatoria**: tabla editable con todo lo extraído, items de baja confianza o sin precio resaltados en amarillo, opción de borrar/editar/mover entre categorías. **Nunca publicar automáticamente**: el dueño confirma y recién ahí se guarda en las tablas de menú existentes (adaptar a la estructura actual del proyecto).
- No inventar: si un precio no se lee, queda vacío y marcado; no estimar.
- Límite de uso por restaurante (por ejemplo, 10 importaciones al día) y registro de costo por llamada.
- Bonus si da el tiempo: botón "Mejorar descripciones" que sugiere descripciones atractivas para items sin descripción, siempre como sugerencia editable.

## Orden de implementación (por fases)
Implementar y probar cada fase en el Buccaneer antes de seguir:
1. Sonidos, colores, personalización en la counter app y modo demo (secciones 1–4).
2. Botón counter ↔ dashboard con PIN (sección 7).
3. Impresión en la nube (6.1) y resiliencia de la app (6.3).
4. Monitoreo y alertas por SMS (6.2).
5. Importación de menú con IA (sección 8).

## Criterios de aceptación
- [ ] Con la tablet en reposo y una orden nueva, la alerta suena en menos de 1 s y se repite hasta aceptar.
- [ ] A los 30 s sin aceptar cambia a urgente.
- [ ] Al aceptar se corta la alerta y suena una aceptada distinta a la anterior.
- [ ] Desde la counter app se puede cambiar sonido, color y volumen, con preview en vivo, y se aplica a todas las tablets del restaurante sin recargar.
- [ ] El acento personalizado nunca deja texto ilegible.
- [ ] El modo demo funciona completo y no deja ningún registro en la base de datos.
- [ ] Con la tablet apagada, una orden nueva se imprime igual en la impresora de red.
- [ ] Con la tablet apagada, a los ~90 s de una orden pendiente llega un SMS al dueño.
- [ ] Si la impresora se queda sin papel, la counter app lo muestra y llega un SMS.
- [ ] Si se corta el internet de la tablet y vuelve, aparecen todas las órdenes pendientes sin recargar.
- [ ] Desde el counter, el botón "Panel" pide PIN, bloquea tras 5 intentos y vuelve solo al counter tras 10 min.
- [ ] Con el panel abierto en la tablet, una orden nueva sigue sonando.
- [ ] Subiendo una foto de un menú real (el del Buccaneer), la IA extrae categorías, items y precios, y nada se publica sin confirmación del dueño.
- [ ] Funciona en Safari iPad y Chrome Android después del tap de desbloqueo.
- [ ] La pantalla no se apaga mientras el dashboard está abierto.

---

## Anexo A: Catálogo de temas de sonido
| Categoría | Tema (id) | Descripción |
|---|---|---|
| Oficial | Firma (`firma`) | Sonido oficial de MENIUS: celesta y arpa en Sol lidio, con swing |
| Premium | Aurora (`aurora`) | Arpegio FM brillante que resuelve a mayor |
| Premium | Cristal (`cristal`) | Cuenco tibetano y copa de cristal |
| Premium | Lounge (`lounge`) | Vibráfono y piano eléctrico |
| Premium | Reloj antiguo (`reloj`) | Carillón con tic-tac |
| Premium | Arpa celestial (`arpa`) | Glissando de arpa y celesta |
| Premium | Handpan (`handpan`) | Tambor metálico cálido |
| Clásicos | Mozart (`mozart`) | Eine kleine Nachtmusik |
| Clásicos | Für Elise (`beethoven`) | Beethoven |
| Clásicos | Bach (`bach`) | Preludio en Do |
| Clásicos | Himno a la Alegría (`oda-alegria`) | Beethoven |
| Culturales | Marimba de chonta (`chonta`) | Currulao del Pacífico colombiano |
| Culturales | Classic Diner (`diner`) | Campana de servicio y doo-wop |
| Famosos | The Entertainer (`entertainer`) | Scott Joplin |
| Famosos | Marcha turca (`marcha-turca`) | Mozart |
| Famosos | Guillermo Tell (`guillermo-tell`) | Rossini |
| Famosos | Rey de la montaña (`rey-montana`) | Grieg |
| Famosos | Danubio azul (`danubio`) | Strauss |
| Famosos | La cucaracha (`cucaracha`) | Folclor latino |
| Bonus | Feliz cumpleaños | Sonido especial para órdenes de cumpleaños |

Recomendados en el selector: firma (destacada), aurora, diner, entertainer, chonta. El resto detrás de "Ver todos los sonidos".

Todas las melodías clásicas y famosas son de dominio público; los arreglos y el audio fueron sintetizados desde cero (sin samples).

## Anexo B: Hardware recomendado (no es código, es contexto)
- **Impresora:** Star Micronics **TSP143IVUE gris, número de parte 39473010** (USB-C + Ethernet, CloudPRNT Next). Incluye fuente interna y cables USB y LAN. No comprar versiones "SK" (papel adhesivo). Los QR se imprimen como imagen o con el comando de código de barras del protocolo.
- **Red:** la impresora se conecta por cable a la red del restaurante (router Fios). Si el router está lejos del counter: switch pequeño en un cable existente, cable por el techo, o extensor WiFi con puerto Ethernet. Alternativa: versión WiFi TSP143IV UEWB.
- **Tablet:** siempre conectada al cargador, modo kiosko (Acceso Guiado en iPad / kiosk mode en Android), auto-lock desactivado, y límite de carga al 85% si el equipo lo permite.
- **Internet:** idealmente router con respaldo 4G/5G (failover).
- **Servicios externos que hay que crear:** cuenta de Twilio (SMS y llamadas) y API key de Anthropic (importación de menú con IA).

## Anexo C: Ideas para después (NO implementar todavía)
Para contexto de hacia dónde va el producto; no forman parte de las fases actuales:
1. **QR en los tickets de delivery** con mensaje tipo "Pide directo la próxima vez y ahórrate 10%", para llevar clientes de las apps de delivery a MENIUS sin comisión.
2. **Métricas del piloto:** tiempo promedio de aceptación, órdenes perdidas, ventas por canal y comisiones ahorradas frente a las apps.
3. **Resumen semanal con IA** para el dueño.
4. **Agente telefónico con IA** que tome órdenes por teléfono y las mande a la counter app.
5. **Sonidos por tipo de orden** (mesa / pickup / delivery) y aceptada especial para órdenes grandes.
