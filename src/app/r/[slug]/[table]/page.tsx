/**
 * Legacy /r/[slug]/[table] redirect — handles old path-based QR format.
 *   /r/{slug}/{table}  → /{slug}?table={table}
 */
import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: { slug: string; table: string };
}

export default function LegacyTableRedirect({ params }: PageProps) {
  permanentRedirect(`/${params.slug}?table=${encodeURIComponent(params.table)}`);
}
