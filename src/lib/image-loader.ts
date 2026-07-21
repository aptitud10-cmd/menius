/**
 * Custom Next.js image loader for Supabase Storage.
 * Leverages Supabase's built-in image transformation API
 * to serve resized, optimized images directly from the CDN edge.
 *
 * Usage with Next.js <Image>:
 *   <Image loader={supabaseLoader} src={url} width={400} height={300} />
 *
 * Supabase transform docs:
 *   /render/image/authenticated?width=400&quality=75&format=webp
 */

interface LoaderParams {
  src: string;
  width: number;
  quality?: number;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export function supabaseLoader({ src, width, quality }: LoaderParams): string {
  if (!src) return '';

  const isSupabaseUrl = src.includes('.supabase.co/storage/');
  if (!isSupabaseUrl) return src;

  // AI-generated and admin-regen images are already optimized at upload time.
  // Supabase's /render/image/ endpoint returns 400 for these files, so serve them directly.
  if (src.includes('/ai-') || src.includes('/admin-regen/')) return src;

  // Manual uploads (tenant/upload) YA se guardan optimizadas: sharp las redimensiona
  // a 800×800 webp q72 en el bucket product-images. Pasarlas por /render/image/ es un
  // transform redundante que en tiendas nuevas paga el cold-start (segundos) sin
  // beneficio. La extensión .webp del bucket product-images marca que pasaron por sharp.
  if (src.includes('/product-images/') && src.endsWith('.webp')) return src;

  const q = quality ?? 75;

  const transformUrl = src.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );

  const separator = transformUrl.includes('?') ? '&' : '?';
  return `${transformUrl}${separator}width=${width}&quality=${q}&format=webp`;
}

/**
 * Generate a tiny blur placeholder data URL for a Supabase-hosted image.
 * Returns a 16px-wide version suitable for blurDataURL.
 */
// Neutral gray placeholder for images we can't generate a real blur for (external
// hosts like Unsplash, or AI/admin-regen files that don't support /render/image/).
// Zero network cost — a 1×1 gray SVG that Next.js scales up as the blur backdrop,
// so cards fade in from gray instead of flashing on slow connections.
const GENERIC_BLUR =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22%3E%3Crect width=%221%22 height=%221%22 fill=%22%23f3f4f6%22/%3E%3C/svg%3E';

export function getBlurUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;

  // External (non-Supabase) images: no transform API, use the neutral placeholder.
  if (!src.includes('.supabase.co/storage/')) return GENERIC_BLUR;

  // AI-generated and admin-regen images bypass /render/image/ (returns 400).
  if (src.includes('/ai-') || src.includes('/admin-regen/')) return GENERIC_BLUR;

  // Uploads ya optimizados (product-images/*.webp): no pasan por /render/image/,
  // así que no hay versión de 16px que pedir — usar el placeholder neutro.
  if (src.includes('/product-images/') && src.endsWith('.webp')) return GENERIC_BLUR;

  const transformUrl = src.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );
  return `${transformUrl}${transformUrl.includes('?') ? '&' : '?'}width=16&quality=20&format=webp`;
}

/**
 * Get optimized image props for Next.js <Image>.
 * Returns loader, blurDataURL, and placeholder props.
 */
export function getOptimizedImageProps(src: string | null | undefined) {
  const isSupabase = !!src && src.includes('.supabase.co/storage/');

  if (!isSupabase || !src) {
    return { src: src || '', loader: undefined, placeholder: undefined, blurDataURL: undefined };
  }

  return {
    src,
    loader: supabaseLoader,
    placeholder: 'blur' as const,
    blurDataURL: getBlurUrl(src),
  };
}
