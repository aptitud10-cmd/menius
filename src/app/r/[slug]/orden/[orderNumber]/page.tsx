import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: { slug: string; orderNumber: string };
  searchParams: { paid?: string };
}

export default function LegacyOrderRedirect({ params, searchParams }: PageProps) {
  const qs = new URLSearchParams();
  if (searchParams.paid) qs.set('paid', searchParams.paid);
  const query = qs.toString();
  permanentRedirect(`/${params.slug}/orden/${params.orderNumber}${query ? `?${query}` : ''}`);
}
