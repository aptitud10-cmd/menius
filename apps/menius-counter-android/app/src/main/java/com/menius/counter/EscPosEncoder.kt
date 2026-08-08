package com.menius.counter

import java.io.ByteArrayOutputStream

/**
 * ESC/POS byte stream (Epson/Star compatible subset).
 *
 * Text encoding: thermal printers do NOT speak UTF-8. They hold a single-byte
 * code page and boot into CP437 (US) unless told otherwise, so sending raw UTF-8
 * turned every ñ/á/é/í into two garbage glyphs — on every ticket in LatAm, where
 * customer names, addresses and dish names are full of them.
 *
 * So we do two things: select a code page with `ESC t n`, and encode the text to
 * that same code page instead of UTF-8. CP858 is the default because it's CP850
 * (Western European: the full Spanish accent set) plus the euro sign, and it's
 * the most widely supported page across Epson/Star/Xprinter clones.
 */
class EscPosEncoder(private val codePage: EscPosCodePage = EscPosCodePage.CP858) {
    private val out = ByteArrayOutputStream()

    private fun write(vararg bytes: Int) {
        for (b in bytes) out.write(b and 0xff)
    }

    fun init(): EscPosEncoder {
        write(0x1b, 0x40)          // ESC @  — reset
        write(0x1b, 0x74, codePage.escPosCode)  // ESC t n — select code page
        return this
    }

    fun text(s: String): EscPosEncoder {
        out.write(encodeForPrinter(s, codePage))
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
