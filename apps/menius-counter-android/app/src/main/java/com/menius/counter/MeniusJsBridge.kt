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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Exposed to the WebView as [MeniusAndroid].
 *
 * Two ways to print, same result string ("OK", "NO_PRINTER: …" or "PRINT_ERROR: …"):
 *
 * - `printReceiptAsync(json, callbackId)` (1.0.7+) — returns at once; when the
 *   printer is done the result comes back through
 *   `window.__meniusPrintDone(callbackId, result)` (MainActivity.deliverPrintResult).
 *   Tested 2026-11-24 on a Galaxy Tab A11: with the sync call, a printer that
 *   didn't answer froze the whole Counter ~8 s per attempt, and taps made while
 *   frozen queued up and froze it again — minutes without buttons mid-service.
 *   The web (src/lib/printing/native-bridge.ts) uses this one when it exists.
 * - `printReceipt(json)` — the old blocking call, kept for web builds that don't
 *   know the async one (both sides ship independently).
 *
 * Jobs run one at a time ([printMutex]): two tickets at once would fight over the
 * single Bluetooth/TCP connection the printer accepts.
 */
class MeniusJsBridge(private val activity: MainActivity) {

    private val context: Context get() = activity
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val printMutex = Mutex()
    private var lastToast: Toast? = null

    @JavascriptInterface
    fun printReceiptAsync(jsonPayload: String, callbackId: String) {
        scope.launch {
            // The web shows its own error banner for the async path: no native toast here.
            val result = printMutex.withLock { print(jsonPayload, toastOnError = false) }
            activity.deliverPrintResult(callbackId, result)
        }
    }

    @JavascriptInterface
    fun printReceipt(jsonPayload: String): String =
        runBlocking(Dispatchers.IO) { printMutex.withLock { print(jsonPayload, toastOnError = true) } }

    private suspend fun print(jsonPayload: String, toastOnError: Boolean): String {
        return try {
            val lineWidth = PrinterPreferences.lineWidthChars(context)
            val bytes = ReceiptEscPosBuilder.build(jsonPayload, lineWidth)

            val result = run {
                when (PrinterPreferences.getMode(context)) {
                    PrinterPreferences.MODE_NETWORK -> {
                        val ip = PrinterPreferences.getNetworkIp(context)
                        if (ip == null) {
                            Result.failure(
                                IllegalStateException("NO_PRINTER: Open Printer settings in the Counter menu and enter the printer IP address")
                            )
                        } else {
                            NetworkThermalPrinter.send(ip, bytes)
                        }
                    }
                    else -> {
                        val mac = PrinterPreferences.getBluetoothAddress(context)
                        if (mac == null) {
                            Result.failure(
                                IllegalStateException("NO_PRINTER: Open Printer settings in the Counter menu and select a paired device")
                            )
                        } else {
                            BluetoothThermalPrinter.send(context.applicationContext, mac, bytes)
                        }
                    }
                }
            }

            result.fold(
                onSuccess = { "OK" },
                onFailure = { e ->
                    val msg = e.message ?: e.javaClass.simpleName
                    Log.e(TAG, "print failed", e)
                    if (toastOnError) showToast("Print: $msg")
                    if (msg.startsWith("NO_PRINTER")) msg else "PRINT_ERROR: $msg"
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "printReceipt", e)
            val msg = e.message ?: "parse_error"
            if (toastOnError) showToast("Print: $msg")
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

    /** 1.0.8+: minimum versionCode the web needs; below it the update is forced (AppUpdater). */
    @JavascriptInterface
    fun setMinAppVersion(code: Int) {
        activity.runOnUiThread { activity.onMinAppVersion(code) }
    }

    /** Replaces the previous toast instead of queueing: N failures used to mean N toasts in a row for minutes. */
    private fun showToast(msg: String) {
        Handler(Looper.getMainLooper()).post {
            lastToast?.cancel()
            lastToast = Toast.makeText(context.applicationContext, msg, Toast.LENGTH_LONG).also { it.show() }
        }
    }

    companion object {
        private const val TAG = "MeniusJsBridge"
        private val NEW_ORDER_PATTERN = longArrayOf(0, 40, 30, 40, 30, 60)
    }
}
