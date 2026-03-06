import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: { slug: string; table: string };
}

export default function LegacyTableMenuRedirect({ params }: PageProps) {
  permanentRedirect(`/${params.slug}?table=${params.table}`);
}
