package com.menius.counter

import android.content.Context

/**
 * Stores printer connection config: mode (Bluetooth or Network), Bluetooth MAC,
 * network IP, and paper width.
 */
object PrinterPreferences {
    private const val PREFS = "menius_printer"
    private const val KEY_MAC = "bluetooth_mac"
    private const val KEY_WIDTH = "paper_width_mm"
    private const val KEY_MODE = "connection_mode"
    private const val KEY_NETWORK_IP = "network_ip"

    const val MODE_BLUETOOTH = "bluetooth"
    const val MODE_NETWORK = "network"

    fun getMode(context: Context): String {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_MODE, MODE_BLUETOOTH) ?: MODE_BLUETOOTH
    }

    fun setMode(context: Context, mode: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_MODE, mode)
            .apply()
    }

    fun getBluetoothAddress(context: Context): String? {
        val v = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_MAC, null)
        return v?.takeIf { it.isNotBlank() }
    }

    fun setBluetoothAddress(context: Context, mac: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_MAC, mac)
            .apply()
    }

    fun getNetworkIp(context: Context): String? {
        val v = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_NETWORK_IP, null)
        return v?.takeIf { it.isNotBlank() }
    }

    fun setNetworkIp(context: Context, ip: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_NETWORK_IP, ip)
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
