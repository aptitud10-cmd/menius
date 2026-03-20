# MENIUS Counter (Android)

Single Android app for all restaurants: WebView loads the MENIUS Counter after login; native layer will send **ESC/POS** to a Star (or other) printer via Bluetooth.

## Requirements

- Android Studio **Hedgehog (2023.1.1)** or newer
- JDK 17
- Device or emulator with **API 26+** (Android 8.0)

## Open in Android Studio

1. **File → Open** → select folder `apps/menius-counter-android`
2. Let Gradle sync finish.
3. Run **app** on a device or emulator.

## Build from the command line

The repo includes the **Gradle Wrapper** (`gradlew` / `gradlew.bat` + `gradle/wrapper/`).

- **Windows (PowerShell):** from `apps/menius-counter-android` run  
  `.\gradlew.bat assembleDebug`
- **macOS / Linux:** `chmod +x gradlew` once, then `./gradlew assembleDebug`

You need **JDK 17** on `PATH` or **`JAVA_HOME`** set, and the **Android SDK** (e.g. install via Android Studio). If the SDK is not in the default location, create `local.properties` with:

```properties
sdk.dir=C\:\\Users\\You\\AppData\\Local\\Android\\Sdk
```

(Use your real path; on Windows escape backslashes as shown.)

## Configure base URL

Edit `app/src/main/java/com/menius/counter/AppConfig.kt`:

- **Production:** `https://menius.app` (default)
- **Local dev:** `http://10.0.2.2:3000` (emulator → host machine) or your LAN IP for a physical device

Start path: `/login` (users sign in), then navigate to Counter as usual. You can change `START_PATH` to `/counter` only if session cookies already exist.

## Printing (Bluetooth ESC/POS)

1. Pair the thermal printer in **Android Settings → Bluetooth** (many models use SPP / “Serial” profile).
2. In the app: **⋮ menu → Printer** → **Choose paired printer** → **58 mm / 80 mm** → **Test print**.
3. Counter **Print** / **auto-print** sends **ESC/POS** over Bluetooth (same JSON as `PrinterService` / `native-bridge.ts`).

`MeniusAndroid.printReceipt(json)` returns **`OK`** or an error string (shown in Toast and thrown in web).

## Multi-restaurant

Same APK for every client. Each restaurant logs in with its MENIUS account; the WebView uses normal session cookies. Printer pairing is per device.

## Play Store

Requires developer account, privacy policy, and signing config. Use **Internal testing** track first.
