import Link from 'next/link';

export function LandingHero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.07] via-transparent to-transparent" />

      <div className="relative z-10 max-w-[1140px] mx-auto px-5 w-full pt-20 pb-12 md:pt-0 md:pb-0">
        <div className="text-center">
          {/* Headline */}
          <h1 className="text-[2.5rem] md:text-[4rem] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            Tus pedidos. Tus clientes.
            <br />
            <span className="text-emerald-400">0% comisiones.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 md:mt-6 text-base md:text-lg text-gray-400 max-w-[480px] mx-auto leading-relaxed">
            Menú QR, pedidos directos y pagos en un solo sistema.
          </p>

          {/* CTAs */}
          <div className="mt-7 md:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 px-4 sm:px-0">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold text-[15px] hover:bg-emerald-400 active:scale-[0.98] transition-all text-center"
            >
              Empezar gratis
            </Link>
            <Link
              href="/r/demo"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-300 font-semibold text-[15px] hover:text-white hover:border-white/20 transition-all text-center"
            >
              Ver demo en vivo
            </Link>
          </div>

          {/* Trust bar */}
          <div className="mt-10 md:mt-14 flex items-center justify-center gap-6 sm:gap-10 text-sm text-gray-500">
            <span>500+ restaurantes</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span>0% comisiones</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span className="flex items-center gap-1">
              4.9
              <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
