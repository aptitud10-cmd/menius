package com.menius.counter

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Aviso de Android cuando entra un pedido con el Counter tapado por otra app.
 *
 * Con la página oculta, Chromium frena los timers: la alerta de la web suena una
 * vez por minuto o menos, y a los 15 min el pedido se cancela solo. Esta
 * notificación suena SIN PARAR (FLAG_INSISTENT) hasta que alguien la abre o
 * vuelve al Counter, que la borra en onStart.
 *
 * Con el Counter en pantalla no hace nada: ahí suena la alerta de la web.
 */
object NewOrderNotifier {
    private const val CHANNEL_ID = "new_orders"
    private const val NOTIFICATION_ID = 0x4E4F // "NO"

    /** Lo marca MainActivity en onStart/onStop. */
    @Volatile var inForeground = false

    fun notify(context: Context, title: String, body: String) {
        if (inForeground) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return
        ensureChannel(context)

        val open = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        val pending = PendingIntent.getActivity(
            context, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_order)
            .setContentTitle(title.take(120))
            .setContentText(body.take(200))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .build()
        n.flags = n.flags or android.app.Notification.FLAG_INSISTENT
        runCatching { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, n) }
    }

    fun clear(context: Context) {
        runCatching { NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID) }
    }

    private fun ensureChannel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val ch = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.channel_new_orders),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.channel_new_orders_desc)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            enableVibration(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        nm.createNotificationChannel(ch)
    }
}
