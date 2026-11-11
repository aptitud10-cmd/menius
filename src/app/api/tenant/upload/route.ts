export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { uploadOptimizedProductImage } from '@/lib/product-image-upload';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication first with the user-scoped client
    const supabase = await createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Use admin client (service role) for the actual upload — bypasses
    // Storage RLS policies that may not be configured on the bucket.
    // Authentication is already verified above so this is safe.
    const adminDb = createAdminClient();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Máximo 10MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const sharp = (await import('sharp')).default;
      // Sharp validates the actual file content — if this throws, the file
      // is not a real image regardless of what Content-Type the client claimed.
      await sharp(buffer).metadata();
    } catch {
      // Reject: file claims to be an image but Sharp cannot decode it.
      // Uploading the original would store arbitrary content in a public bucket.
      return NextResponse.json(
        { error: 'El archivo no es una imagen válida o está corrupto.' },
        { status: 400 }
      );
    }

    const slug = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    // Dos tamaños ya optimizados (ver lib/product-image-upload.ts): el menú
    // los sirve directo del CDN en vez de transformarlos al vuelo.
    let url: string;
    try {
      url = await uploadOptimizedProductImage(
        adminDb,
        `${tenant.userId}/${slug || 'img'}-${Date.now()}`,
        buffer,
      );
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Error subiendo la imagen' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
