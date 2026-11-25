package com.menius.counter

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime

class TestTicketTest {

    private val now = LocalDateTime.of(2026, 11, 25, 13, 36)

    /** The test print goes through TicketV2 (v5), not the old "ORDEN #TEST" builder. */
    @Test fun usaElFormatoV5() {
        for (lang in listOf("en", "es")) {
            val bytes = ReceiptEscPosBuilder.build(TestTicket.payload(lang, now), 48)
            val t = String(bytes, charset("IBM00858"))
            assertTrue(t, t.contains("#000"))
            assertTrue(t, t.contains(if (lang == "es") "Si ves esta línea" else "If you can read this line"))
            assertFalse(t, t.contains("null"))
            assertFalse(t, t.contains("ORDEN #TEST"))
            assertTrue(t, t.contains("1:51 PM"))
        }
    }

    /** GS r 1 answer = 0xx0xx10; ASB bytes (bit 1 = 0) must not count as the answer. */
    @Test fun respuestaDeEstadoDePapel() {
        assertTrue(BluetoothThermalPrinter.isPaperStatusReply(0x12))
        assertTrue(BluetoothThermalPrinter.isPaperStatusReply(0x1e)) // paper near end + out
        assertFalse(BluetoothThermalPrinter.isPaperStatusReply(0x00))
        assertFalse(BluetoothThermalPrinter.isPaperStatusReply(0x10)) // ASB first byte
        assertEquals(15_000L, BluetoothThermalPrinter.ackTimeoutMs(100_000))
    }

    /** ESC t 2 (CP850): 19 printed Greek on the MUNBYN. The accents keep their CP850 bytes. */
    @Test fun paginaDeCodigosCp850() {
        val bytes = EscPosEncoder().init().text("ñ á é í ó ú").toByteArray()
        assertEquals(listOf(0x1b, 0x40, 0x1b, 0x74, 0x02), bytes.take(5).map { it.toInt() and 0xff })
        assertEquals(listOf(0xa4, 0x20, 0xa0, 0x20, 0x82, 0x20, 0xa1, 0x20, 0xa2, 0x20, 0xa3), bytes.drop(5).map { it.toInt() and 0xff })
    }
}
