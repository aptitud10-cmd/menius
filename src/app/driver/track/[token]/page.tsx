/**
 * Driver tracking page — server component wrapper.
 * Reads `?lang` from searchParams (server-side, always reliable) and
 * passes it to the client component that handles all interactivity.
 */
import { DriverTrackClient } from './DriverTrackClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { token: string };
  searchParams: { lang?: string };
}

export default function DriverTrackPage({ params, searchParams }: PageProps) {
  const lang = searchParams?.lang === 'en' ? 'en' : 'es';
  return <DriverTrackClient token={params.token} lang={lang} />;
}
