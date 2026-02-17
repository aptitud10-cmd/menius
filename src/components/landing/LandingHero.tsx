'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Counter } from './Animations';

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  return (
    <LazyMotion features={domAnimation}>
      <section className="relative min-h-[100vh] min-h-[100dvh] flex items-center bg-black overflow-hidden">
        {/* Floor glow — light from below */}
        <div className="floor-glow" />
        {/* Light ray — diagonal beam */}
        <div className="light-ray top-[-10%] right-[15%]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-32 md:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <m.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="text-[15px] text-[#888] mb-6"
              >
                Plataforma de menús digitales y pedidos en línea
              </m.p>

              <m.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease }}
                className="text-[3.2rem] sm:text-[4.2rem] md:text-[5rem] lg:text-[5.5rem] font-bold leading-[1.04] tracking-[-0.03em] text-white"
              >
                Menú digital para{' '}
                <span className="text-[#888]">restaurantes</span>
              </m.h1>

              <m.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16, ease }}
                className="mt-8 text-[1.125rem] sm:text-[1.25rem] text-[#888] max-w-[480px] leading-[1.6]"
              >
                Crea tu menú con fotos IA, genera QRs para cada mesa, y recibe pedidos directos. Sin comisiones. Sin apps de terceros.
              </m.p>

              <m.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28, ease }}
                className="mt-10 flex flex-col sm:flex-row gap-3"
              >
                <Link
                  href="/signup"
                  className="px-7 py-3.5 rounded-[10px] bg-white text-black font-medium text-[15px] hover:bg-[#e8e8e8] transition-colors text-center"
                >
                  Empezar gratis
                </Link>
                <Link
                  href="/r/demo"
                  className="px-7 py-3.5 rounded-[10px] border border-[#222] text-[#888] font-medium text-[15px] hover:text-white hover:border-[#444] transition-all text-center"
                >
                  Ver demo en vivo
                </Link>
              </m.div>

              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease }}
                className="mt-16 flex items-center gap-10"
              >
                {[
                  { target: 500, suffix: '+', label: 'Restaurantes' },
                  { target: 0, suffix: '%', label: 'Comisiones' },
                  { target: 4.9, suffix: '', label: 'Rating' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[1.75rem] font-semibold text-white tracking-tight">
                      <Counter target={s.target} suffix={s.suffix} duration={2} />
                    </p>
                    <p className="text-[13px] text-[#555] mt-1">{s.label}</p>
                  </div>
                ))}
              </m.div>
            </div>

            {/* Right: Phone Mockup */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease }}
              className="relative flex justify-center lg:justify-end"
            >
              <Image
                src="/images/hero-phone-mockup.webp"
                alt="MENIUS - Menú digital en iPhone"
                width={500}
                height={500}
                className="w-[380px] sm:w-[440px] lg:w-[520px] h-auto"
                priority
              />
            </m.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </section>
    </LazyMotion>
  );
}
