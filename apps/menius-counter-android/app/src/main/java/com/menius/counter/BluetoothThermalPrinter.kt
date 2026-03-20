package com.menius.counter

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import java.util.UUID

/**
 * Raw ESC/POS over Bluetooth SPP (classic). Works with most thermal printers (Star, Epson, SNBC, etc.).
 */
object BluetoothThermalPrinter {

    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private const val CHUNK = 512

    fun send(context: Context, macAddress: String, data: ByteArray): Result<Unit> {
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

        val socket = try {
            device.createRfcommSocketToServiceRecord(SPP_UUID)
        } catch (e: Exception) {
            return Result.failure(e)
        }
        return try {
            socket.connect()
            socket.outputStream.use { stream ->
                var offset = 0
                while (offset < data.size) {
                    val len = minOf(CHUNK, data.size - offset)
                    stream.write(data, offset, len)
                    offset += len
                }
                stream.flush()
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        } finally {
            try {
                socket.close()
            } catch (_: Exception) { }
        }
    }
}
