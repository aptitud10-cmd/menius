export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const supabase = await createClient();
    const { data: files, error } = await supabase.storage
      .from('product-images')
      .list(tenant.userId, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const images = (files ?? [])
      .filter(f => !f.id?.startsWith('.') && f.name !== '.emptyFolderPlaceholder')
      .map(f => {
        const path = `${tenant.userId}/${f.name}`;
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        return {
          name: f.name,
          path,
          url: data.publicUrl,
          size: f.metadata?.size ?? 0,
          contentType: f.metadata?.mimetype ?? 'image/unknown',
          createdAt: f.created_at,
        };
      });

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { path: filePath } = await request.json();
    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'Ruta de archivo requerida' }, { status: 400 });
    }

    if (!filePath.startsWith(`${tenant.userId}/`)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const supabase = await createClient();
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
