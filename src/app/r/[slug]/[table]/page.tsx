import { redirect } from 'next/navigation';

interface PageProps {
  params: { slug: string; table: string };
}

export default function LegacyTableMenuRedirect({ params }: PageProps) {
  redirect(`/${params.slug}?table=${params.table}`);
}
