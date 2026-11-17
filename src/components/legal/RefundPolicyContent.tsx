import { LEGAL_PROSE_LIGHT } from "./PrivacyPolicyContent";

// Política de reembolsos que el comensal ve dentro de la tienda
// (/[slug]/legal/refunds). Es la misma para todos los restaurantes, con el
// nombre y el teléfono de cada uno. BORRADOR del 2026-11-17 hecho a partir de
// cómo funciona el sistema hoy; falta la revisión del abogado.
//
// Si cambia el sistema, cambia esto: cancelación automática a los 15 min sin
// aceptar (cron order-timeouts), "No vino a buscarlo" marca al cliente y le
// pide tarjeta la próxima vez (PREPAY_REQUIRED en /api/orders), y un pedido
// pagado no se puede cancelar sin reembolsar (PAID_ORDER_NEEDS_REFUND).

export const REFUND_POLICY_UPDATED = { es: "17 de noviembre de 2026", en: "November 17, 2026" };

interface Props {
  locale: "es" | "en";
  name: string;
  phone?: string | null;
  address?: string | null;
}

function Contact({ name, phone, address, callLabel }: { name: string; phone?: string | null; address?: string | null; callLabel: string }) {
  const tel = phone?.replace(/[^\d+]/g, "");
  return (
    <ul>
      <li><strong>{name}</strong>{address ? ` · ${address}` : ""}</li>
      {tel && <li><a href={`tel:${tel}`}>{callLabel} {phone}</a></li>}
    </ul>
  );
}

export function RefundPolicyContent({ locale, name: R, phone, address }: Props) {
  if (locale === "en") {
    return (
      <div className={LEGAL_PROSE_LIGHT}>
        <h2>1. Who you are buying from</h2>
        <p>
          {R} prepares and sells your order, and is the one who decides on and issues refunds.
          MENIUS is the technology platform {R} uses to take orders online; it does not prepare or sell the food.
        </p>

        <h2>2. Cash orders</h2>
        <p>
          Nothing is charged online. If the order is cancelled before you get it, you pay nothing. An order
          that {R} doesn&apos;t confirm within 15 minutes is cancelled automatically, and you get a notice.
          If you paid in cash and something went wrong, {R} sorts it out with you directly (see section 5).
        </p>

        <h2>3. If the restaurant cancels your order</h2>
        <p>
          If {R} cancels an order you paid by card (for example, an item ran out or the kitchen closed),
          {R} refunds everything you paid: food, tax, delivery fee and tip. You&apos;ll see it on your
          order tracking page.
        </p>

        <h2>4. If you want to cancel</h2>
        <p>
          Call {R} as soon as possible. If they haven&apos;t started preparing it, they cancel at no cost
          and, if you paid by card, refund the full amount. Once the kitchen has started, cancelling and
          refunding are up to {R}, because the food is already being made.
        </p>

        <h2>5. If something was wrong with your order</h2>
        <p>
          If an item is missing, you got the wrong one, or it arrived in bad condition, tell {R} within
          24 hours (a photo helps). Depending on the case, {R} can replace the item or give you a refund.
          Personal taste (for example, &ldquo;I didn&apos;t like the flavor&rdquo;) is not grounds for a
          refund unless {R} decides otherwise.
        </p>

        <h2>6. Orders that are never picked up or can&apos;t be delivered</h2>
        <p>
          If you don&apos;t pick up a takeout order, or it can&apos;t be delivered because the address or
          phone number was wrong or nobody was there to receive it, the food was already made and is not
          refunded. If this happens with a cash order and {R} takes cards, it may ask you to pay by card
          when you place future orders.
        </p>

        <h2>7. How and when refunds arrive</h2>
        <p>
          Refunds go back to the payment method you used. Once issued, your bank may take 5 to 10 business
          days to show it. The refund covers the full amount you paid, including the tip.
        </p>

        <h2>8. Before disputing a charge</h2>
        <p>
          If you have a problem with a charge, talk to {R} first. It is almost always faster than a dispute
          with your bank.
        </p>

        <h2>9. Contact</h2>
        <Contact name={R} phone={phone} address={address} callLabel="Call" />
      </div>
    );
  }

  return (
    <div className={LEGAL_PROSE_LIGHT}>
      <h2>1. Quién te vende</h2>
      <p>
        {R} prepara y vende tu pedido, y es quien decide y emite los reembolsos. MENIUS es la
        plataforma tecnológica que {R} usa para recibir pedidos en línea; no prepara ni vende la comida.
      </p>

      <h2>2. Pedidos pagados en efectivo</h2>
      <p>
        No se cobra nada en línea. Si el pedido se cancela antes de que lo recibas, no pagas nada. Un
        pedido que {R} no confirma en 15 minutos se cancela solo, y te llega un aviso. Si pagaste en efectivo y
        hubo un problema, {R} lo resuelve directamente contigo (ver punto 5).
      </p>

      <h2>3. Si el restaurante cancela tu pedido</h2>
      <p>
        Si {R} cancela un pedido que pagaste con tarjeta (por ejemplo, porque se acabó un plato o la cocina
        cerró), {R} te devuelve todo lo que pagaste: comida, impuestos, envío y propina. Lo verás en la
        página de seguimiento de tu pedido.
      </p>

      <h2>4. Si quieres cancelar tu pedido</h2>
      <p>
        Llama a {R} lo antes posible. Si todavía no empezaron a prepararlo, lo cancelan sin costo y, si
        pagaste con tarjeta, te devuelven el total. Una vez que la cocina empezó, cancelar y reembolsar
        queda a criterio de {R}, porque la comida ya se está haciendo.
      </p>

      <h2>5. Si algo salió mal con tu pedido</h2>
      <p>
        Si falta un plato, recibiste uno equivocado o llegó en mal estado, avisa a {R} dentro de las 24
        horas siguientes (una foto ayuda). Según el caso, {R} puede reponer el plato o hacerte un
        reembolso. Los gustos personales (por ejemplo, &ldquo;no me gustó el sabor&rdquo;) no dan derecho a
        reembolso, salvo que {R} decida otra cosa.
      </p>

      <h2>6. Pedidos que no se recogen o no se pueden entregar</h2>
      <p>
        Si no recoges un pedido para llevar, o no se puede entregar porque la dirección o el teléfono eran
        incorrectos o no había nadie para recibirlo, la comida ya se preparó y no se reembolsa. Si esto pasa
        con un pedido en efectivo y {R} acepta tarjeta, puede pedirte que pagues con tarjeta en tus próximos pedidos.
      </p>

      <h2>7. Cómo y cuándo llega el reembolso</h2>
      <p>
        El reembolso vuelve al mismo método de pago que usaste. Una vez emitido, tu banco puede tardar de 5
        a 10 días hábiles en mostrarlo. El reembolso cubre todo lo que pagaste, propina incluida.
      </p>

      <h2>8. Antes de disputar un cobro</h2>
      <p>
        Si tienes un problema con un cobro, habla primero con {R}. Casi siempre se resuelve más rápido que
        con una disputa en tu banco.
      </p>

      <h2>9. Contacto</h2>
      <Contact name={R} phone={phone} address={address} callLabel="Llamar al" />
    </div>
  );
}
