import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { allowed } = checkRateLimit(`ai:${tenant.userId}`, { limit: 20, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Límite de generaciones alcanzado. Intenta en 1 hora.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini AI no está configurado. Agrega GEMINI_API_KEY en las variables de entorno.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { productName, description, style } = body;

    if (!productName?.trim()) {
      return NextResponse.json({ error: 'Nombre del producto requerido' }, { status: 400 });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const styleInstructions: Record<string, string> = {
      professional: 'Professional food photography style. Clean white or neutral background. Soft natural lighting. Shallow depth of field. Shot from a 45-degree angle.',
      rustic: 'Rustic artisanal food photography. Wooden table surface. Warm moody lighting. Vintage props like burlap napkins. Overhead flat-lay composition.',
      modern: 'Modern minimalist food photography. Clean geometric plating. Bright even lighting. Solid color background. Top-down flat lay view.',
      vibrant: 'Vibrant colorful food photography. Rich saturated colors. Dynamic angle. Fresh ingredients scattered around. Bright natural daylight.',
    };

    const stylePrompt = styleInstructions[style] || styleInstructions.professional;

    const prompt = `Generate a beautiful, appetizing food photography image of: "${productName}"${description ? `. Description: ${description}` : ''}.

${stylePrompt}

Requirements:
- High quality, photorealistic food image
- No text, watermarks, or logos on the image
- Focus entirely on the dish/food item
- Make the food look fresh, delicious, and professionally presented
- Square aspect ratio (1:1)`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
      } as any,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    let imageBase64: string | null = null;
    let mimeType = 'image/png';

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData) {
          imageBase64 = (part as any).inlineData.data;
          mimeType = (part as any).inlineData.mimeType || 'image/png';
          break;
        }
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No se pudo generar la imagen. Intenta con una descripción diferente.' },
        { status: 422 }
      );
    }

    const supabase = createClient();
    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${tenant.userId}/ai-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Error guardando imagen: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: urlData.publicUrl,
      generated: true,
    });
  } catch (err: any) {
    console.error('AI image generation error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error generando imagen con IA' },
      { status: 500 }
    );
  }
}
