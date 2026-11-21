package com.menius.counter

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.charset.Charset

/**
 * Dibuja el ticket ESC/POS como texto para revisarlo sin impresora. Los JSON de
 * src/test/resources los genera la web (orderToTicketData), así que es el pedido
 * tal cual le llega a la tablet.
 *
 *   ▓texto▓  = invertido (blanco sobre negro)
 *   [2x2]    = tamaño GS ! de la línea (ancho x alto)
 *
 * La vista previa queda en app/build/ticket-preview/<caso>.txt.
 */
class TicketV2PreviewTest {

    private fun preview(name: String, cols: Int): String {
        val json = javaClass.classLoader!!.getResource("ticket-$name.json")!!.readText()
        val bytes = ReceiptEscPosBuilder.build(json, cols)
        val text = decode(bytes)
        File("build/ticket-preview").apply { mkdirs() }.resolve("$name-$cols.txt").writeText(text)
        return text
    }

    @Test fun pickupEn48() {
        val t = preview("pickup-en", 48)
        // v5: el nombre por la elección, la franja de arriba, el número y la franja de cierre.
        assertTrue(t, t.contains("Pastrami Omelette"))
        assertTrue(t, t.contains("▓ PICKUP"))
        assertTrue(t, t.contains("READY BY"))
        assertTrue(t, t.contains("#003"))
        assertTrue(t, t.contains("Order direct: menius.app/buccaneer"))
        assertTrue(t, t.contains("COLLECT CASH"))
        assertTrue(t, t.contains("+\$1.80"))
    }

    @Test fun deliveryEs48() {
        val t = preview("delivery-es", 48)
        assertTrue(t, t.contains("DOMICILIO"))
        assertTrue(t, t.contains("Ñoño Pérez"))
        assertTrue(t, t.contains("PAGADO"))
        assertTrue(t, t.contains("[QR "))
    }

    @Test fun pickupEn32() {
        // Papel de 58 mm: nada se sale del ancho.
        val t = preview("pickup-en", 32)
        assertTrue(t, t.lines().none { it.removePrefix("[2x2] ").removePrefix("[1x2] ").replace("▓", "").length > 32 * 4 })
    }

    @Test fun webViejaSinV5ImprimeElFormatoAnterior() {
        val json = javaClass.classLoader!!.getResource("ticket-pickup-en.json")!!.readText()
            .let { org.json.JSONObject(it) }
            .apply { getJSONObject("ticketText").remove("v5") }
            .toString()
        val t = decode(ReceiptEscPosBuilder.build(json, 48))
        assertTrue(t, t.contains("#003"))
    }

    /** ESC/POS → texto. Solo los comandos que usa EscPosEncoder. */
    private fun decode(b: ByteArray): String {
        val cp: Charset = Charset.forName("IBM00858")
        val out = StringBuilder()
        val line = StringBuilder()
        var reverse = false
        var size = "1x1"
        var lineSize = "1x1"
        fun flush() {
            val prefix = if (lineSize != "1x1") "[$lineSize] " else ""
            out.append(prefix).append(line).append('\n')
            line.clear(); lineSize = size
        }
        var i = 0
        while (i < b.size) {
            val c = b[i].toInt() and 0xff
            when {
                c == 0x0a -> { if (reverse) line.append('▓'); flush(); if (reverse) line.append('▓'); i++ }
                c == 0x1b -> { // ESC
                    when (b[i + 1].toInt() and 0xff) {
                        0x40 -> i += 2
                        else -> i += 3 // ESC t n, ESC a n, ESC E n, ESC ! n, ESC d n
                    }
                }
                c == 0x1d -> { // GS
                    when (b[i + 1].toInt() and 0xff) {
                        0x21 -> { val n = b[i + 2].toInt() and 0xff; size = "${(n shr 4) + 1}x${(n and 0x0f) + 1}"; if (line.isEmpty()) lineSize = size; i += 3 }
                        0x42 -> { val on = (b[i + 2].toInt() and 0xff) == 1; if (on != reverse) line.append('▓'); reverse = on; i += 3 }
                        0x56 -> { out.append("--- corte ---\n"); i += 3 }
                        0x28 -> { // GS ( k pL pH ...
                            val len = (b[i + 3].toInt() and 0xff) or ((b[i + 4].toInt() and 0xff) shl 8)
                            val fn = b[i + 6].toInt() and 0xff
                            if (fn == 0x50) line.append("[QR ${String(b, i + 8, len - 3, Charsets.US_ASCII)}]")
                            i += 5 + len
                        }
                        else -> i += 3
                    }
                }
                else -> {
                    var j = i
                    while (j < b.size && (b[j].toInt() and 0xff) !in setOf(0x0a, 0x1b, 0x1d)) j++
                    line.append(String(b, i, j - i, cp))
                    i = j
                }
            }
        }
        if (line.isNotEmpty()) flush()
        return out.toString()
    }
}
