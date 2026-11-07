package com.menius.counter

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebViewDatabase
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.menius.counter.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val mainHandler = Handler(Looper.getMainLooper())

    /** Splash stays up until the first document finishes (or [SPLASH_MAX_MS] passes). */
    @Volatile private var firstPageLoaded = false

    /** Last URL whose main document loaded fine — what we retry after a failure. */
    private var lastGoodUrl: String? = null
    /** True when the failure happened before anything loaded (retry the start URL). */
    private var failedBeforeFirstLoad = false

    private var lastBackPressAt = 0L

    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    /** While the offline panel is up, retry on a timer too — onAvailable alone misses
     *  "Wi-Fi connected but the router has no internet yet". */
    private val retryTick = object : Runnable {
        override fun run() {
            if (binding.offlinePanel.visibility == View.VISIBLE) {
                retryLoad()
                mainHandler.postDelayed(this, RETRY_INTERVAL_MS)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        val splashStartedAt = SystemClock.elapsedRealtime()
        splash.setKeepOnScreenCondition {
            !firstPageLoaded && SystemClock.elapsedRealtime() - splashStartedAt < SPLASH_MAX_MS
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        enterImmersive()
        requestBluetoothPermissionsIfNeeded()

        // The Counter runs on a till tablet all shift. Without this the screen
        // sleeps on the OS timeout and incoming orders go unnoticed until someone
        // wakes it — the whole point of the device is being glanceable.
        binding.root.keepScreenOn = true

        binding.webView.apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.menius_bg))
            overScrollMode = View.OVER_SCROLL_NEVER

            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            // Behave like an app, not a page: no pinch-zoom, no zoom buttons.
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            // The new-order chime must play on an unattended till, without a tap.
            settings.mediaPlaybackRequiresUserGesture = false
            // The web switches to app mode (no dashboard chrome, pairing instead of
            // the marketing login) when it sees this marker.
            settings.userAgentString =
                "${settings.userAgentString} ${AppConfig.UA_MARKER}/${BuildConfig.VERSION_NAME}"

            val cookies = CookieManager.getInstance()
            cookies.setAcceptCookie(true)
            cookies.setAcceptThirdPartyCookies(this, true)

            addJavascriptInterface(MeniusJsBridge(this@MainActivity), "MeniusAndroid")

            webViewClient = object : WebViewClient() {
                // Keep navigation inside the MENIUS host. Any link that tries to
                // leave it (phishing, an injected redirect) is opened in the
                // system browser instead of hijacking the Counter WebView.
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val host = request?.url?.host ?: return false
                    val allowed = host == APP_HOST || host.endsWith(".$APP_HOST")
                    if (allowed) return false // let the WebView handle it
                    // External link → hand off to the browser, don't load in-app.
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    return true
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    // Only the main document matters: a failed image or analytics
                    // beacon must not blank out a working Counter.
                    if (request?.isForMainFrame == true) {
                        if (lastGoodUrl == null) failedBeforeFirstLoad = true
                        showOfflinePanel()
                    }
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // onPageFinished also fires for the error page; only a real
                    // load (panel not shown) counts as "good".
                    if (binding.offlinePanel.visibility != View.VISIBLE) {
                        lastGoodUrl = url
                        failedBeforeFirstLoad = false
                    }
                    firstPageLoaded = true
                }
            }

            loadUrl(AppConfig.url(AppConfig.START_PATH))
        }

        binding.offlineContent.offlineActions.retryButton.setOnClickListener { retryLoad() }

        registerNetworkCallback()

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    val path = binding.webView.url?.toUri()?.path.orEmpty()
                    val atRoot = path == AppConfig.START_PATH || path == AppConfig.CONNECT_PATH
                    if (binding.webView.canGoBack() && !atRoot) {
                        binding.webView.goBack()
                        return
                    }
                    // The Counter is the home screen of a till: never close it on a
                    // single stray tap of the back button.
                    val now = SystemClock.elapsedRealtime()
                    if (now - lastBackPressAt < BACK_EXIT_WINDOW_MS) {
                        finish()
                    } else {
                        lastBackPressAt = now
                        Toast.makeText(this@MainActivity, R.string.press_back_again, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        )
    }

    // ── Full screen ──────────────────────────────────────────────────────────

    private fun enterImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    override fun onResume() {
        super.onResume()
        enterImmersive()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Dialogs, the permission prompt and the notification shade bring the bars
        // back; hide them again as soon as the Counter has focus.
        if (hasFocus) enterImmersive()
    }

    // ── Offline / reconnect ──────────────────────────────────────────────────

    private fun showOfflinePanel() {
        if (binding.offlinePanel.visibility == View.VISIBLE) return
        binding.offlinePanel.visibility = View.VISIBLE
        mainHandler.removeCallbacks(retryTick)
        mainHandler.postDelayed(retryTick, RETRY_INTERVAL_MS)
    }

    private fun hideOfflinePanel() {
        binding.offlinePanel.visibility = View.GONE
        mainHandler.removeCallbacks(retryTick)
    }

    /** Reload what was on screen, or the start URL if nothing ever loaded — reload()
     *  alone would replay Chromium's error page forever. */
    private fun retryLoad() {
        hideOfflinePanel()
        val target = if (failedBeforeFirstLoad) null else lastGoodUrl
        binding.webView.loadUrl(target ?: AppConfig.url(AppConfig.START_PATH))
    }

    private fun registerNetworkCallback() {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                mainHandler.post {
                    if (binding.offlinePanel.visibility == View.VISIBLE) retryLoad()
                }
            }
        }
        runCatching { cm.registerDefaultNetworkCallback(cb) }.onSuccess { networkCallback = cb }
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        networkCallback?.let { cb ->
            runCatching { getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(cb) }
        }
        networkCallback = null
        super.onDestroy()
    }

    /** Persist cookies to disk so the login session survives the app being killed. */
    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    // ── Bridge entry points (called on the UI thread by MeniusJsBridge) ──────

    fun openPrinterSettings() {
        startActivity(Intent(this, PrinterSettingsActivity::class.java))
    }

    /** Clear the session and return to the pairing screen so a different
     *  restaurant can connect this tablet without reinstalling / clearing data.
     *
     *  Cookies alone are not enough: the Counter keeps state in localStorage /
     *  IndexedDB (cached orders, printer prefs per store, UI state), so on a
     *  shared till tablet restaurant B could see restaurant A's data after a
     *  disconnect. Wipe WebStorage and the WebView caches too. */
    fun disconnectDevice() {
        // Order matters: clear storage while the page is still loaded, then drop
        // cookies and only navigate once everything is gone.
        WebStorage.getInstance().deleteAllData()
        binding.webView.clearCache(true)
        binding.webView.clearFormData()
        @Suppress("DEPRECATION")
        WebViewDatabase.getInstance(this).clearFormData()

        val cookies = CookieManager.getInstance()
        cookies.removeAllCookies {
            cookies.flush()
            binding.webView.clearHistory()
            lastGoodUrl = null
            binding.webView.loadUrl(AppConfig.url(AppConfig.CONNECT_PATH))
        }
    }

    private fun requestBluetoothPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        val need = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            need.add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            need.add(Manifest.permission.BLUETOOTH_SCAN)
        }
        if (need.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, need.toTypedArray(), REQ_BT)
        }
    }

    companion object {
        private const val REQ_BT = 0x701
        private const val SPLASH_MAX_MS = 8_000L
        private const val RETRY_INTERVAL_MS = 10_000L
        private const val BACK_EXIT_WINDOW_MS = 2_000L
        /** Host the WebView is allowed to navigate within (derived from BASE_URL). */
        private val APP_HOST: String =
            AppConfig.BASE_URL.toUri().host ?: "menius.app"
    }
}
