import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: { slug: string; table: string };
}

export default function TableMenuRedirect({ params }: PageProps) {
  permanentRedirect(`/${params.slug}?table=${params.table}`);
}
