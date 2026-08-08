package com.menius.counter

import java.net.InetSocketAddress
import java.net.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Raw ESC/POS over TCP/IP (port 9100). Works with Ethernet/WiFi thermal printers
 * (Epson TM series, Star, Xprinter, etc.) connected to the local network.
 */
object NetworkThermalPrinter {

    private const val PORT = 9100
    private const val CONNECT_TIMEOUT_MS = 5_000

    /**
     * Write timeout. connect() was already bounded, but a printer that accepts the
     * connection and then stalls (out of paper, buffer full) would block the write
     * forever — and the Counter UI waits on this call.
     */
    private const val IO_TIMEOUT_MS = 5_000
    private const val CHUNK = 512

    suspend fun send(host: String, data: ByteArray): Result<Unit> = withContext(Dispatchers.IO) {
        if (host.isBlank()) {
            return@withContext Result.failure(IllegalArgumentException("NO_PRINTER_IP"))
        }
        try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host.trim(), PORT), CONNECT_TIMEOUT_MS)
                socket.soTimeout = IO_TIMEOUT_MS
                socket.getOutputStream().use { stream ->
                    var offset = 0
                    while (offset < data.size) {
                        val len = minOf(CHUNK, data.size - offset)
                        stream.write(data, offset, len)
                        offset += len
                    }
                    stream.flush()
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

