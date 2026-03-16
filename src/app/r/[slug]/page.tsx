/**
 * Legacy /r/[slug] redirect — kept alive so old printed QR codes still work.
 *
 * Old formats handled:
 *   /r/{slug}              → /{slug}
 *   /r/{slug}?table=Mesa1  → /{slug}?table=Mesa1
 */
import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: { slug: string };
  searchParams: { table?: string };
}

export default function LegacySlugRedirect({ params, searchParams }: PageProps) {
  const destination = searchParams.table
    ? `/${params.slug}?table=${encodeURIComponent(searchParams.table)}`
    : `/${params.slug}`;

  permanentRedirect(destination);
}
