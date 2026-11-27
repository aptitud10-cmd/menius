/**
 * Driver tracking page — server component wrapper.
 * Reads `?lang` from searchParams (server-side, always reliable) and
 * passes it to the client component that handles all interactivity.
 */
import { DriverRouteClient } from './DriverRouteClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function DriverTrackPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang = searchParams?.lang === 'en' ? 'en' : 'es';
  return <DriverRouteClient token={params.token} lang={lang} />;
}
