import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations } from '@/lib/translations';

export default async function NotFound() {
  const locale = (await cookies()).get('menius_locale')?.value ?? 'es';
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen landing-bg relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.05] rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        <Link href="/" className="font-display text-2xl font-bold tracking-[-0.04em] text-white inline-block mb-10">
          MENIUS
        </Link>

        <div className="text-[8rem] font-extrabold leading-none tracking-tighter text-white/[0.06] select-none mb-0 font-display">
          404
        </div>

        <h1 className="text-2xl font-bold text-white mt-2 mb-3 font-display tracking-tight">
          {t.notFoundTitle}
        </h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed max-w-sm mx-auto">
          {t.notFoundDesc}
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            {t.notFoundGoHome}
          </Link>
          <Link
            href="/demo"
            className="px-5 py-2.5 border border-white/[0.1] bg-white/[0.04] text-gray-300 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            {t.notFoundViewDemo}
          </Link>
        </div>
      </div>
    </div>
  );
}
