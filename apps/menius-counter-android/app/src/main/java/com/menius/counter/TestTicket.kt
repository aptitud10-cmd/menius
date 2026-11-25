package com.menius.counter

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * The "Test print" ticket of the printer screen, in the SAME v5 format as a real
 * order (TicketV2). Before 1.0.9 it went through the old builder and came out
 * as "ORDEN #TEST", a raw ISO date, "* null" and "TOTAL USD0.00" (Pedro's MUNBYN,
 * 2026-11-25) — nothing like the tickets the kitchen gets.
 *
 * It is long on purpose and ends with a "the whole ticket arrived" line: if that
 * line is missing, the printer is dropping the end of the data.
 */
object TestTicket {

    fun payload(language: String = Locale.getDefault().language, now: LocalDateTime = LocalDateTime.now()): String {
        val es = language == "es"
        val time = DateTimeFormatter.ofPattern("h:mm a", Locale.US)
        val day = DateTimeFormatter.ofPattern(if (es) "d MMM, h:mm a" else "MMM d, h:mm a", if (es) Locale("es") else Locale.US)

        fun line(text: String, price: Double = 0.0, indent: Boolean = false) =
            JSONObject().put("text", text).put("price", price).put("indent", indent)

        fun item(qty: Int, name: String, total: Double, vararg lines: JSONObject, notes: String? = null) =
            JSONObject().put("qty", qty).put("name", name).put("lineTotal", total)
                .put("lines", JSONArray().apply { lines.forEach { put(it) } })
                .apply { if (notes != null) put("notes", notes) }

        val items = JSONArray()
            .put(item(1, if (es) "Plato de prueba" else "Test dish", 12.50,
                line(if (es) "Término: medio" else "Cook: Medium"),
                line(if (es) "Sin cebolla" else "No onions"),
                line(if (es) "Papas fritas" else "French Fries", 1.25),
                line(if (es) "con queso" else "with cheese", 1.00, indent = true),
                notes = if (es) "Cortar a la mitad" else "Cut in half"))
            .put(item(2, if (es) "Bebida de prueba" else "Test drink", 6.00))
            .put(item(1, if (es) "Prueba de acentos: ñ á é í ó ú" else "Accent test: ñ á é í ó ú", 3.50))

        val ticket = JSONObject()
            .put("kind", "order")
            .put("locale", if (es) "es" else "en")
            .put("restaurant", JSONObject()
                .put("name", if (es) "Prueba de impresora" else "Printer test")
                .put("currency", "USD")
                .put("orderDirectUrl", "OK"))
            .put("channel", "website")
            .put("orderType", "pickup")
            .put("shortNumber", "000")
            .put("orderNumber", "TEST")
            .put("customerName", if (es) "Prueba" else "Test")
            .put("readyAt", now.plusMinutes(15).format(time))
            .put("includeUtensils", true)
            .put("items", items)
            .put("itemCount", 4)
            .put("totals", JSONObject()
                .put("subtotal", 22.00).put("tax", 1.95).put("deliveryFee", 0)
                .put("discount", 0).put("tip", 0).put("total", 23.95))
            .put("payment", JSONObject().put("kind", "collect_cash").put("amount", 23.95))

        val v5 = JSONObject()
            .put("orderVia", if (es) "Prueba" else "Test")
            .put("orderType", if (es) "PARA RECOGER" else "PICKUP")
            .put("readyBy", if (es) "LISTO" else "READY BY")
            .put("noteLabel", if (es) "NOTA" else "NOTE")
            .put("utensilsLabel", if (es) "Cubiertos y servilletas" else "Utensils & napkins")
            .put("yes", if (es) "SÍ" else "YES")
            .put("no", "NO")
            .put("collectCashTitle", if (es) "COBRAR EFECTIVO" else "COLLECT CASH")
            .put("cashWho", if (es) "Ticket de prueba: no cobrar" else "Test ticket: do not charge")
            .put("placedLine", (if (es) "Impreso " else "Printed ") + now.format(day))
            .put("currencySymbol", "$")

        val text = JSONObject()
            .put("itemCount", if (es) "4 platos" else "4 items")
            .put("subtotal", "Subtotal")
            .put("tax", if (es) "Impuesto" else "Tax")
            .put("total", "TOTAL")
            .put("thanks", if (es) "Si ves esta línea, el ticket llegó completo." else "If you can read this line, the whole ticket arrived.")
            .put("poweredBy", "MENIUS Counter")
            .put("orderDirect", if (es) "Fin de la prueba" else "End of test")
            .put("v5", v5)

        return JSONObject()
            .put("ticketType", "receipt")
            .put("ticketVersion", 2)
            .put("ticket", ticket)
            .put("ticketText", text)
            .toString()
    }
}
