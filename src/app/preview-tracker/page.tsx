import '@/app/globals.css';
import { notFound } from 'next/navigation';
import { PreviewTrackerClient } from './PreviewTrackerClient';

// Vista previa SOLO para desarrollo: el seguimiento del cliente con pedidos de
// ejemplo (sin base de datos), para sacar capturas de cada estado. Prod → 404.
export const dynamic = 'force-dynamic';

export default async function PreviewTrackerPage(
  props: { searchParams: Promise<{ s?: string; type?: string; lang?: string; brand?: string }> }
) {
  const searchParams = await props.searchParams;
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="overflow-x-clip">
      <PreviewTrackerClient state={searchParams.s ?? 'preparing'} type={searchParams.type ?? 'delivery'} lang={searchParams.lang === 'en' ? 'en' : 'es'} brand={searchParams.brand} />
    </div>
  );
}
