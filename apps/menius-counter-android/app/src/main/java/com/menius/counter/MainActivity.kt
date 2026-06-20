package com.menius.counter

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.menius.counter.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.inflateMenu(R.menu.main_menu)
        binding.toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_printer -> {
                    startActivity(Intent(this, PrinterSettingsActivity::class.java))
                    true
                }
                R.id.action_logout -> {
                    logout()
                    true
                }
                else -> false
            }
        }

        requestBluetoothPermissionsIfNeeded()

        binding.webView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true

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
            }

            loadUrl(AppConfig.BASE_URL.trimEnd('/') + AppConfig.START_PATH)
        }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (binding.webView.canGoBack()) {
                        binding.webView.goBack()
                    } else {
                        finish()
                    }
                }
            }
        )
    }

    /** Persist cookies to disk so the login session survives the app being killed. */
    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    /** Clear the session and return to the login screen so a different
     *  restaurant can sign in without reinstalling / clearing app data. */
    private fun logout() {
        val cookies = CookieManager.getInstance()
        cookies.removeAllCookies {
            cookies.flush()
            binding.webView.clearHistory()
            binding.webView.loadUrl(AppConfig.BASE_URL.trimEnd('/') + AppConfig.START_PATH)
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
        /** Host the WebView is allowed to navigate within (derived from BASE_URL). */
        private val APP_HOST: String =
            AppConfig.BASE_URL.toUri().host ?: "menius.app"
    }
}
