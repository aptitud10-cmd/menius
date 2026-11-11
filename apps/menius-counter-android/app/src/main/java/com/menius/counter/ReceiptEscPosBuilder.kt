package com.menius.counter

import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

/**
 * Builds ESC/POS from JSON emitted by MENIUS web ([native-bridge.ts] payload).
 */
object ReceiptEscPosBuilder {

    fun build(jsonPayload: String, lineWidth: Int): ByteArray {
        val root = JSONObject(jsonPayload)
        val ticketType = root.optString("ticketType", "receipt")
        return if (ticketType == "kitchen") {
            buildKitchen(root, lineWidth)
        } else {
            buildReceipt(root, lineWidth)
        }
    }

    private fun isEn(locale: String) = locale.startsWith("en")

    private fun fmtMoney(amount: Double, currency: String, locale: String): String {
        val loc = if (isEn(locale)) Locale.US else Locale.forLanguageTag("es-MX")
        return try {
            val nf = NumberFormat.getCurrencyInstance(loc)
            nf.setCurrency(java.util.Currency.getInstance(currency))
            nf.format(amount)
        } catch (_: Exception) {
            String.format(loc, "%.2f %s", amount, currency)
        }
    }

    private fun formatOrderType(type: String?, locale: String): String {
        if (type.isNullOrBlank()) return ""
        val en = isEn(locale)
        return when (type) {
            "delivery" -> if (en) "Delivery" else "Delivery"
            "pickup" -> if (en) "Pickup" else "Para recoger"
            "dine_in" -> if (en) "Dine-in" else "En mesa"
            else -> type
        }
    }

    private fun formatPayment(method: String?, locale: String): String {
        if (method.isNullOrBlank()) return ""
        val en = isEn(locale)
        return when (method) {
            "cash" -> if (en) "Cash" else "Efectivo"
            else -> if (en) "Online" else "En línea"
        }
    }

    private fun buildReceipt(root: JSONObject, w: Int): ByteArray {
        val locale = root.optString("locale", "es")
        val en = isEn(locale)
        val L = labels(en)

        val restaurantName = root.optString("restaurantName", "MENIUS")
        val orderNumber = root.optString("orderNumber", "?")
        val customerName = root.optString("customerName", "")
        val customerPhone = root.optString("customerPhone", "")
        val orderType = root.optString("orderType", "")
        val paymentMethod = root.optString("paymentMethod", "")
        val deliveryAddress = root.optString("deliveryAddress", "")
        val currency = root.optString("currency", "USD")
        val total = root.optDouble("total", 0.0)
        val tip = if (root.isNull("tip")) 0.0 else root.optDouble("tip", 0.0)
        // Desglose (web >= 2026-11-11). Antes el ticket solo traía propina y total:
        // envío, impuesto y descuento no salían y el total no cuadraba con los ítems.
        fun money(key: String) = if (root.isNull(key)) 0.0 else root.optDouble(key, 0.0)
        val subtotal = money("subtotal")
        val deliveryFee = money("deliveryFee")
        val discount = money("discountAmount")
        val tax = money("tax")
        val taxLabel = root.optString("taxLabel", "").takeIf { it.isNotBlank() && it != "null" } ?: (if (en) "Tax" else "Impuesto")
        val taxIncluded = root.optBoolean("taxIncluded", false)
        val tableName = root.optString("tableName", "").takeIf { it != "null" } ?: ""
        val driverUrl = root.optString("driverTrackingUrl", "").takeIf { it.startsWith("http") } ?: ""
        val notes = root.optString("notes", "")
        val eta = if (root.isNull("etaMinutes")) null else root.optInt("etaMinutes", 0).takeIf { it > 0 }
        val ts = root.optString("timestamp", "")

        val items = root.optJSONArray("items") ?: JSONArray()
        val e = EscPosEncoder().init()

        e.alignCenter().bold(true).doubleHeight(true)
        e.text(restaurantName.uppercase(Locale.getDefault())).newline()
        e.doubleHeight(false).bold(false)
        e.feed(1).line('=', w)

        e.alignCenter().bold(true)
        e.text("${L.order} #$orderNumber").newline()
        e.bold(false)
        if (ts.isNotEmpty()) e.text(ts).newline()
        e.line('-', w)
        e.alignLeft()

        if (customerName.isNotEmpty()) e.row("${L.customer}:", customerName, w)
        if (customerPhone.isNotEmpty()) e.row("${L.phone}:", customerPhone, w)
        val typeLabel = formatOrderType(orderType, locale)
        if (typeLabel.isNotEmpty()) e.row("${L.type}:", typeLabel, w)
        if (tableName.isNotEmpty()) e.row(if (en) "Table:" else "Mesa:", tableName, w)
        val payLabel = formatPayment(paymentMethod, locale)
        if (payLabel.isNotEmpty()) e.row("${L.payment}:", payLabel, w)
        if (deliveryAddress.isNotEmpty()) e.row("${L.address}:", deliveryAddress.take(w - 8), w)

        e.line('=', w)

        for (i in 0 until items.length()) {
            val it = items.getJSONObject(i)
            val qty = it.optInt("qty", 1)
            val name = it.optString("name", "Item")
            val lineTotal = it.optDouble("lineTotal", 0.0)
            val mods = it.optJSONArray("modifiers") ?: JSONArray()
            val itemNotes = it.optString("notes", "")

            val left = "${qty}x ${name.take((w - 10).coerceAtLeast(8))}"
            e.bold(true)
            e.row(left, fmtMoney(lineTotal, currency, locale), w)
            e.bold(false)
            for (m in 0 until mods.length()) {
                e.text("   - ${mods.getString(m)}").newline()
            }
            if (itemNotes.isNotEmpty()) e.text("   * $itemNotes").newline()
        }

        e.line('-', w)
        if (subtotal > 0 && (deliveryFee > 0 || discount > 0 || tax > 0 || tip > 0)) {
            e.row("Subtotal", fmtMoney(subtotal, currency, locale), w)
        }
        if (deliveryFee > 0) e.row(if (en) "Delivery" else "Envío", fmtMoney(deliveryFee, currency, locale), w)
        if (discount > 0) e.row(if (en) "Discount" else "Descuento", "-" + fmtMoney(discount, currency, locale), w)
        if (tax > 0) {
            val label = if (taxIncluded) "$taxLabel (${if (en) "incl." else "incl."})" else taxLabel
            e.row(label, fmtMoney(tax, currency, locale), w)
        }
        if (tip > 0) {
            e.row(if (en) "Tip" else "Propina", fmtMoney(tip, currency, locale), w)
        }
        e.bold(true)
        e.row(L.total, fmtMoney(total, currency, locale), w)
        e.bold(false)

        if (notes.isNotEmpty()) {
            e.feed(1)
            e.text("${L.notes}: $notes").newline()
        }

        eta?.let {
            e.feed(1)
            e.alignCenter().bold(true)
            // No emoji: thermal printers have no glyph for it (the encoder drops
            // it now, but there's no reason to emit it in the first place).
            e.text("${L.eta}: $it min").newline()
            e.bold(false).alignLeft()
        }

        if (driverUrl.isNotEmpty()) {
            e.feed(1).alignCenter().bold(true)
            e.text(if (en) "DRIVER: SCAN TO START" else "REPARTIDOR: ESCANEA").newline()
            e.bold(false)
            e.qr(driverUrl)
            e.alignLeft()
        }

        e.feed(1).line('-', w)
        e.alignCenter()
        e.text(L.thanks).newline()
        e.text("Powered by MENIUS").newline()
        e.cutPartial()

        return e.toByteArray()
    }

    private fun buildKitchen(root: JSONObject, w: Int): ByteArray {
        val locale = root.optString("locale", "es")
        val en = isEn(locale)
        val restaurantName = root.optString("restaurantName", "")
        val orderNumber = root.optString("orderNumber", "?")
        val orderType = root.optString("orderType", "")
        val notes = root.optString("notes", "")
        val eta = if (root.isNull("etaMinutes")) null else root.optInt("etaMinutes", 0).takeIf { it > 0 }
        val items = root.optJSONArray("items") ?: JSONArray()

        val e = EscPosEncoder().init()
        e.alignCenter().bold(true)
        e.text(restaurantName.uppercase(Locale.getDefault())).newline()
        e.bold(false)
        e.text(if (en) "KITCHEN TICKET" else "TICKET DE COCINA").newline()
        e.line('=', w)
        e.doubleHeight(true).bold(true)
        e.text("#$orderNumber").newline()
        e.doubleHeight(false).bold(false)
        val typeLabel = formatOrderType(orderType, locale)
        if (typeLabel.isNotEmpty()) {
            e.alignCenter().text(typeLabel.uppercase(Locale.getDefault())).newline()
        }
        val table = root.optString("tableName", "").takeIf { it.isNotBlank() && it != "null" }
        if (table != null) {
            e.alignCenter().bold(true).text(table.uppercase(Locale.getDefault())).newline().bold(false)
        }
        e.line('=', w)
        e.alignLeft()

        for (i in 0 until items.length()) {
            val it = items.getJSONObject(i)
            val qty = it.optInt("qty", 1)
            val name = it.optString("name", "Item")
            val mods = it.optJSONArray("modifiers") ?: JSONArray()
            val itemNotes = it.optString("notes", "")
            e.bold(true)
            e.text("${qty}x $name").newline()
            e.bold(false)
            for (m in 0 until mods.length()) {
                e.text("   - ${mods.getString(m)}").newline()
            }
            if (itemNotes.isNotEmpty()) e.text("   * $itemNotes").newline()
        }

        e.line('-', w)
        if (notes.isNotEmpty()) {
            e.bold(true)
            e.text("!! ${notes}").newline()
            e.bold(false)
        }
        eta?.let {
            e.alignCenter().bold(true)
            e.text("$it min").newline()
            e.bold(false).alignLeft()
        }
        e.feed(2).cutPartial()
        return e.toByteArray()
    }

    private data class Labels(
        val order: String,
        val customer: String,
        val guest: String,
        val phone: String,
        val type: String,
        val payment: String,
        val address: String,
        val total: String,
        val notes: String,
        val eta: String,
        val thanks: String,
    )

    private fun labels(en: Boolean) = Labels(
        order = if (en) "ORDER" else "ORDEN",
        customer = if (en) "Customer" else "Cliente",
        guest = if (en) "Guest" else "Invitado",
        phone = if (en) "Phone" else "Tel",
        type = if (en) "Type" else "Tipo",
        payment = if (en) "Payment" else "Pago",
        address = if (en) "Addr" else "Dir",
        total = if (en) "TOTAL" else "TOTAL",
        notes = if (en) "Notes" else "Notas",
        eta = if (en) "Ready in" else "Lista en",
        thanks = if (en) "Thank you!" else "Gracias!",
    )
}
