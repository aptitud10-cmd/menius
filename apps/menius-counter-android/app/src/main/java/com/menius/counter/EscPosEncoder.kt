package com.menius.counter

import java.io.ByteArrayOutputStream

/**
 * ESC/POS byte stream (Epson/Star compatible subset).
 */
class EscPosEncoder {
    private val out = ByteArrayOutputStream()

    private fun write(vararg bytes: Int) {
        for (b in bytes) out.write(b and 0xff)
    }

    fun init(): EscPosEncoder {
        write(0x1b, 0x40)
        return this
    }

    fun text(s: String): EscPosEncoder {
        val safe = s.replace('€', 'EUR').replace("−", "-")
        out.write(safe.toByteArray(Charsets.UTF_8))
        return this
    }

    fun newline(): EscPosEncoder {
        write(0x0a)
        return this
    }

    fun feed(lines: Int = 1): EscPosEncoder {
        repeat(lines) { newline() }
        return this
    }

    fun alignLeft(): EscPosEncoder = also { write(0x1b, 0x61, 0) }
    fun alignCenter(): EscPosEncoder = also { write(0x1b, 0x61, 1) }
    fun alignRight(): EscPosEncoder = also { write(0x1b, 0x61, 2) }

    fun bold(on: Boolean): EscPosEncoder = also { write(0x1b, 0x45, if (on) 1 else 0) }

    fun doubleHeight(on: Boolean): EscPosEncoder =
        also { write(0x1b, 0x21, if (on) 0x10 else 0x00) }

    fun line(char: Char = '-', width: Int): EscPosEncoder {
        repeat(width) { text(char.toString()) }
        return newline()
    }

    fun row(left: String, right: String, width: Int): EscPosEncoder {
        val l = left.take(width - 1)
        val r = right.take(width - 1)
        var gap = width - l.length - r.length
        if (gap < 1) gap = 1
        text(l + " ".repeat(gap) + r)
        return newline()
    }

    fun cutPartial(): EscPosEncoder {
        feed(3)
        write(0x1d, 0x56, 0x01)
        return this
    }

    fun toByteArray(): ByteArray = out.toByteArray()
}
