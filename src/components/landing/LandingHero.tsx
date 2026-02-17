'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Counter } from './Animations';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function LandingHero() {
  return (
    <LazyMotion features={domAnimation}>
      <section className="relative min-h-[100vh] min-h-[100dvh] flex items-center bg-black overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 spotlight" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-500/[0.06] rounded-full blur-[200px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-brand-400/[0.04] rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-32 md:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left: Text */}
            <div>
              {/* Badge */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[13px] text-gray-400"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-400" />
                </span>
                Plataforma #1 de menús digitales
              </m.div>

              {/* Heading */}
              <m.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease }}
                className="text-[2.75rem] sm:text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] font-extrabold leading-[1.05] tracking-tight font-heading"
              >
                <span className="text-gradient-subtle">Tu menú digital.</span>
                <br />
                <span className="text-gradient">Pedidos directos.</span>
              </m.h1>

              {/* Subtitle */}
              <m.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease }}
                className="mt-6 text-base sm:text-lg text-gray-400 max-w-md leading-relaxed"
              >
                Crea tu menú con fotos IA, genera QRs para tus mesas, y recibe pedidos desde el celular de tus clientes.
                <span className="text-gray-300"> Sin comisiones. Sin apps de terceros.</span>
              </m.p>

              {/* CTAs */}
              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease }}
                className="mt-10 flex flex-col sm:flex-row gap-3"
              >
                <Link
                  href="/signup"
                  className="px-7 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-colors text-center"
                >
                  Empezar gratis →
                </Link>
                <Link
                  href="/r/demo"
                  className="group px-7 py-3.5 rounded-xl border border-white/[0.1] text-white font-medium text-sm hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  Ver demo en vivo
                </Link>
              </m.div>

              {/* Stats */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease }}
                className="mt-14 flex items-center gap-8 md:gap-10"
              >
                {[
                  { target: 500, suffix: '+', label: 'Restaurantes' },
                  { target: 0, suffix: '%', label: 'Comisiones' },
                  { target: 4.9, suffix: '', label: 'Rating' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-bold text-white font-heading">
                      <Counter target={s.target} suffix={s.suffix} duration={2} />
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </m.div>
            </div>

            {/* Right: Phone Mockup with CSS 3D */}
            <m.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="perspective-container">
                <div className="float-3d relative">
                  {/* Glow behind phone */}
                  <div className="absolute inset-0 scale-110 bg-brand-500/[0.08] rounded-[3rem] blur-[60px]" />
                  <Image
                    src="/images/hero-phone-mockup.png"
                    alt="MENIUS - Menú digital en iPhone"
                    width={480}
                    height={480}
                    className="relative z-10 w-[320px] sm:w-[380px] lg:w-[440px] h-auto drop-shadow-2xl"
                    priority
                  />
                </div>
              </div>
            </m.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>
    </LazyMotion>
  );
}
