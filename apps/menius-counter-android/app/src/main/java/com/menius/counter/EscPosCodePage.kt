package com.menius.counter

import java.nio.charset.Charset

/**
 * Single-byte code pages a thermal printer can be switched to with `ESC t n`.
 *
 * The `n` values are Epson's table numbers, which the Star and Xprinter clones
 * copy for these pages. If a specific printer disagrees, the fix is to select a
 * different entry here — not to go back to UTF-8, which no ESC/POS printer reads.
 */
enum class EscPosCodePage(
    val escPosCode: Int,
    private val charsetName: String,
) {
    /** CP437 — US/original IBM PC. What printers boot into. No Spanish accents beyond a few. */
    CP437(0, "IBM437"),

    /** CP850 — Western European (Latin-1 style): full á é í ó ú ñ ü ¿ ¡ set. */
    CP850(2, "IBM850"),

    /** CP858 — CP850 plus the euro sign. Default: widest support, all we need. */
    CP858(19, "IBM00858"),

    /** CP1252 — Windows Latin-1. Some cheap clones only implement this one. */
    CP1252(16, "windows-1252");

    /**
     * The JVM charset, or null when this Android build doesn't bundle it.
     * Android ships a trimmed charset set, so this must never be assumed present.
     */
    val charset: Charset? by lazy {
        runCatching { Charset.forName(charsetName) }.getOrNull()
    }
}

/**
 * Characters that have no slot in any Latin code page, mapped to something a
 * receipt can actually show. Without this they'd each print as '?' or as noise.
 */
private val TRANSLITERATIONS: List<Pair<String, String>> = listOf(
    "€" to "EUR",
    "−" to "-",   // U+2212 minus
    "–" to "-",   // en dash
    "—" to "-",   // em dash
    "’" to "'",
    "‘" to "'",
    "“" to "\"",
    "”" to "\"",
    "…" to "...",
    "⏱" to "",    // stopwatch emoji — printed as garbage on every ticket
    "•" to "*",
    "·" to "*",
    "→" to "->",
    "½" to "1/2",
    "¼" to "1/4",
)

/**
 * Encodes receipt text for a thermal printer.
 *
 * Order matters: transliterate first (so "€" becomes "EUR" rather than an
 * unmappable byte), then encode to the printer's code page. Anything still
 * unmappable — CJK, emoji we didn't list — is stripped of its accent if it has
 * one, and otherwise dropped, so a stray character can never desync the stream.
 */
fun encodeForPrinter(input: String, codePage: EscPosCodePage): ByteArray {
    var s = input
    for ((from, to) in TRANSLITERATIONS) s = s.replace(from, to)

    val charset = codePage.charset
        ?: return asciiFallback(s)   // charset missing on this device

    val encoder = charset.newEncoder()
    if (encoder.canEncode(s)) {
        return s.toByteArray(charset)
    }

    // Encode char by char so one bad character doesn't cost the whole line.
    val out = StringBuilder(s.length)
    for (ch in s) {
        if (encoder.canEncode(ch)) {
            out.append(ch)
        } else {
            out.append(stripAccent(ch))
        }
    }
    return out.toString().toByteArray(charset)
}

/**
 * Last resort when the code page charset isn't available: plain ASCII with
 * accents flattened, which every printer can render.
 */
private fun asciiFallback(s: String): ByteArray {
    val out = StringBuilder(s.length)
    for (ch in s) {
        if (ch.code < 128) out.append(ch) else out.append(stripAccent(ch))
    }
    return out.toString().toByteArray(Charsets.US_ASCII)
}

/**
 * "á" -> "a", "Ñ" -> "N". Returns "" for characters with no ASCII equivalent, so
 * they vanish instead of printing as noise.
 */
private fun stripAccent(ch: Char): String = when (ch.lowercaseChar()) {
    'á', 'à', 'â', 'ä', 'ã', 'å' -> if (ch.isUpperCase()) "A" else "a"
    'é', 'è', 'ê', 'ë' -> if (ch.isUpperCase()) "E" else "e"
    'í', 'ì', 'î', 'ï' -> if (ch.isUpperCase()) "I" else "i"
    'ó', 'ò', 'ô', 'ö', 'õ' -> if (ch.isUpperCase()) "O" else "o"
    'ú', 'ù', 'û', 'ü' -> if (ch.isUpperCase()) "U" else "u"
    'ñ' -> if (ch.isUpperCase()) "N" else "n"
    'ç' -> if (ch.isUpperCase()) "C" else "c"
    'ý', 'ÿ' -> if (ch.isUpperCase()) "Y" else "y"
    '¿' -> "?"
    '¡' -> "!"
    'º', 'ª' -> "."
    else -> if (ch.code in 32..126) ch.toString() else ""
}
