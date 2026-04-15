export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication first with the user-scoped client
    const supabase = createClient();
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

    let optimizedBuffer: Buffer;
    const contentType = 'image/webp';
    const ext = 'webp';

    try {
      const sharp = (await import('sharp')).default;
      // Sharp validates the actual file content — if this throws, the file
      // is not a real image regardless of what Content-Type the client claimed.
      optimizedBuffer = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();
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
    const fileName = `${tenant.userId}/${slug || 'img'}-${Date.now()}.${ext}`;

    const { error: uploadError } = await adminDb.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = adminDb.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
