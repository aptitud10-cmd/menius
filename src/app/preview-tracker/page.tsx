import '@/app/globals.css';
import { notFound } from 'next/navigation';
import dynamicImport from 'next/dynamic';

// Vista previa SOLO para desarrollo: el seguimiento del cliente con pedidos de
// ejemplo (sin base de datos), para sacar capturas de cada estado. Prod → 404.
export const dynamic = 'force-dynamic';

const PreviewTrackerClient = dynamicImport(
  () => import('./PreviewTrackerClient').then((m) => m.PreviewTrackerClient),
  { ssr: false },
);

export default function PreviewTrackerPage({ searchParams }: { searchParams: { s?: string; type?: string; lang?: string } }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      <PreviewTrackerClient state={searchParams.s ?? 'preparing'} type={searchParams.type ?? 'delivery'} lang={searchParams.lang === 'en' ? 'en' : 'es'} />
    </div>
  );
}
