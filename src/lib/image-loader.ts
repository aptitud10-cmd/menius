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

/**
 * Generate a tiny blur placeholder data URL for a Supabase-hosted image.
 * Returns a 16px-wide version suitable for blurDataURL.
 */
export function getBlurUrl(src: string | null | undefined): string | undefined {
  if (!src || !src.includes('.supabase.co/storage/')) return undefined;

  // AI-generated and admin-regen images bypass /render/image/ (returns 400); no blur placeholder.
  if (src.includes('/ai-') || src.includes('/admin-regen/')) return undefined;

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
