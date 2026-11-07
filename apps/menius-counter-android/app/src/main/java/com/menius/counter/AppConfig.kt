package com.menius.counter

/**
 * Point to your MENIUS deployment. For Android Emulator → host machine use "http://10.0.2.2:3000".
 * Production: https://menius.app (no trailing slash).
 */
object AppConfig {
    const val BASE_URL: String = "https://menius.app"

    /** The app opens straight into the full-screen Counter. With no session the web
     *  middleware sends app clients (User-Agent contains [UA_MARKER]) to [CONNECT_PATH]. */
    const val START_PATH: String = "/counter"

    /** Device-pairing screen (code + QR). Where a disconnected tablet lands. */
    const val CONNECT_PATH: String = "/connect"

    /** Appended to the WebView User-Agent as "$UA_MARKER/<versionName>". The web keys app mode on it. */
    const val UA_MARKER: String = "MeniusCounterApp"

    fun url(path: String): String = BASE_URL.trimEnd('/') + path
}
