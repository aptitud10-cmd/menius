package com.menius.counter

import android.content.Context

/**
 * Bonded Bluetooth printer MAC (e.g. 00:11:22:33:44:55) and paper width.
 */
object PrinterPreferences {
    private const val PREFS = "menius_printer"
    private const val KEY_MAC = "bluetooth_mac"
    private const val KEY_WIDTH = "paper_width_mm"

    fun getBluetoothAddress(context: Context): String? {
        val v = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_MAC, null)
        return v?.takeIf { it.isNotBlank() }
    }

    fun setBluetoothAddress(context: Context, mac: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_MAC, mac)
            .apply()
    }

    /** 58 or 80 (mm). Default 80. */
    fun getPaperWidthMm(context: Context): Int {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_WIDTH, 80)
    }

    fun setPaperWidthMm(context: Context, mm: Int) {
        val w = if (mm <= 58) 58 else 80
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putInt(KEY_WIDTH, w)
            .apply()
    }

    fun lineWidthChars(context: Context): Int =
        if (getPaperWidthMm(context) <= 58) 32 else 42
}
