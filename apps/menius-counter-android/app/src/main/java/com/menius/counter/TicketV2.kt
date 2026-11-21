package com.menius.counter

import org.json.JSONObject
import java.util.Locale

/**
 * Ticket v2 (SPEC impresión §6, opción b): el MISMO diseño que la impresora
 * CloudPRNT, en texto ESC/POS. La web manda `ticket` (TicketData, ya resuelto)
 * y `ticketText` (los textos en el idioma del restaurante); acá solo se dibuja.
 *
 * Desde 1.0.6 (versionCode 7) dibuja el v5 de la web (Pedro 2026-11-20): una franja
 * invertida fina arriba (tipo + hora) y otra abajo ("Order direct"), el #número grande
 * en negro sobre blanco, columna de cantidad y cobro en caja. Si la web no manda
 * `ticketText.v5` (web vieja), dibuja el v3 de siempre. Si algo falta, devuelve null y
 * el builder imprime el formato anterior: nunca se queda sin imprimir.
 */
object TicketV2 {

    fun build(root: JSONObject, w: Int): ByteArray? {
        val d = root.optJSONObject("ticket") ?: return null
        val tx = root.optJSONObject("ticketText") ?: return null
        val short = d.optString("shortNumber").takeIf { it.isNotBlank() } ?: return null
        val v5 = tx.optJSONObject("v5")
        if (v5 != null) return buildV5(d, tx, v5, short, w)
        return buildV3(d, tx, short, w)
    }

    private fun s(o: JSONObject?, k: String) = o?.optString(k, "")?.takeIf { it.isNotBlank() && it != "null" } ?: ""
    private fun amt(n: Double) = String.format(Locale.US, "%.2f", n)

    // ── v5 ─────────────────────────────────────────────────────────────────────
    private fun buildV5(d: JSONObject, tx: JSONObject, v: JSONObject, short: String, w: Int): ByteArray {
        val e = EscPosEncoder().init()
        val r = d.optJSONObject("restaurant") ?: JSONObject()
        val cur = s(v, "currencySymbol")
        fun money(n: Double) = cur + amt(n)

        // 1. Línea chica: el restaurante ya sabe quién es.
        e.alignLeft().bold(true).row(s(r, "name").uppercase(Locale.getDefault()), s(v, "orderVia"), w).bold(false)

        if (s(d, "kind") == "reprint") {
            e.bold(true).line('=', w)
            wrap("${s(tx, "reprint")}  ${s(d, "reprintedAt")}", w).forEach { e.text(it).newline() }
            e.line('=', w).bold(false)
        }

        // 2. Franja invertida fina: tipo de pedido + hora (o mesa, o programado).
        val left = s(v, "orderType") + if (s(d, "scheduledDay").isNotEmpty()) " [${s(v, "scheduled")}]" else ""
        val right = when {
            s(d, "tableName").isNotEmpty() -> "${s(v, "table")} ${s(d, "tableName")}"
            s(d, "scheduledDay").isNotEmpty() -> "${s(d, "scheduledDay")} ${s(d, "scheduledTime")}"
            s(d, "readyAt").isNotEmpty() -> "${s(v, "readyBy")} ${s(d, "readyAt")}"
            else -> ""
        }
        e.bold(true).size(1, 2)
        if (right.isEmpty() || left.length + right.length + 3 <= w) {
            invertedRow(e, left, right, w)
        } else {
            invertedRow(e, left, "", w)
            invertedRow(e, "", right, w)
        }
        e.size(1, 1)

        // 3. El número, grande y en negro sobre blanco. 4. El nombre, que se dice en voz alta.
        e.size(4, 4).text("#$short").newline().size(1, 1)
        val customer = s(d, "customerName")
        if (customer.isNotEmpty()) {
            e.size(2, 2)
            wrap(customer, w / 2).forEach { e.text(it).newline() }
            e.size(1, 1)
        }
        e.bold(false)

        // Alergia: el único bloque negro grande.
        val allergy = s(d, "allergy")
        if (allergy.isNotEmpty()) {
            e.feed(1).bold(true)
            invertedRow(e, "[!] ${s(tx, "allergy")}", "", w)
            wrap(allergy, w - 2).forEach { invertedRow(e, it, "", w) }
            e.bold(false)
        }

        // 5. Delivery: dirección, teléfono, indicaciones y QR del repartidor arriba.
        val delivery = d.optJSONObject("delivery")
        if (delivery != null) {
            e.feed(1).bold(true).text(s(v, "deliverTo")).newline().size(1, 2)
            wrap(s(delivery, "address"), w).forEach { e.text(it).newline() }
            e.size(1, 1)
            val phone = prettyPhone(s(delivery, "phone"))
            if (phone.isNotEmpty()) e.text(phone).newline()
            e.bold(false)
            val instr = s(delivery, "instructions")
            if (instr.isNotEmpty()) {
                e.line('-', w).bold(true).text(s(v, "instructions")).newline()
                wrap(instr, w).forEach { e.text(it).newline() }
                e.bold(false).line('-', w)
            }
            val driverUrl = s(delivery, "driverUrl")
            if (driverUrl.startsWith("http")) {
                e.alignCenter().bold(true).text(s(v, "driverTitle")).newline().bold(false)
                e.text(s(v, "driverHint")).newline()
                e.qr(driverUrl, 6)
                e.alignLeft()
            }
        }

        // 6. Platos: título, columna de cantidad (caja negra si es más de 1), precio a la derecha.
        e.feed(1).bold(true).size(1, 2).text(s(tx, "itemCount")).newline().size(1, 1).bold(false)
        e.line('=', w)
        val items = d.optJSONArray("items")
        if (items != null) for (i in 0 until items.length()) {
            val it = items.getJSONObject(i)
            if (i > 0) e.text("    ").line('-', w - 4)
            val qty = it.optInt("qty", 1)
            val price = money(it.optDouble("lineTotal", 0.0))
            val nameCols = (w - 4 - price.length - 1).coerceAtLeast(8)
            val nameLines = wrap(it.optString("name", "Item"), nameCols)
            e.bold(true).size(1, 2)
            val q = qty.toString()
            val cell = if (q.length == 1) " $q " else q.take(3).padEnd(3)
            if (qty > 1) e.reverse(true).text(cell).reverse(false) else e.text(cell)
            e.text(" ").text(nameLines[0].padEnd(nameCols)).text(" ").text(price).newline()
            nameLines.drop(1).forEach { l -> e.text("    ").text(l).newline() }
            e.size(1, 1).bold(false)
            val lines = it.optJSONArray("lines")
            if (lines != null) for (j in 0 until lines.length()) {
                val l = lines.getJSONObject(j)
                val indent = if (l.optBoolean("indent", false)) "      " else "    "
                val text = l.optString("text", "")
                // "No onions" / "Sin cebolla": lo que se quita va en negrita, que no se pase.
                val removal = Regex("^(no|sin)\\s", RegexOption.IGNORE_CASE).containsMatchIn(text)
                val lp = l.optDouble("price", 0.0)
                if (removal) e.bold(true)
                if (lp > 0) {
                    val right = "+" + money(lp)
                    val cols = (w - indent.length - right.length - 1).coerceAtLeast(8)
                    val wl = wrap(text, cols)
                    e.text(indent + wl[0].padEnd(cols) + " ").bold(true).text(right).newline()
                    if (!removal) e.bold(false)
                    wl.drop(1).forEach { t -> e.text(indent + t).newline() }
                } else {
                    wrap(text, w - indent.length).forEach { t -> e.text(indent + t).newline() }
                }
                e.bold(false)
            }
            val notes = s(it, "notes")
            if (notes.isNotEmpty()) {
                e.bold(true)
                wrap("${s(v, "noteLabel")}: $notes", w - 4).forEach { t -> e.text("    $t").newline() }
                e.bold(false)
            }
        }
        val orderNotes = s(d, "orderNotes")
        if (orderNotes.isNotEmpty()) {
            e.line('-', w).bold(true).text(s(v, "orderNote")).newline()
            wrap(orderNotes, w).forEach { e.text(it).newline() }
            e.bold(false)
        }

        // 7. Cubiertos: SÍ invertido (hay que hacer algo), NO plano.
        e.line('=', w)
        val utensils = d.optBoolean("includeUtensils", false)
        val yn = " ${if (utensils) s(v, "yes") else s(v, "no")} "
        e.text(s(v, "utensilsLabel").padEnd(w - yn.length)).bold(true)
        if (utensils) e.reverse(true).text(yn).reverse(false) else e.text(yn)
        e.bold(false).newline()

        // 8. Totales en una columna a la derecha, con símbolo.
        e.line('-', w)
        val t = d.optJSONObject("totals") ?: JSONObject()
        fun tv(k: String) = t.optDouble(k, 0.0)
        val col = (w * 6 / 10).coerceAtLeast(20).coerceAtMost(w)
        val pad = " ".repeat(w - col)
        fun totalRow(label: String, value: String) = e.text(pad + label.padEnd(col - value.length) + value).newline()
        totalRow(s(tx, "subtotal"), money(tv("subtotal")))
        if (tv("tax") > 0) totalRow(s(tx, "tax"), money(tv("tax")))
        if (tv("deliveryFee") > 0) totalRow(s(tx, "delivery"), money(tv("deliveryFee")))
        if (tv("discount") > 0) totalRow(s(tx, "discount"), "-" + money(tv("discount")))
        if (tv("tip") > 0) totalRow(s(tx, "tip"), money(tv("tip")))
        e.text(pad).line('-', col)
        e.bold(true).size(1, 2)
        totalRow(s(tx, "total"), money(tv("total")))
        e.size(1, 1).bold(false)

        // 9. Cobro en caja: gruesa = hay que cobrar; fina = ya está pago.
        val payment = d.optJSONObject("payment")
        when (payment?.optString("kind") ?: "verify") {
            "collect_cash" -> {
                e.feed(1).bold(true).line('#', w).size(1, 2)
                e.row(s(v, "collectCashTitle"), money(payment?.optDouble("amount", 0.0) ?: 0.0), w)
                e.size(1, 1).bold(false).text(s(v, "cashWho")).newline()
                e.bold(true).line('#', w).bold(false)
            }
            "paid" -> {
                e.feed(1).line('-', w).bold(true).size(1, 2).text(s(v, "paidTitle")).newline().size(1, 1).bold(false)
                e.text(s(v, "doNotCharge")).newline().line('-', w)
            }
            else -> {
                e.feed(1).bold(true).line('#', w)
                wrap(s(v, "verifyPayment"), w).forEach { e.text(it).newline() }
                e.line('#', w).bold(false)
            }
        }

        // 10. Pie: cuándo entró y el número largo; gracias.
        e.feed(1).row(s(v, "placedLine"), s(d, "orderNumber"), w)
        e.feed(1).alignCenter()
        wrap(s(tx, "thanks"), w).forEach { e.text(it).newline() }
        e.text(s(tx, "poweredBy")).newline().alignLeft()

        // 11. Franja de cierre, igual de fina que la de arriba: base plana, no "en punta".
        val direct = s(r, "orderDirectUrl")
        if (direct.isNotEmpty()) {
            e.bold(true).size(1, 2)
            wrap("${s(tx, "orderDirect")}: $direct", w - 2).forEach { invertedCenter(e, it, w) }
            e.size(1, 1).bold(false)
        }
        e.cutPartial()
        return e.toByteArray()
    }

    /** Una línea invertida de lado a lado: texto a la izquierda y a la derecha. */
    private fun invertedRow(e: EscPosEncoder, left: String, right: String, w: Int) {
        val l = " $left"
        val rr = if (right.isEmpty()) "" else "$right "
        val gap = (w - l.length - rr.length).coerceAtLeast(1)
        e.reverse(true).text((l + " ".repeat(gap) + rr).take(w)).reverse(false).newline()
    }

    /** Una línea invertida de lado a lado con el texto centrado. */
    private fun invertedCenter(e: EscPosEncoder, text: String, w: Int) {
        val t = text.take(w)
        val left = (w - t.length) / 2
        e.reverse(true).text(" ".repeat(left) + t + " ".repeat(w - t.length - left)).reverse(false).newline()
    }

    // ── v3 (web anterior al 2026-11-21) ─────────────────────────────────────────
    private fun buildV3(d: JSONObject, tx: JSONObject, short: String, w: Int): ByteArray {

        val e = EscPosEncoder().init()

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

        // Delivery: dirección, teléfono e instrucciones arriba (Pedro 2026-11-18)
        val delivery = d.optJSONObject("delivery")
        if (delivery != null) {
            e.feed(1).bold(true).size(1, 2)
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
        }

        val scheduled = s(d, "scheduledFor")
        if (scheduled.isNotEmpty()) {
            e.bold(true).size(1, 2).text("${s(tx, "scheduled")} $scheduled").newline().size(1, 1).bold(false)
        }
        e.text(s(tx, "utensils")).newline()
        e.bold(true).text(s(tx, "itemCount")).newline().bold(false)
        e.line('=', w)

        // Ítems
        val items = d.optJSONArray("items")
        if (items != null) for (i in 0 until items.length()) {
            val it = items.getJSONObject(i)
            if (i > 0) e.line('-', w)
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
        e.line('=', w)

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

        // QR del repartidor (solo delivery)
        val driverUrl = delivery?.let { s(it, "driverUrl") } ?: ""
        if (driverUrl.startsWith("http")) {
            e.line('=', w)
            e.alignCenter().bold(true).text(s(tx, "driverScan")).newline().bold(false)
            e.qr(driverUrl, 7)
            e.alignLeft()
        }

        // Pie como el de Uber (Pedro 2026-11-18): cuándo entró, para cuándo y las gracias
        e.line('=', w)
        wrap(s(tx, "placedLine"), w).forEach { e.text(it).newline() }
        val due = s(tx, "dueLine")
        if (due.isNotEmpty()) { e.bold(true); wrap(due, w).forEach { e.text(it).newline() }; e.bold(false) }
        e.line('-', w)
        e.alignCenter()
        wrap(s(tx, "thanks"), w).forEach { e.text(it).newline() }
        val direct = s(d.optJSONObject("restaurant") ?: JSONObject(), "orderDirectUrl")
        if (direct.isNotEmpty()) e.text("${s(tx, "orderDirect")}: $direct").newline()
        e.text("${s(d, "orderNumber")} · ${s(tx, "poweredBy")}").newline()
        e.alignLeft()
        e.cutPartial()
        return e.toByteArray()
    }

    /** Una línea invertida que llena el ancho (el fondo negro llega al borde). */
    private fun inverted(e: EscPosEncoder, text: String, w: Int, mul: Int) {
        val cols = (w / mul).coerceAtLeast(1)
        val line = text.take(cols).padEnd(cols)
        e.reverse(true).size(mul, mul).text(line).size(1, 1).reverse(false).newline()
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
