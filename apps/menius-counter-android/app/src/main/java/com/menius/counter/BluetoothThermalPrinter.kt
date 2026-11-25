package com.menius.counter

import android.bluetooth.BluetoothManager
import android.content.Context
import android.util.Log
import java.io.InputStream
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

    /**
     * GS r 1 — "send paper status". It is NOT a real-time command: the printer
     * answers only after it has processed everything sent before it. So its answer
     * means "the whole ticket is in", and only then is it safe to hang up.
     *
     * Before 1.0.9 we waited a fixed 300 ms + 1 ms per 20 bytes (max 2 s) and closed.
     * Pedro's MUNBYN (2026-11-25) cut long tickets mid-way: #003 stopped at the 5th of
     * 8 dishes, #004 right after the dishes — no totals, no footer. What was still in
     * flight when the socket closed was simply lost.
     */
    private val PAPER_STATUS_REQUEST = byteArrayOf(0x1d, 0x72, 0x01)

    /**
     * How long to wait for that answer. A printer that doesn't support GS r never
     * answers, so this is also the fallback wait: generous on purpose (a long ticket
     * takes seconds to come out), 1 ms per byte on top of 3 s, capped at 15 s.
     */
    internal fun ackTimeoutMs(bytes: Int): Long = minOf(15_000L, 3_000L + bytes)

    /**
     * GS r 1 answer byte: bits 0, 1, 4, 7 are fixed at 0,1,0,0 (Epson spec), i.e.
     * `0xx0xx10`. Automatic status bytes (ASB) some printers send on their own have
     * bit 1 = 0, so they can't be mistaken for it.
     */
    internal fun isPaperStatusReply(b: Int): Boolean = (b and 0x93) == 0x12

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
                val input = socket.inputStream
                val stream = socket.outputStream
                // Anything the printer said on connect is not the answer we wait for.
                skipAvailable(input)

                var offset = 0
                while (offset < data.size) {
                    val len = minOf(CHUNK, data.size - offset)
                    stream.write(data, offset, len)
                    offset += len
                }
                stream.write(PAPER_STATUS_REQUEST)
                stream.flush()

                // flush() returns before the bytes are on the air: wait for the printer to
                // say it got through the ticket (or the fallback time if it never answers).
                val acked = awaitPaperStatus(input, ackTimeoutMs(data.size))
                if (!acked) Log.w(TAG, "printer did not answer GS r 1; closed after the fallback wait")
                // The answer leaves while the last lines are still feeding: a little margin.
                delay(250)
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

    private fun skipAvailable(input: InputStream) {
        try {
            while (input.available() > 0) input.read()
        } catch (_: Exception) { }
    }

    /**
     * Polls available() instead of a blocking read(): read() on a Bluetooth socket
     * ignores interrupts and has no timeout, so it could hang the print queue.
     */
    private suspend fun awaitPaperStatus(input: InputStream, timeoutMs: Long): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val n = try { input.available() } catch (_: Exception) { return false }
            repeat(n) {
                val b = try { input.read() } catch (_: Exception) { return false }
                if (b >= 0 && isPaperStatusReply(b)) return true
            }
            delay(50)
        }
        return false
    }

    private const val TAG = "BtPrinter"
}
