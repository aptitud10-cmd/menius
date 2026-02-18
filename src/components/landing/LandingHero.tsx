'use client';

import Link from 'next/link';
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

        <div className="relative z-10 max-w-5xl mx-auto px-6 w-full py-32 md:py-0">
          <div className="text-center">
            {/* Badge */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[13px] text-gray-400 tracking-wide">Plataforma de menús digitales</span>
            </m.div>

            {/* Headline */}
            <m.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease }}
              className="text-[2.5rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6.5rem] font-semibold leading-[0.92] tracking-[-0.04em] text-white"
            >
              El menú digital
              <br />
              <span className="text-gradient-premium">que convierte</span>
            </m.h1>

            {/* Subtitle */}
            <m.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease }}
              className="mt-8 text-lg sm:text-xl text-gray-300 max-w-[560px] mx-auto leading-relaxed font-light"
            >
              Crea tu menú con fotos IA, genera QRs para cada mesa, y recibe pedidos directos. Sin comisiones. Sin apps de terceros.
            </m.p>

            {/* CTAs */}
            <m.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28, ease }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                href="/signup"
                className="group w-full sm:w-auto px-10 py-4 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all text-center btn-glow"
              >
                Empezar gratis
                <span className="inline-block ml-2 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-10 py-4 rounded-xl border border-white/10 text-gray-300 font-medium text-[15px] hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all text-center"
              >
                Ver demo en vivo
              </Link>
            </m.div>

            {/* Stats */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease }}
              className="mt-20 flex items-center justify-center gap-8 sm:gap-16 flex-wrap"
            >
              {[
                { target: 500, suffix: '+', label: 'Restaurantes', stars: false },
                { target: 0, suffix: '%', label: 'Comisiones', stars: false },
                { target: 4.9, suffix: '', label: 'Rating', stars: true },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                    <Counter target={s.target} suffix={s.suffix} duration={2} />
                  </p>
                  {s.stars ? (
                    <div className="flex items-center gap-0.5 mt-1.5 justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-400 mt-1.5 font-medium">{s.label}</p>
                  )}
                </div>
              ))}
            </m.div>

            {/* Decorative line art */}
            <m.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 1.2, delay: 0.7, ease }}
              className="mt-20 mx-auto max-w-2xl"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </m.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent z-20" />
      </section>
    </LazyMotion>
  );
}
