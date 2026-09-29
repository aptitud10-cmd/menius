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

  // Antes acá se servían sin transformar las imágenes bajo /ai- y /admin-regen/,
  // con el argumento de que ya venían optimizadas y que /render/image/ devolvía
  // 400 para ellas. Medido contra prod el 2026-09-29, las dos premisas eran falsas:
  //
  //   - No vienen optimizadas: regenerate-images/route.ts sube el buffer del
  //     modelo tal cual, sin resize ni recompresión. Promedian 763 KB contra los
  //     41 KB de las que sí pasaban por el transform.
  //   - /render/image/ no falla: 20 de 20 transformaron bien, incluida la más
  //     pesada del catálogo (1478 KB → 61 KB). Los 400/429 que se le atribuían
  //     al endpoint eran rate limit por pedir en paralelo.
  //
  // El resultado era que 68 imágenes de Buccaneer pesaban 51.9 MB, diez veces
  // más que las otras 126 juntas. Al sacar la excepción caen a ~1.5 MB.
  //
  // Esto NO agrega transformaciones facturables nuevas: son imágenes que ya
  // deberían haber estado pasando por acá. (El tope que se excedió en agosto
  // era Image Transformations al 236%, no storage — ver getBlurUrl abajo.)

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
