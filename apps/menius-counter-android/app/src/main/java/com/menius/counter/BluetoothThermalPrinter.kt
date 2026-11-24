package com.menius.counter

import android.bluetooth.BluetoothManager
import android.content.Context
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.runInterruptible
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

/**
 * Raw ESC/POS over Bluetooth SPP (classic). Works with most thermal printers (Star, Epson, SNBC, etc.).
 */
object BluetoothThermalPrinter {

    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private const val CHUNK = 512

    /**
     * BluetoothSocket.connect() has NO timeout of its own — with the printer off
     * or out of range it can block for a long time, and the Counter UI was frozen
     * for all of it (see MeniusJsBridge). Cap it: better a "printer not
     * responding" toast in 8s than a dead tablet mid-service.
     */
    private const val CONNECT_TIMEOUT_MS = 8_000L

    /** ~300 ms base + 1 ms per 20 bytes (SPP moves a few KB/s in practice), capped at 2 s. */
    internal fun drainDelayMs(bytes: Int): Long = minOf(2_000L, 300L + bytes / 20L)

    suspend fun send(context: Context, macAddress: String, data: ByteArray): Result<Unit> {
        val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
            ?: return Result.failure(IllegalStateException("NO_BLUETOOTH"))

        if (!adapter.isEnabled) {
            return Result.failure(IllegalStateException("BLUETOOTH_OFF"))
        }

        val device = try {
            adapter.getRemoteDevice(macAddress.uppercase())
        } catch (e: IllegalArgumentException) {
            return Result.failure(IllegalStateException("BAD_MAC"))
        }

        // Android docs: an ongoing discovery slows connect() down a lot and can make it fail.
        // Needs BLUETOOTH_SCAN on 12+; without it, skip it rather than fail the print.
        try { adapter.cancelDiscovery() } catch (_: SecurityException) { }

        val socket = try {
            device.createRfcommSocketToServiceRecord(SPP_UUID)
        } catch (e: Exception) {
            return Result.failure(e)
        }
        return try {
            // connect() ignores interrupts, so a plain withTimeout would leave the
            // blocked thread behind. Closing the socket is what actually aborts it.
            withTimeout(CONNECT_TIMEOUT_MS) {
                runInterruptible(Dispatchers.IO) { socket.connect() }
            }
            withContext(Dispatchers.IO) {
                socket.outputStream.use { stream ->
                    var offset = 0
                    while (offset < data.size) {
                        val len = minOf(CHUNK, data.size - offset)
                        stream.write(data, offset, len)
                        offset += len
                    }
                    stream.flush()
                    // flush() on a Bluetooth stream returns before the bytes are on the air.
                    // Closing right away (end of `use`) drops what's still in flight on some
                    // cheap printers: "sent" but nothing prints. Give it time, by size.
                    delay(drainDelayMs(data.size))
                }
            }
            Result.success(Unit)
        } catch (e: TimeoutCancellationException) {
            Result.failure(
                IllegalStateException("PRINTER_TIMEOUT: la impresora no responde (revisá que esté encendida y emparejada)")
            )
        } catch (e: Exception) {
            Result.failure(e)
        } finally {
            // Also unblocks a connect() still hanging after the timeout.
            try {
                socket.close()
            } catch (_: Exception) { }
        }
    }
}
