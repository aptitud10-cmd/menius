import { LEGAL_PROSE_LIGHT } from "./PrivacyPolicyContent";

// Política de reembolsos que el comensal ve dentro de la tienda
// (/[slug]/legal/refunds). Es la misma para todos los restaurantes, con el
// nombre y el teléfono de cada uno. BORRADOR del 2026-11-17 hecho a partir de
// cómo funciona el sistema hoy; falta la revisión del abogado.
//
// Si cambia el sistema, cambia esto:
// - cancelación automática a los 15 min de un pedido SIN PAGAR que no se acepta
//   (cron order-timeouts);
// - un pedido PAGADO con tarjeta (Stripe) que no se acepta en 15 min se cancela
//   y se reembolsa el total solo (mismo cron, Fase C; corre cada 10 min, por eso
//   "unos 15 minutos"). Wompi/Mercado Pago NO se reembolsan solos: si una tienda
//   con Wompi sale a producción, esta frase no le aplica;
// - "No vino a buscarlo" marca al cliente y, si la tienda cobra con tarjeta, le
//   pide pagar por adelantado (PREPAY_REQUIRED en /api/orders);
// - un pedido pagado no se cancela sin reembolsarlo, y el reembolso es por el
//   total (PAID_ORDER_NEEDS_REFUND, /api/payments/refund).
//
// cashOnly: la tienda no cobra con tarjeta → se omiten las secciones de tarjeta,
// banco y disputas (una política de efectivo que habla de tarjetas confunde).
// Los textos van como strings para no perder espacios en los saltos de JSX.

export const REFUND_POLICY_UPDATED = { es: "25 de noviembre de 2026", en: "November 25, 2026" };

interface Props {
  locale: "es" | "en";
  name: string;
  phone?: string | null;
  address?: string | null;
  cashOnly: boolean;
}

/** (718) 429-5188 para números de EE. UU./Canadá; el resto tal cual. */
function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

type Section = { title: string; body: string[] };

function sectionsEn(R: string, cashOnly: boolean): Section[] {
  const s: Section[] = [
    {
      title: "Who you are buying from",
      body: [`${R} prepares and sells your order, and is the one who decides on and issues refunds. MENIUS is the technology platform ${R} uses to take orders online; it does not prepare or sell the food.`],
    },
    {
      title: cashOnly ? "Paying" : "Cash orders",
      body: [
        `${cashOnly ? `${R} only takes cash, so nothing is charged online.` : "Nothing is charged online."} If the order is cancelled before you get it, you pay nothing. An order that ${R} doesn't confirm within 15 minutes is cancelled automatically, and you get a notice.`,
      ],
    },
  ];
  if (!cashOnly) {
    s.push({
      title: "If the restaurant cancels your order",
      body: [
        `If ${R} cancels an order you paid by card (for example, an item ran out or the kitchen closed), ${R} refunds everything you paid: food, tax, delivery fee and tip. You'll see it on your order tracking page.`,
        `If ${R} doesn't confirm an order you paid by card within about 15 minutes, the order is cancelled automatically and the full amount goes back to your card, without you having to ask. For an order scheduled for later, the clock starts when the order reaches the restaurant.`,
      ],
    });
  }
  s.push(
    {
      title: "If you want to cancel",
      body: [
        cashOnly
          ? `Call ${R} as soon as possible. If they haven't started preparing it, they cancel it at no cost. Once the kitchen has started, cancelling is up to ${R}, because the food is already being made.`
          : `Call ${R} as soon as possible. If they haven't started preparing it, they cancel at no cost and, if you paid by card, refund the full amount. Once the kitchen has started, cancelling and refunding are up to ${R}, because the food is already being made.`,
      ],
    },
    {
      title: "If something was wrong with your order",
      body: [`If an item is missing, you got the wrong one, or it arrived in bad condition, tell ${R} within 24 hours (a photo helps). Depending on the case, ${R} can replace the item or ${cashOnly ? "give your money back" : "give you a refund"}. Personal taste (for example, "I didn't like the flavor") is not grounds for a refund unless ${R} decides otherwise.`],
    },
    {
      title: "Orders that are never picked up or can't be delivered",
      body: [
        `If you don't pick up a takeout order, or it can't be delivered because the address or phone number was wrong or nobody was there to receive it, the food was already made and is not refunded.${cashOnly ? "" : ` If this happens with a cash order, ${R} may ask you to pay by card when you place future orders.`}`,
      ],
    },
  );
  if (!cashOnly) {
    s.push(
      {
        title: "How and when refunds arrive",
        body: ["Refunds go back to the card you paid with. Once issued, your bank may take 5 to 10 business days to show it. The refund covers the full amount you paid, including the tip."],
      },
      {
        title: "Before disputing a charge",
        body: [`If you have a problem with a charge, talk to ${R} first. It is almost always faster than a dispute with your bank.`],
      },
    );
  }
  return s;
}

function sectionsEs(R: string, cashOnly: boolean): Section[] {
  const s: Section[] = [
    {
      title: "Quién te vende",
      body: [`${R} prepara y vende tu pedido, y es quien decide y emite los reembolsos. MENIUS es la plataforma tecnológica que ${R} usa para recibir pedidos en línea; no prepara ni vende la comida.`],
    },
    {
      title: cashOnly ? "Cómo se paga" : "Pedidos pagados en efectivo",
      body: [
        `${cashOnly ? `${R} solo acepta efectivo, así que no se cobra nada en línea.` : "No se cobra nada en línea."} Si el pedido se cancela antes de que lo recibas, no pagas nada. Un pedido que ${R} no confirma en 15 minutos se cancela solo, y te llega un aviso.`,
      ],
    },
  ];
  if (!cashOnly) {
    s.push({
      title: "Si el restaurante cancela tu pedido",
      body: [
        `Si ${R} cancela un pedido que pagaste con tarjeta (por ejemplo, porque se acabó un plato o la cocina cerró), ${R} te devuelve todo lo que pagaste: comida, impuestos, envío y propina. Lo verás en la página de seguimiento de tu pedido.`,
        `Si ${R} no confirma en unos 15 minutos un pedido que pagaste con tarjeta, el pedido se cancela automáticamente y se te devuelve el total a la tarjeta, sin que tengas que pedirlo. En un pedido programado para más tarde, el plazo empieza a contar cuando el pedido llega al restaurante.`,
      ],
    });
  }
  s.push(
    {
      title: "Si quieres cancelar tu pedido",
      body: [
        cashOnly
          ? `Llama a ${R} lo antes posible. Si todavía no empezaron a prepararlo, lo cancelan sin costo. Una vez que la cocina empezó, cancelar queda a criterio de ${R}, porque la comida ya se está haciendo.`
          : `Llama a ${R} lo antes posible. Si todavía no empezaron a prepararlo, lo cancelan sin costo y, si pagaste con tarjeta, te devuelven el total. Una vez que la cocina empezó, cancelar y reembolsar queda a criterio de ${R}, porque la comida ya se está haciendo.`,
      ],
    },
    {
      title: "Si algo salió mal con tu pedido",
      body: [`Si falta un plato, recibiste uno equivocado o llegó en mal estado, avisa a ${R} dentro de las 24 horas siguientes (una foto ayuda). Según el caso, ${R} puede reponer el plato o ${cashOnly ? "devolverte el dinero" : "hacerte un reembolso"}. Los gustos personales (por ejemplo, "no me gustó el sabor") no dan derecho a reembolso, salvo que ${R} decida otra cosa.`],
    },
    {
      title: "Pedidos que no se recogen o no se pueden entregar",
      body: [
        `Si no recoges un pedido para llevar, o no se puede entregar porque la dirección o el teléfono eran incorrectos o no había nadie para recibirlo, la comida ya se preparó y no se reembolsa.${cashOnly ? "" : ` Si esto pasa con un pedido en efectivo, ${R} puede pedirte que pagues con tarjeta en tus próximos pedidos.`}`,
      ],
    },
  );
  if (!cashOnly) {
    s.push(
      {
        title: "Cómo y cuándo llega el reembolso",
        body: ["El reembolso vuelve a la tarjeta con la que pagaste. Una vez emitido, tu banco puede tardar de 5 a 10 días hábiles en mostrarlo. El reembolso cubre todo lo que pagaste, propina incluida."],
      },
      {
        title: "Antes de disputar un cobro",
        body: [`Si tienes un problema con un cobro, habla primero con ${R}. Casi siempre se resuelve más rápido que con una disputa en tu banco.`],
      },
    );
  }
  return s;
}

export function RefundPolicyContent({ locale, name, phone, address, cashOnly }: Props) {
  const en = locale === "en";
  const sections = en ? sectionsEn(name, cashOnly) : sectionsEs(name, cashOnly);
  const tel = phone?.replace(/[^\d+]/g, "");
  return (
    <div className={LEGAL_PROSE_LIGHT}>
      {sections.map((sec, i) => (
        <section key={sec.title}>
          <h2>{`${i + 1}. ${sec.title}`}</h2>
          {sec.body.map((p) => <p key={p}>{p}</p>)}
        </section>
      ))}
      <h2>{`${sections.length + 1}. ${en ? "Contact" : "Contacto"}`}</h2>
      <p>
        <strong>{name}</strong>
        {address ? <><br />{address}</> : null}
        {tel ? <><br /><a href={`tel:${tel}`}>{prettyPhone(phone ?? "")}</a></> : null}
      </p>
    </div>
  );
}
