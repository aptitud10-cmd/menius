# MENIUS Counter — Android app (WebView + native print)

The native shell lives in `apps/menius-counter-android/`. It loads the same MENIUS web app; Chrome users are unaffected.

## Flow

1. Install **MENIUS Counter** APK / Play internal test.
2. **Menu → Printer**: choose a **paired** Bluetooth thermal printer, set **58 mm / 80 mm**, **Test print**.
3. Log in on `/login`, open **Counter** as usual. **Auto-print** and **Print** use **Bluetooth ESC/POS** (no browser print dialog).

Pair the printer first in **Android system Bluetooth settings** (PIN if required), then select it in the app.

## JS bridge

`PrinterService` uses the bridge automatically when `window.MeniusAndroid.printReceipt` exists.

- **`printReceipt(json: string): string`** — returns `"OK"` or `"PRINT_ERROR: …"` / `"NO_PRINTER: …"`.
- Payload: JSON with `ticketType` `"receipt"` | `"kitchen"` plus fields matching `ReceiptData` (`timestamp` ISO string, `items[]` with `qty`, `name`, `lineTotal`, `modifiers`, `notes`).

Manual check in DevTools (WebView remote debugging):

```javascript
typeof MeniusAndroid !== 'undefined' && MeniusAndroid.printReceipt('{"ticketType":"receipt",...}');
```

## Web integration

Implemented in `src/lib/printing/native-bridge.ts` and `PrinterService.ts` (native path before iframe `window.print()`).

## Receipt payload

Same as `ReceiptData` in `src/lib/printing/types.ts`. Version changes should be reflected in `ReceiptEscPosBuilder.kt` (Android).
