import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sube una foto de producto YA optimizada, en tres archivos:
 *   `<base>__lg.jpg`  ≤1200px, mozjpeg q80 — es la URL que se guarda (JPEG
 *                     para que sirva también en emails y previews sin WebP).
 *   `<base>__md.webp` ≤1200px, q72 — la pide supabaseLoader entre 641 y 1200px
 *                     (zoom 150 %, retina, ficha): pesa ~45 % menos que el JPEG.
 *   `<base>__sm.webp` 640px, q75 — la pide supabaseLoader para tarjetas y
 *                     miniaturas.
 * Se sirven directo del CDN, sin /render/image/: la transformación al vuelo
 * tardaba ~1 s por foto la primera vez y se factura (ver image-loader.ts).
 *
 * Si alguna de las WebP no se puede subir, se sube UN archivo con nombre normal
 * (`<base>.jpg`) y el loader lo transforma como siempre: nunca queda una URL
 * `__lg` sin su `__sm` y su `__md`.
 *
 * `basePath` es la ruta dentro del bucket product-images, sin extensión.
 * Lanza error si `input` no es una imagen que sharp pueda leer.
 */
export async function uploadOptimizedProductImage(
  db: SupabaseClient,
  basePath: string,
  input: Buffer,
): Promise<string> {
  const sharp = (await import('sharp')).default;
  // Lo transparente va sobre BLANCO en las dos versiones. JPEG no tiene canal
  // alfa y sharp lo rellenaba de NEGRO: un logo redondo en PNG quedaba con
  // esquinas negras en el favicon, el ícono del iPhone y el panel. La chica
  // también se aplana para que las dos se vean iguales.
  const lg = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  const sm = await sharp(input)
    .rotate()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 75 })
    .toBuffer();
  // Del JPEG ya aplanado y achicado: mismos píxeles que la grande, en WebP.
  const md = await sharp(lg).webp({ quality: 72, effort: 6 }).toBuffer();

  const bucket = db.storage.from('product-images');
  const opts = { cacheControl: '31536000', upsert: false };

  const smRes = await bucket.upload(`${basePath}__sm.webp`, sm, { ...opts, contentType: 'image/webp' });
  const mdRes = smRes.error
    ? smRes
    : await bucket.upload(`${basePath}__md.webp`, md, { ...opts, contentType: 'image/webp' });
  if (smRes.error || mdRes.error) {
    const plain = `${basePath}.jpg`;
    const r = await bucket.upload(plain, lg, { ...opts, contentType: 'image/jpeg' });
    if (r.error) throw r.error;
    return bucket.getPublicUrl(plain).data.publicUrl;
  }

  const lgPath = `${basePath}__lg.jpg`;
  const lgRes = await bucket.upload(lgPath, lg, { ...opts, contentType: 'image/jpeg' });
  if (lgRes.error) throw lgRes.error;
  return bucket.getPublicUrl(lgPath).data.publicUrl;
}
