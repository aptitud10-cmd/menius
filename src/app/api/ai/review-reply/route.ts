export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/auth/get-tenant";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { UUID_RE } from "@/lib/constants";

const logger = createLogger("api:ai:review-reply");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(params: {
  rating: number;
  comment: string;
  customerName: string;
  restaurantName: string;
  locale: string;
}): string {
  const { rating, comment, customerName, restaurantName, locale } = params;

  const toneGuide =
    rating <= 2
      ? "Tono: empático, reconoce el problema, ofrece una solución o invita al cliente a contactar directamente para resolverlo."
      : rating === 3
        ? "Tono: neutro y agradecido. Reconoce el comentario y muestra disposición de mejorar."
        : "Tono: entusiasta y auténtico. Celebra la experiencia positiva sin sonar exagerado.";

  const langInstruction = locale.startsWith("en")
    ? "Respond in English."
    : locale.startsWith("pt")
      ? "Responde en portugués."
      : "Responde en español.";

  return `Eres el dueño de "${restaurantName}". Escribe una respuesta profesional y cálida a la siguiente reseña de un cliente.

${langInstruction}
${toneGuide}
Máximo 100 palabras. No menciones el nombre de ninguna plataforma de software. Sé específico respecto al comentario del cliente, no genérico.

Cliente: ${customerName}
Calificación: ${rating}/5
Reseña: "${comment}"

Respuesta (solo el texto, sin comillas ni encabezados):`;
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Rate limit: 20 por hora por userId
    const rl = await checkRateLimitAsync(`review-reply:${tenant.userId}`, {
      limit: 20,
      windowSec: 3600,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Límite de solicitudes alcanzado. Intenta más tarde." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { reviewId, rating, comment, customerName, restaurantName, locale } =
      body as {
        reviewId: string;
        rating: number;
        comment: string;
        customerName: string;
        restaurantName: string;
        locale: string;
      };

    // Validaciones básicas
    if (!reviewId || !UUID_RE.test(String(reviewId))) {
      return NextResponse.json({ error: "reviewId inválido" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "rating debe ser 1-5" },
        { status: 400 },
      );
    }
    if (!customerName || !restaurantName) {
      return NextResponse.json(
        { error: "customerName y restaurantName requeridos" },
        { status: 400 },
      );
    }

    // Verificar que la review pertenece al restaurante del tenant
    const supabase = await createClient();
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("id", reviewId)
      .eq("restaurant_id", tenant.restaurantId)
      .maybeSingle();

    if (reviewError) {
      logger.error("Error verificando review", { error: reviewError.message });
      return NextResponse.json(
        { error: "Error al verificar la reseña" },
        { status: 500 },
      );
    }
    if (!review) {
      return NextResponse.json(
        { error: "Reseña no encontrada" },
        { status: 404 },
      );
    }

    // Llamada a Claude
    const prompt = buildPrompt({
      rating,
      comment: comment ?? "",
      customerName,
      restaurantName,
      locale: locale ?? "es",
    });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const suggestion = (
      msg.content[0] as { type: string; text: string }
    ).text.trim();

    return NextResponse.json({ suggestion });
  } catch (err) {
    logger.error("review-reply error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
