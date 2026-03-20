package com.menius.counter

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

/**
 * Exposed to the WebView as [MeniusAndroid].
 * From Counter: `MeniusAndroid.printReceipt(JSON.stringify(payload))` → returns "OK" or error code.
 */
class MeniusJsBridge(private val context: Context) {

    @JavascriptInterface
    fun printReceipt(jsonPayload: String): String {
        return try {
            val mac = PrinterPreferences.getBluetoothAddress(context)
                ?: return "NO_PRINTER: Open menu → Printer and select a paired device"

            val lineWidth = PrinterPreferences.lineWidthChars(context)
            val bytes = ReceiptEscPosBuilder.build(jsonPayload, lineWidth)

            val result = runBlocking(Dispatchers.IO) {
                BluetoothThermalPrinter.send(context.applicationContext, mac, bytes)
            }
            result.fold(
                onSuccess = { "OK" },
                onFailure = { e ->
                    val msg = e.message ?: e.javaClass.simpleName
                    Log.e(TAG, "print failed", e)
                    showToast("Print: $msg")
                    "PRINT_ERROR: $msg"
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

    private fun showToast(msg: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context.applicationContext, msg, Toast.LENGTH_LONG).show()
        }
    }

    companion object {
        private const val TAG = "MeniusJsBridge"
    }
}
