import { redirect, RedirectType } from 'next/navigation';

interface PageProps {
  params: { slug: string };
  searchParams: { table?: string; v?: string };
}

export default function LegacyMenuRedirect({ params, searchParams }: PageProps) {
  const qs = new URLSearchParams();
  if (searchParams.table) qs.set('table', searchParams.table);
  if (searchParams.v) qs.set('v', searchParams.v);
  const query = qs.toString();
  redirect(`/${params.slug}${query ? `?${query}` : ''}`, RedirectType.permanent);
}
