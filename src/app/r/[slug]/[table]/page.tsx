/**
 * Legacy /r/[slug]/[table] redirect — handles old path-based QR format.
 *   /r/{slug}/{table}  → /{slug}?table={table}
 */
import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string; table: string }>;
}

export default async function LegacyTableRedirect({ params }: PageProps) {
  const { slug, table } = await params;
  permanentRedirect(`/${slug}?table=${encodeURIComponent(table)}`);
}
