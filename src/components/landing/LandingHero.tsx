'use client';

import Link from 'next/link';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Counter } from './Animations';

const motion = m;

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function LandingHero() {
  return (
    <LazyMotion features={domAnimation}>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-brand-950 pt-32 pb-28 md:pt-44 md:pb-36">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-950 to-brand-950/95" />
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/[0.07] rounded-full blur-[150px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-400/[0.05] rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 noise" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full glass text-brand-300 text-[13px] font-medium"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
            </span>
            Plataforma #1 de menús digitales para restaurantes
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="text-4xl sm:text-5xl md:text-[4.25rem] lg:text-[4.75rem] font-extrabold tracking-tight leading-[1.05] mb-7 text-white font-heading"
          >
            Tu menú digital.{' '}
            <br className="hidden sm:block" />
            <span className="text-gradient">Pedidos al instante.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Crea tu menú con fotos generadas por IA, genera QRs para tus mesas, y recibe pedidos
            desde el celular de tus clientes.{' '}
            <span className="text-gray-300 font-medium">Sin comisiones. Sin apps de terceros.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-500 text-brand-950 font-bold text-[15px] shadow-xl shadow-brand-500/25 hover:shadow-2xl hover:shadow-brand-500/30 hover:bg-brand-400 hover:-translate-y-0.5 transition-all duration-300"
            >
              Crear cuenta gratis →
            </Link>
            <Link
              href="/r/demo"
              className="w-full sm:w-auto group px-8 py-4 rounded-2xl glass text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2.5"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              Ver demo en vivo
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10"
          >
            {[
              { target: 500, suffix: '+', label: 'Restaurantes activos' },
              { target: 50000, suffix: '+', label: 'Pedidos procesados' },
              { target: 0, suffix: '%', label: 'Comisiones por pedido' },
              { target: 4.9, suffix: '', label: 'Calificación promedio' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white font-heading">
                  <Counter target={s.target} suffix={s.suffix} duration={2.5} />
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-1.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trusted by ── */}
      <section className="py-8 bg-brand-950 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-[11px] font-semibold text-gray-600 uppercase tracking-[0.2em] mb-6">Restaurantes en</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {['New York', 'CDMX', 'Bogotá', 'Lima', 'Madrid', 'Santo Domingo', 'Buenos Aires'].map((city) => (
              <span key={city} className="px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-gray-500">
                {city}
              </span>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}
