package com.menius.counter

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

/**
 * Exposed to the WebView as [MeniusAndroid].
 * From Counter: `MeniusAndroid.printReceipt(JSON.stringify(payload))` → returns "OK" or error code.
 *
 * On blocking: the web side (src/lib/printing/native-bridge.ts) reads the return
 * value synchronously, so this call has to block — going async would mean
 * changing the JS contract and shipping both sides in lockstep. What was fixed
 * instead is the *unbounded* wait: BluetoothThermalPrinter had no timeout at all
 * (socket.connect() can hang for a long time with the printer off), which froze
 * the Counter UI mid-service. Both transports are now capped, so the worst case
 * is a few seconds and a clear toast rather than a dead tablet.
 *
 * @JavascriptInterface methods run on a dedicated WebView thread, never on the
 * UI thread — the freeze is the WebView waiting for the JS return, not this
 * thread blocking the main looper.
 */
class MeniusJsBridge(private val activity: MainActivity) {

    private val context: Context get() = activity

    @JavascriptInterface
    fun printReceipt(jsonPayload: String): String {
        return try {
            val lineWidth = PrinterPreferences.lineWidthChars(context)
            val bytes = ReceiptEscPosBuilder.build(jsonPayload, lineWidth)

            val result = runBlocking(Dispatchers.IO) {
                when (PrinterPreferences.getMode(context)) {
                    PrinterPreferences.MODE_NETWORK -> {
                        val ip = PrinterPreferences.getNetworkIp(context)
                            ?: return@runBlocking Result.failure(
                                IllegalStateException("NO_PRINTER: Open Printer settings in the Counter menu and enter the printer IP address")
                            )
                        NetworkThermalPrinter.send(ip, bytes)
                    }
                    else -> {
                        val mac = PrinterPreferences.getBluetoothAddress(context)
                            ?: return@runBlocking Result.failure(
                                IllegalStateException("NO_PRINTER: Open Printer settings in the Counter menu and select a paired device")
                            )
                        BluetoothThermalPrinter.send(context.applicationContext, mac, bytes)
                    }
                }
            }

            result.fold(
                onSuccess = { "OK" },
                onFailure = { e ->
                    val msg = e.message ?: e.javaClass.simpleName
                    Log.e(TAG, "print failed", e)
                    showToast("Print: $msg")
                    if (msg.startsWith("NO_PRINTER")) msg else "PRINT_ERROR: $msg"
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "printReceipt", e)
            val msg = e.message ?: "parse_error"
            showToast("Print: $msg")
            "PRINT_ERROR: $msg"
        }
    }

    @JavascriptInterface
    fun isNativePrintAvailable(): Boolean = true

    /** Opens the native printer screen (Bluetooth / network IP, paper width, test print). */
    @JavascriptInterface
    fun openPrinterSettings() {
        activity.runOnUiThread { activity.openPrinterSettings() }
    }

    /** Wipes the session + local data and returns to the pairing screen (/connect). */
    @JavascriptInterface
    fun disconnectDevice() {
        activity.runOnUiThread { activity.disconnectDevice() }
    }

    /** Short double-pulse when a new order lands — felt even when the till is muted. */
    @JavascriptInterface
    fun vibrateNewOrder() {
        val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }
        if (vibrator?.hasVibrator() != true) return // most tablets have no motor — silently skip
        runCatching {
            vibrator.vibrate(VibrationEffect.createWaveform(NEW_ORDER_PATTERN, -1))
        }
    }

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    private fun showToast(msg: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context.applicationContext, msg, Toast.LENGTH_LONG).show()
        }
    }

    companion object {
        private const val TAG = "MeniusJsBridge"
        private val NEW_ORDER_PATTERN = longArrayOf(0, 40, 30, 40, 30, 60)
    }
}
