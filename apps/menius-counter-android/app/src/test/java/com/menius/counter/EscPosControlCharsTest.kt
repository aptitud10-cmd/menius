package com.menius.counter

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/**
 * Texto del cliente con caracteres de control (ESC, GS, NUL…) no puede llegar a
 * la impresora como comando: cortaría el papel o abriría el cajón.
 */
class EscPosControlCharsTest {

    private val esc = 0x1B.toChar()
    private val gs = 0x1D.toChar()
    private val nul = 0x00.toChar()

    @Test
    fun quitaComandosYDejaSaltosDeLinea() {
        val nota = "sin cebolla${esc}p${nul}${gs}V\nbien cocido\tgracias"
        assertEquals("sin cebollapV\nbien cocido gracias", stripControlChars(nota))
    }

    @Test
    fun ningunByteDeControlSaleHaciaLaImpresora() {
        val nombre = "Ana${esc}@${gs}V${0x10.toChar()}${0x7F.toChar()}${0x85.toChar()} López"
        for (page in EscPosCodePage.values()) {
            val bytes = encodeForPrinter(nombre, page)
            for (b in bytes) {
                val v = b.toInt() and 0xff
                assertFalse("byte de control $v en ${page.name}", v < 0x20 || v == 0x7F)
            }
        }
    }

    @Test
    fun elTextoNormalNoCambia() {
        assertEquals("Mesa 4 — 2x Burger", stripControlChars("Mesa 4 — 2x Burger"))
    }
}
