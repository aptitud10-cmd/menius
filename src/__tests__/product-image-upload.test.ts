import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadOptimizedProductImage } from '@/lib/product-image-upload';

/** Storage falso: guarda lo subido y puede fallar para ciertas rutas. */
function fakeDb(failIf?: (path: string) => boolean) {
  const uploaded: Record<string, { size: number; contentType?: string; buf: Buffer }> = {};
  const bucket = {
    upload: async (path: string, buf: Buffer, opts: { contentType?: string }) => {
      if (failIf?.(path)) return { data: null, error: new Error('boom') };
      uploaded[path] = { size: buf.length, contentType: opts.contentType, buf };
      return { data: { path }, error: null };
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/product-images/${path}` } }),
  };
  const db = { storage: { from: () => bucket } } as unknown as SupabaseClient;
  return { db, uploaded };
}

const png = () =>
  sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#c33' } }).png().toBuffer();

describe('uploadOptimizedProductImage', () => {
  it('sube __sm.webp + __lg.jpg y devuelve la URL de la grande', async () => {
    const { db, uploaded } = fakeDb();
    const url = await uploadOptimizedProductImage(db, 'u/burger-1', await png());
    expect(url).toMatch(/\/u\/burger-1__lg\.jpg$/);
    expect(uploaded['u/burger-1__sm.webp']?.contentType).toBe('image/webp');
    expect(uploaded['u/burger-1__lg.jpg']?.contentType).toBe('image/jpeg');
  });

  it('si la chica falla, NO deja una __lg huérfana: sube un .jpg normal', async () => {
    const { db, uploaded } = fakeDb((p) => p.endsWith('__sm.webp'));
    const url = await uploadOptimizedProductImage(db, 'u/burger-2', await png());
    expect(url).toMatch(/\/u\/burger-2\.jpg$/);
    expect(Object.keys(uploaded)).toEqual(['u/burger-2.jpg']);
  });

  it('un logo PNG transparente queda con esquinas BLANCAS, no negras', async () => {
    const circle = Buffer.from(
      '<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="#f4cad4"/></svg>',
    );
    const logo = await sharp(circle).png().toBuffer();
    const { db, uploaded } = fakeDb();
    await uploadOptimizedProductImage(db, 'u/logo', logo);
    for (const path of ['u/logo__lg.jpg', 'u/logo__sm.webp']) {
      const { data, info } = await sharp(uploaded[path].buf).raw().toBuffer({ resolveWithObject: true });
      const corner = [data[0], data[1], data[2]];
      expect(corner.every((v) => v > 245), `${path} esquina ${corner}`).toBe(true);
      expect(info.channels).toBe(3);
    }
  });

  it('rechaza algo que no es imagen', async () => {
    const { db } = fakeDb();
    await expect(uploadOptimizedProductImage(db, 'u/x', Buffer.from('no soy una imagen'))).rejects.toThrow();
  });
});
