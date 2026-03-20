package com.menius.counter

/**
 * Point to your MENIUS deployment. For Android Emulator → host machine use "http://10.0.2.2:3000".
 * Production: https://menius.app (no trailing slash).
 */
object AppConfig {
    const val BASE_URL: String = "https://menius.app"
    /** First screen: login, then user opens Counter from the dashboard as usual. */
    const val START_PATH: String = "/login"
}
