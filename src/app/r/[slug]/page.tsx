/**
 * Legacy /r/[slug] redirect — kept alive so old printed QR codes still work.
 *
 * Old formats handled:
 *   /r/{slug}              → /{slug}
 *   /r/{slug}?table=Mesa1  → /{slug}?table=Mesa1
 */
import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function LegacySlugRedirect({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { table } = await searchParams;
  const destination = table
    ? `/${slug}?table=${encodeURIComponent(table)}`
    : `/${slug}`;

  permanentRedirect(destination);
}
