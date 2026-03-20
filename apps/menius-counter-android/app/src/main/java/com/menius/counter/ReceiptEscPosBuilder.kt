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
            e.text("⏱ ${L.eta}: $it min").newline()
            e.bold(false).alignLeft()
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
            e.text("⏱ $it min").newline()
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
