package com.menius.counter

import org.json.JSONObject
import java.util.Locale

/**
 * Ticket v2 (SPEC impresión §6, opción b): el MISMO diseño que la impresora
 * CloudPRNT, en texto ESC/POS. La web manda `ticket` (TicketData, ya resuelto)
 * y `ticketText` (los textos en el idioma del restaurante); acá solo se dibuja.
 *
 * Invertidos (GS B): franja de canal, bloque #003, alergia, COLLECT CASH y el
 * #003 de abajo. Tamaños con GS !. Si algo falta, devuelve null y el builder
 * imprime el formato anterior.
 */
object TicketV2 {

    fun build(root: JSONObject, w: Int): ByteArray? {
        val d = root.optJSONObject("ticket") ?: return null
        val tx = root.optJSONObject("ticketText") ?: return null
        val short = d.optString("shortNumber").takeIf { it.isNotBlank() } ?: return null

        val e = EscPosEncoder().init()
        fun s(o: JSONObject, k: String) = o.optString(k, "").takeIf { it.isNotBlank() && it != "null" } ?: ""
        fun amt(n: Double) = String.format(Locale.US, "%.2f", n)

        // Restaurante
        e.alignCenter().bold(true).size(2, 2)
        wrap(s(d.optJSONObject("restaurant") ?: JSONObject(), "name").uppercase(Locale.getDefault()), w / 2)
            .forEach { e.text(it).newline() }
        e.size(1, 1).bold(false).alignLeft()

        // Canal invertido
        inverted(e, " ${s(tx, "channelLine")}", w, 1)

        // Reimpresión
        if (s(d, "kind") == "reprint") {
            e.bold(true).line('=', w)
            wrap("${s(tx, "reprint")}  ${s(d, "reprintedAt")}", w).forEach { e.text(it).newline() }
            e.line('=', w).bold(false)
        }

        // Bloque #003 + listo + nombre (todo invertido)
        e.bold(true)
        inverted(e, " #$short", w, 3)
        val table = s(d, "tableName")
        val readyLine = listOfNotNull(
            table.takeIf { it.isNotEmpty() }?.let { "${s(tx, "table")} $it" },
            s(d, "readyAt").takeIf { it.isNotEmpty() }?.let { "${s(tx, "ready")} $it" },
        ).joinToString("   ")
        if (readyLine.isNotEmpty()) inverted(e, " $readyLine", w, 1)
        val customer = s(d, "customerName")
        if (customer.isNotEmpty()) wrap(customer, w / 2 - 1).forEach { inverted(e, " $it", w, 2) }
        e.bold(false)

        // Alergia
        val allergy = s(d, "allergy")
        if (allergy.isNotEmpty()) {
            e.bold(true)
            wrap("[!] ${s(tx, "allergy")}: $allergy", w - 1).forEach { inverted(e, " $it", w, 1) }
            e.bold(false)
        }

        val scheduled = s(d, "scheduledFor")
        if (scheduled.isNotEmpty()) {
            e.bold(true).size(1, 2).text("${s(tx, "scheduled")} $scheduled").newline().size(1, 1).bold(false)
        }
        e.text(s(tx, "utensils")).newline()
        e.line('-', w)

        // Ítems
        val items = d.optJSONArray("items")
        if (items != null) for (i in 0 until items.length()) {
            val it = items.getJSONObject(i)
            e.bold(true)
            e.row("${it.optInt("qty", 1)}x ${it.optString("name", "Item")}".take(w - 9), amt(it.optDouble("lineTotal", 0.0)), w)
            e.bold(false)
            val lines = it.optJSONArray("lines")
            if (lines != null) for (j in 0 until lines.length()) {
                val l = lines.getJSONObject(j)
                val indent = if (l.optBoolean("indent", false)) "      " else "   "
                val price = l.optDouble("price", 0.0)
                val text = indent + l.optString("text", "")
                if (price > 0) e.row(text.take(w - 9), amt(price), w) else wrap(text, w).forEach { t -> e.text(t).newline() }
            }
            val notes = s(it, "notes")
            if (notes.isNotEmpty()) wrap("   ${s(tx, "note")}: $notes", w).forEach { t -> e.text(t).newline() }
        }
        val orderNotes = s(d, "orderNotes")
        if (orderNotes.isNotEmpty()) wrap("${s(tx, "note")}: $orderNotes", w).forEach { e.text(it).newline() }
        e.bold(true).text(s(tx, "itemsCheckBag")).newline().bold(false)
        e.line('-', w)

        // Totales (los guardados en el pedido, nunca recalculados)
        val t = d.optJSONObject("totals") ?: JSONObject()
        fun money(k: String) = t.optDouble(k, 0.0)
        e.row(s(tx, "subtotal"), amt(money("subtotal")), w)
        if (money("tax") > 0) e.row(s(tx, "tax"), amt(money("tax")), w)
        if (money("deliveryFee") > 0) e.row(s(tx, "delivery"), amt(money("deliveryFee")), w)
        if (money("discount") > 0) e.row(s(tx, "discount"), "-" + amt(money("discount")), w)
        if (money("tip") > 0) e.row(s(tx, "tip"), amt(money("tip")), w)
        e.bold(true).size(1, 2).row(s(tx, "total"), amt(money("total")), w).size(1, 1).bold(false)

        // Pago (regla de plata: "pagado" solo si el servidor lo confirmó)
        val pay = d.optJSONObject("payment")?.optString("kind") ?: "verify"
        val payText = s(tx, "payment")
        when (pay) {
            "collect_cash" -> { e.bold(true); wrap(payText, w / 2 - 1).forEach { inverted(e, " $it", w, 2) }; e.bold(false) }
            "paid" -> { e.bold(true).line('=', w); e.alignCenter().text(payText).newline().alignLeft(); e.line('=', w).bold(false) }
            else -> { e.bold(true).line('#', w); e.alignCenter().text(payText).newline().alignLeft(); e.line('#', w).bold(false) }
        }

        // Delivery
        val delivery = d.optJSONObject("delivery")
        if (delivery != null) {
            e.line('-', w)
            e.bold(true).size(1, 2)
            wrap(s(delivery, "address"), w).forEach { e.text(it).newline() }
            e.size(1, 1)
            val phone = prettyPhone(s(delivery, "phone"))
            if (phone.isNotEmpty()) e.text(phone).newline()
            e.bold(false)
            val instr = s(delivery, "instructions")
            if (instr.isNotEmpty()) {
                e.line('.', w)
                wrap(instr, w).forEach { e.text(it).newline() }
                e.line('.', w)
            }
            val driverUrl = s(delivery, "driverUrl")
            if (driverUrl.startsWith("http")) {
                e.feed(1).alignCenter().bold(true).text(s(tx, "driverScan")).newline().bold(false)
                e.qr(driverUrl, 7)
                e.alignLeft()
            }
        }

        // #003 abajo (por si la grapa tapa el de arriba)
        e.line('-', w)
        e.bold(true)
        inverted(e, centered("#$short", w / 2), w, 2)
        e.bold(false)
        e.text("${s(d, "orderNumber")} · ${s(tx, "placed")} ${s(d, "placedAt")}").newline()
        val direct = s(d.optJSONObject("restaurant") ?: JSONObject(), "orderDirectUrl")
        if (direct.isNotEmpty()) e.text("${s(tx, "orderDirect")}: $direct").newline()
        e.text(s(tx, "poweredBy")).newline()
        e.cutPartial()
        return e.toByteArray()
    }

    /** Una línea invertida que llena el ancho (el fondo negro llega al borde). */
    private fun inverted(e: EscPosEncoder, text: String, w: Int, mul: Int) {
        val cols = (w / mul).coerceAtLeast(1)
        val line = text.take(cols).padEnd(cols)
        e.reverse(true).size(mul, mul).text(line).size(1, 1).reverse(false).newline()
    }

    private fun centered(text: String, cols: Int): String {
        val pad = ((cols - text.length) / 2).coerceAtLeast(0)
        return " ".repeat(pad) + text
    }

    private fun prettyPhone(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        val us = if (digits.length == 11 && digits.startsWith("1")) digits.substring(1) else digits
        return if (us.length == 10) "(${us.substring(0, 3)}) ${us.substring(3, 6)}-${us.substring(6)}" else raw
    }

    /** Corta en palabras para no partir una dirección o un nombre a la mitad. */
    fun wrap(text: String, cols: Int): List<String> {
        if (cols <= 0 || text.length <= cols) return listOf(text)
        val out = mutableListOf<String>()
        var cur = StringBuilder()
        for (word in text.split(' ')) {
            if (cur.isNotEmpty() && cur.length + 1 + word.length > cols) { out.add(cur.toString()); cur = StringBuilder() }
            if (word.length > cols) {
                var w2 = word
                while (w2.length > cols) { if (cur.isNotEmpty()) { out.add(cur.toString()); cur = StringBuilder() }; out.add(w2.take(cols)); w2 = w2.drop(cols) }
                cur.append(w2)
            } else {
                if (cur.isNotEmpty()) cur.append(' ')
                cur.append(word)
            }
        }
        if (cur.isNotEmpty()) out.add(cur.toString())
        return out
    }
}
