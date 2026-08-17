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

  const q = quality ?? 75;

  const transformUrl = src.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );

  const separator = transformUrl.includes('?') ? '&' : '?';
  return `${transformUrl}${separator}width=${width}&quality=${q}&format=webp`;
}

// Placeholder gris neutro para el blur-up de las cards.
// Zero network cost — un SVG de 1×1 que Next.js escala como fondo del blur, así
// las cards aparecen desde gris en vez de parpadear en conexiones lentas.
const GENERIC_BLUR =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22%3E%3Crect width=%221%22 height=%221%22 fill=%22%23f3f4f6%22/%3E%3C/svg%3E';

/**
 * Placeholder para blurDataURL.
 *
 * Antes esto pedía una miniatura real de 16px a /render/image/, lo que gastaba
 * una transformación facturable POR IMAGEN, además de la que ya gasta el loader
 * para el tamaño visible. Con ~412 imágenes transformables en Storage contra una
 * cuota de 100 originales/mes, era la mitad del consumo que hacía exceder el plan
 * (236/100 en el ciclo de julio-agosto 2026).
 *
 * El blur se ve ~200ms mientras carga la imagen real, así que la miniatura real
 * no justifica su costo: el gris neutro cumple la misma función perceptual.
 */
export function getBlurUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  return GENERIC_BLUR;
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
