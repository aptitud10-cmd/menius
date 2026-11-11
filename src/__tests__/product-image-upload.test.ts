import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadOptimizedProductImage } from '@/lib/product-image-upload';

/** Storage falso: guarda lo subido y puede fallar para ciertas rutas. */
function fakeDb(failIf?: (path: string) => boolean) {
  const uploaded: Record<string, { size: number; contentType?: string }> = {};
  const bucket = {
    upload: async (path: string, buf: Buffer, opts: { contentType?: string }) => {
      if (failIf?.(path)) return { data: null, error: new Error('boom') };
      uploaded[path] = { size: buf.length, contentType: opts.contentType };
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

  it('rechaza algo que no es imagen', async () => {
    const { db } = fakeDb();
    await expect(uploadOptimizedProductImage(db, 'u/x', Buffer.from('no soy una imagen'))).rejects.toThrow();
  });
});
