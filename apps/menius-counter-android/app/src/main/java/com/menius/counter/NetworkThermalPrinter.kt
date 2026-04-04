package com.menius.counter

import java.net.InetSocketAddress
import java.net.Socket

/**
 * Raw ESC/POS over TCP/IP (port 9100). Works with Ethernet/WiFi thermal printers
 * (Epson TM series, Star, Xprinter, etc.) connected to the local network.
 */
object NetworkThermalPrinter {

    private const val PORT = 9100
    private const val CONNECT_TIMEOUT_MS = 5_000
    private const val CHUNK = 512

    fun send(host: String, data: ByteArray): Result<Unit> {
        if (host.isBlank()) {
            return Result.failure(IllegalArgumentException("NO_PRINTER_IP"))
        }
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host.trim(), PORT), CONNECT_TIMEOUT_MS)
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
