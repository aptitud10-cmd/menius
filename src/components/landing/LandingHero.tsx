'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Counter } from './Animations';

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  return (
    <LazyMotion features={domAnimation}>
      <section className="relative min-h-[100vh] min-h-[100dvh] flex items-center overflow-hidden">
        {/* Mesh gradient background */}
        <div className="hero-gradient" />

        {/* Animated orbs */}
        <div className="orb orb-purple w-[500px] h-[500px] top-[-10%] left-[10%]" />
        <div className="orb orb-teal w-[400px] h-[400px] bottom-[10%] right-[5%]" />
        <div className="orb orb-blue w-[350px] h-[350px] top-[40%] left-[50%]" />

        {/* Noise texture */}
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-32 md:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[13px] text-gray-400 tracking-wide">Plataforma de menús digitales</span>
              </m.div>

              <m.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease }}
                className="text-[3.5rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6rem] font-semibold leading-[0.95] tracking-[-0.04em] text-white"
              >
                El menú digital
                <br />
                <span className="text-gradient-premium">que convierte</span>
              </m.h1>

              <m.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16, ease }}
                className="mt-8 text-lg sm:text-xl text-gray-400 max-w-[500px] leading-relaxed font-light"
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
                  className="group px-8 py-4 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all text-center btn-glow"
                >
                  Empezar gratis
                  <span className="inline-block ml-2 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </Link>
                <Link
                  href="/r/demo"
                  className="px-8 py-4 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all text-center"
                >
                  Ver demo en vivo
                </Link>
              </m.div>

              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease }}
                className="mt-16 flex items-center gap-12"
              >
                {[
                  { target: 500, suffix: '+', label: 'Restaurantes' },
                  { target: 0, suffix: '%', label: 'Comisiones' },
                  { target: 4.9, suffix: '', label: 'Rating' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-semibold text-white tracking-tight">
                      <Counter target={s.target} suffix={s.suffix} duration={2} />
                    </p>
                    <p className="text-[13px] text-gray-600 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </m.div>
            </div>

            {/* Right: Phone Mockup */}
            <m.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease }}
              className="relative flex justify-center lg:justify-end"
            >
              {/* Glow behind phone */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-purple-500/30 blur-[100px]" />
              <Image
                src="/images/hero-phone-mockup.webp"
                alt="MENIUS - Menú digital en iPhone"
                width={500}
                height={500}
                className="relative z-10 w-[380px] sm:w-[440px] lg:w-[520px] h-auto drop-shadow-2xl"
                priority
              />
            </m.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent z-20" />
      </section>
    </LazyMotion>
  );
}
