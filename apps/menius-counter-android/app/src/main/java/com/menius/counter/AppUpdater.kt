package com.menius.counter

import android.content.Context
import android.os.SystemClock
import android.view.View
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.snackbar.Snackbar
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Updates from inside the app (Google Play In-App Updates).
 *
 * Why (2026-11-24): a till tablet runs the Counter all day in the foreground, and
 * Play only auto-updates apps that are closed, charging and on Wi-Fi — Pedro's
 * tablet was still on 1.0.5 two releases later. A restaurant can't be expected to
 * open Play Store.
 *
 * - Required update (this build's versionCode < the minimum the web asks for via
 *   MeniusAndroid.setMinAppVersion): IMMEDIATE — Play's full-screen "Updating…",
 *   restarts by itself. Only for fixes that can't wait.
 * - Otherwise FLEXIBLE: Play asks once ("Update" / "No thanks", at most every
 *   [PROMPT_EVERY_MS]); it downloads in the background while the Counter keeps
 *   working, then a bar offers "Restart" so nobody is cut off mid-order.
 *
 * Only works when the app was installed from Play (any track). Sideloaded/debug
 * builds just get UpdateAvailability.UPDATE_NOT_AVAILABLE.
 */
class AppUpdater(private val activity: AppCompatActivity, private val anchor: () -> View) {

    private val manager = AppUpdateManagerFactory.create(activity)
    private val launcher: ActivityResultLauncher<IntentSenderRequest> =
        activity.registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) {
            // Declined or cancelled: a required update comes back on the next onResume;
            // an optional one waits for the next prompt window.
        }
    private var lastPromptAt = 0L
    private var readyBar: Snackbar? = null

    private val listener = InstallStateUpdatedListener { state ->
        if (state.installStatus() == InstallStatus.DOWNLOADED) showReady()
    }

    fun start() = manager.registerListener(listener)
    fun stop() = manager.unregisterListener(listener)

    fun isRequired(): Boolean = BuildConfig.VERSION_CODE < minVersionCode(activity)

    /** Cheap (asks Play's local service): fine on every onResume and on a timer. */
    fun check(forcePrompt: Boolean = false) {
        manager.appUpdateInfo.addOnSuccessListener { info ->
            if (activity.isFinishing || activity.isDestroyed) return@addOnSuccessListener
            val required = isRequired()
            when {
                info.installStatus() == InstallStatus.DOWNLOADED -> showReady()
                info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS && required ->
                    launch(info, AppUpdateType.IMMEDIATE)
                info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE -> {
                    if (required && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        launch(info, AppUpdateType.IMMEDIATE)
                        return@addOnSuccessListener
                    }
                    val now = SystemClock.elapsedRealtime()
                    val due = lastPromptAt == 0L || now - lastPromptAt >= PROMPT_EVERY_MS
                    if ((forcePrompt || due) && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                        lastPromptAt = now
                        launch(info, AppUpdateType.FLEXIBLE)
                    }
                }
            }
        }
    }

    private fun launch(info: AppUpdateInfo, type: Int) {
        runCatching {
            manager.startUpdateFlowForResult(info, launcher, AppUpdateOptions.newBuilder(type).build())
        }
    }

    private fun showReady() {
        if (readyBar?.isShownOrQueued == true) return
        readyBar = Snackbar.make(anchor(), R.string.update_ready, Snackbar.LENGTH_INDEFINITE)
            .setAction(R.string.update_restart) { manager.completeUpdate() }
            .also { it.show() }
    }

    companion object {
        private const val PREFS = "menius_app"
        private const val KEY_MIN = "min_version_code"
        private const val PROMPT_EVERY_MS = 6 * 60 * 60 * 1000L

        fun minVersionCode(context: Context): Int =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_MIN, 0)

        fun setMinVersionCode(context: Context, code: Int) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt(KEY_MIN, code).apply()
        }
    }
}
