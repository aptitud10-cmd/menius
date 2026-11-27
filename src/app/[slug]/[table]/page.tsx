import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string; table: string }>;
}

export default async function TableMenuRedirect(props: PageProps) {
  const params = await props.params;
  permanentRedirect(`/${params.slug}?table=${encodeURIComponent(params.table)}`);
}
