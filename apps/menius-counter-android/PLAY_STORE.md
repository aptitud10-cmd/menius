# MENIUS Counter — ficha de Google Play

Todo lo que pide Play Console para publicar, listo para copiar y pegar.
Idioma principal de la ficha: **English (United States)**; traducción **Spanish (Latin America) – es-419**.

## Datos básicos (Crear app)

| Campo | Valor |
|---|---|
| Nombre de la app | MENIUS Counter |
| Idioma predeterminado | English (United States) – en-US |
| App o juego | App |
| Gratis o pagada | Gratis (no se puede cambiar después) |
| Package name | `com.menius.counter` |
| Categoría | Business |
| Email de contacto | soporte@menius.app |
| Sitio web | https://menius.app |
| Política de privacidad | https://menius.app/privacy |

## Textos de la ficha

### en-US

**Short description (máx. 80):**
> Receive and print your restaurant's MENIUS orders in real time on your tablet.

**Full description:**
> MENIUS Counter is the companion app for restaurants that use MENIUS for their digital menu and online ordering.
>
> Keep a tablet at the counter and every new order shows up instantly — pickup, delivery or dine-in — with a sound alert so nobody misses one.
>
> • Real-time orders: new orders appear the moment a customer places them.
> • Accept, prepare and complete orders with one tap.
> • Print tickets on a Bluetooth thermal printer (ESC/POS, 58 mm or 80 mm) — no print dialogs.
> • Connect in seconds: scan the tablet's code with your phone — no passwords typed on the tablet.
> • Works on any Android tablet or phone with Android 8.0 or later.
>
> A MENIUS account is required. Create yours at menius.app.

### es-419

**Descripción breve (máx. 80):**
> Recibe e imprime los pedidos MENIUS de tu restaurante en tiempo real.

**Descripción completa:**
> MENIUS Counter es la app para restaurantes que usan MENIUS para su menú digital y pedidos en línea.
>
> Deja una tablet en el mostrador y cada pedido nuevo aparece al instante —para recoger, a domicilio o en mesa— con un aviso sonoro para que ninguno se pierda.
>
> • Pedidos en tiempo real: aparecen en cuanto el cliente los hace.
> • Acepta, prepara y completa pedidos con un toque.
> • Imprime tickets en una impresora térmica Bluetooth (ESC/POS, 58 mm u 80 mm), sin diálogos de impresión.
> • Se conecta en segundos: escaneas el código de la tablet con tu celular, sin escribir contraseñas en la tablet.
> • Funciona en cualquier tablet o teléfono Android 8.0 o superior.
>
> Necesitas una cuenta de MENIUS. Créala en menius.app.

## Gráficos (pendiente de generar)

| Asset | Tamaño | Estado |
|---|---|---|
| Ícono | 512×512 PNG, 32-bit | pendiente |
| Gráfico de funciones | 1024×500 PNG/JPG | pendiente |
| Capturas de teléfono | mín. 2, 16:9 o 9:16 | pendiente — del Counter con pedidos de prueba |
| Capturas de tablet 7" y 10" | mín. 1 c/u | recomendado (es una app de tablet) |

## Formularios de "Contenido de la app" (Política)

**Acceso a la app:** Toda la funcionalidad requiere iniciar sesión → dar a Google una cuenta de prueba
(crear un restaurante demo con email propio; NO usar Buccaneer ni cuentas reales).

**Anuncios:** No contiene anuncios.

**Clasificación de contenido:** Cuestionario → categoría "Utilidad, productividad, comunicación u otra"; responder No a todo
(sin violencia, sin contenido sexual, sin apuestas; los usuarios no interactúan entre sí; no comparte ubicación).

**Público objetivo:** 18 años o más. No dirigida a niños.

**App de noticias:** No. **App de salud:** No. **Préstamos / financiera:** No. **Gobierno:** No.

**Eliminación de cuenta** (Google lo exige porque se puede crear cuenta en la web):
URL → https://menius.app/privacy (sección "Tus derechos": borrado a pedido escribiendo a soporte@menius.app).

**Seguridad de los datos (Data safety)** — revisar antes de enviar:

| Pregunta | Respuesta |
|---|---|
| ¿Recopila o comparte datos? | Sí recopila; **no** comparte con terceros para otros fines |
| ¿Cifrado en tránsito? | Sí (HTTPS) |
| ¿El usuario puede pedir borrado? | Sí |
| Info personal: nombre, email, teléfono | Recopilado · Funcionalidad de la app, Gestión de la cuenta · Obligatorio |
| Info personal: dirección | Recopilado (direcciones de entrega de los pedidos) · Funcionalidad de la app |
| Info financiera | No (los pagos los procesa Stripe en la web, la app no ve tarjetas) |
| Ubicación | No (el escaneo Bluetooth se declara `neverForLocation`) |
| Actividad en la app / historial de compras | Sí: historial de pedidos · Funcionalidad de la app |
| Identificadores de dispositivo | No |

**Permisos sensibles:** solo Bluetooth (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN` con `neverForLocation`) para
imprimir tickets. No requiere declaración especial.

## Release

- Track inicial: **Prueba interna** → agregar emails de prueba → link de instalación inmediato.
- Archivo: `app/build/outputs/bundle/release/app-release.aab` (`.\gradlew.bat bundleRelease`).
- **Play App Signing:** aceptar que Google guarde la llave de la app. La nuestra es solo la *upload key*
  (`C:\Users\willi\.menius-keys\menius-counter-upload.jks`, contraseña en `keystore.properties`, ambos fuera de git).
  Si se pierde, Google permite resetearla.
- Cada versión nueva: subir `versionCode` en `app/build.gradle.kts`.
