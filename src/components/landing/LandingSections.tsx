'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FadeIn, LazyMotion, domAnimation } from './Animations';

/* ─── DATA ─── */

const features = [
  {
    tab: 'Menú Digital',
    title: 'Menú con QR y pedidos directos',
    desc: 'Tus clientes escanean el QR, ven el menú con fotos y precios, y ordenan desde su celular. Sin descargar apps.',
    details: ['QR único por mesa', 'Fotos generadas con IA', 'Pedidos dine-in, pickup y delivery', 'Variantes y extras por producto'],
  },
  {
    tab: 'Dashboard',
    title: 'Gestiona todo desde un solo lugar',
    desc: 'Pedidos en tiempo real con tablero Kanban, analytics de ventas, editor visual de menú, equipo con roles y permisos.',
    details: ['Pedidos en tiempo real', 'Analytics y reportes', 'Editor de menú drag & drop', 'Roles de equipo'],
  },
  {
    tab: 'Pagos',
    title: 'Cobra online sin complicaciones',
    desc: 'Acepta pagos con tarjeta vía Stripe. También efectivo y otros métodos. El dinero va directo a tu cuenta.',
    details: ['Stripe integrado', 'Pagos en efectivo', 'Propinas opcionales', 'Historial de transacciones'],
  },
  {
    tab: 'IA',
    title: 'Fotos profesionales con un clic',
    desc: 'Google Gemini genera fotos de tus platillos automáticamente. Importa tu menú completo desde una foto con OCR inteligente.',
    details: ['Generación de fotos con IA', 'Importar menú con foto (OCR)', 'Edición de imágenes', 'Formato WebP optimizado'],
  },
];

const plans = [
  {
    name: 'Starter',
    price: 39,
    desc: 'Para restaurantes que inician.',
    popular: false,
    features: ['Menú digital con fotos', 'QR hasta 10 mesas', 'Pedidos (dine-in + pickup)', 'Imágenes IA (5/mes)', 'Soporte por email'],
    cta: 'Empezar gratis',
  },
  {
    name: 'Pro',
    price: 79,
    desc: 'Para restaurantes que quieren crecer.',
    popular: true,
    features: ['Todo de Starter', '200 productos, 50 mesas', 'Delivery + WhatsApp', 'Analytics avanzado', 'Promociones y cupones', 'Imágenes IA (50/mes)', 'Sin marca MENIUS'],
    cta: 'Empezar con Pro',
  },
  {
    name: 'Business',
    price: 149,
    desc: 'Para cadenas y franquicias.',
    popular: false,
    features: ['Todo de Pro', 'Productos y mesas ilimitados', 'IA ilimitada', 'Dominio personalizado', 'Onboarding dedicado', 'Soporte por WhatsApp'],
    cta: 'Empezar con Business',
  },
];

const testimonials = [
  {
    quote: 'Desde que usamos MENIUS, nuestros pedidos aumentaron un 40%. Los clientes aman pedir desde su celular.',
    name: 'María González',
    role: 'Dueña de La Cocina de María',
  },
  {
    quote: 'Dejamos UberEats y ahorramos $2,800 al mes en comisiones. MENIUS se pagó solo en la primera semana.',
    name: 'Carlos Rivera',
    role: 'Fundador de Taquería El Patrón',
  },
  {
    quote: 'La función de fotos con IA es increíble. Subimos el menú en 20 minutos sin necesidad de fotógrafo.',
    name: 'Ana Martínez',
    role: 'Gerente de Sabor Urbano',
  },
  {
    quote: 'El dashboard es muy intuitivo. Puedo ver los pedidos en tiempo real y los analytics me ayudan a tomar decisiones.',
    name: 'Roberto Díaz',
    role: 'Chef & Propietario de Fuego Lento',
  },
];

const comparison = [
  ['Comisión por pedido', '0%', '15% – 30%'],
  ['Control de clientes', 'Tus datos', 'La app se los queda'],
  ['Tu marca', 'Dominio propio', 'Junto a la competencia'],
  ['Fotos del menú', 'IA genera fotos', 'Tú las subes'],
  ['WhatsApp', 'Integrado', 'No disponible'],
  ['Costo mensual', 'Desde $39/mes', 'Gratis (pero 30% por pedido)'],
];

/* ─── COMPONENTS ─── */

function FeatureTabs() {
  const [active, setActive] = useState(0);
  const f = features[active];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#111] border border-[#1a1a1a] w-fit mx-auto mb-12">
        {features.map((feat, i) => (
          <button
            key={feat.tab}
            onClick={() => setActive(i)}
            className={`px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${
              active === i
                ? 'bg-white text-black'
                : 'text-[#666] hover:text-white'
            }`}
          >
            {feat.tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h3 className="text-[2rem] md:text-[2.5rem] font-bold text-white leading-tight tracking-tight">
            {f.title}
          </h3>
          <p className="mt-5 text-[1.1rem] text-[#888] leading-relaxed">
            {f.desc}
          </p>
          <div className="mt-8 space-y-3.5">
            {f.details.map((d) => (
              <div key={d} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#111] border border-[#222] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[15px] text-[#aaa]">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visual — clean on black, no shadows */}
        <div className="flex justify-center">
          {active === 1 ? (
            <Image
              src="/images/hero-dashboard-mockup.webp"
              alt="Dashboard MENIUS"
              width={500}
              height={500}
              className="w-full max-w-[460px] h-auto rounded-xl"
            />
          ) : (
            <Image
              src="/images/hero-phone-mockup.webp"
              alt="MENIUS menú digital"
              width={500}
              height={500}
              className="w-[300px] sm:w-[340px] h-auto"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ─── */

export function LandingSections() {
  return (
    <LazyMotion features={domAnimation}>
      {/* ── Features with Tabs ── */}
      <section id="funciones" className="relative bg-black py-32 md:py-40 overflow-hidden">
        {/* Ambient fog — asymmetric depth */}
        <div className="ambient-fog ambient-fog-left top-[20%]" />
        <div className="ambient-fog ambient-fog-right top-[60%]" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-6">
            <p className="text-[14px] text-[#555] uppercase tracking-[0.2em] mb-5">Funciones</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold text-white tracking-tight">
              Todo en tu control
            </h2>
            <p className="text-[#888] mt-4 text-lg max-w-lg mx-auto">
              Las herramientas que necesitas para digitalizar tu restaurante.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <FeatureTabs />
          </FadeIn>
        </div>
      </section>

      {/* ── Separator ── */}
      <div className="max-w-5xl mx-auto h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />

      {/* ── Comparison ── */}
      <section className="relative bg-black py-32 md:py-40 overflow-hidden">
        {/* Ambient fog */}
        <div className="ambient-fog ambient-fog-center top-[10%]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[14px] text-[#555] uppercase tracking-[0.2em] mb-5">Sin intermediarios</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold text-white tracking-tight">
              MENIUS vs Apps de Delivery
            </h2>
            <p className="text-[#888] mt-4 text-lg max-w-lg mx-auto">
              Las apps cobran hasta 30% por pedido. Con MENIUS, tarifa fija y tus ventas son tuyas.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            {/* Header row */}
            <div className="grid grid-cols-3 gap-px mb-px">
              <div className="bg-black p-4" />
              <div className="bg-[#0a0a0a] p-4 text-center rounded-t-xl">
                <span className="text-[15px] font-semibold text-white">MENIUS</span>
              </div>
              <div className="bg-black p-4 text-center">
                <span className="text-[13px] text-[#555]">UberEats, DoorDash, Grubhub</span>
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-px">
              {comparison.map(([feature, menius, other]) => (
                <div key={feature} className="grid grid-cols-3 gap-px">
                  <div className="bg-[#080808] px-5 py-4">
                    <p className="text-[14px] text-[#888]">{feature}</p>
                  </div>
                  <div className="bg-[#0a0a0a] px-5 py-4 text-center">
                    <p className="text-[14px] font-medium text-white">{menius}</p>
                  </div>
                  <div className="bg-[#080808] px-5 py-4 text-center">
                    <p className="text-[14px] text-[#555]">{other}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Savings box */}
            <div className="mt-8 p-6 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
              <p className="text-[15px] text-[#888] leading-relaxed text-center">
                <strong className="text-white">Ejemplo:</strong> Un restaurante con $10,000/mes pierde{' '}
                <strong className="text-[#ff4444]">$3,000 en comisiones</strong> con apps. Con MENIUS Pro ($79/mes),
                ahorra <strong className="text-white">$35,000 al año</strong>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Separator ── */}
      <div className="max-w-5xl mx-auto h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />

      {/* ── Pricing ── */}
      <section id="precios" className="relative bg-black py-32 md:py-40 overflow-hidden">
        {/* Light ray — diagonal beam */}
        <div className="light-ray top-[-20%] left-[25%]" />
        {/* Ambient fog */}
        <div className="ambient-fog ambient-fog-right top-[40%]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[14px] text-[#555] uppercase tracking-[0.2em] mb-5">Precios</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold text-white tracking-tight">
              Sin comisiones. Sin sorpresas.
            </h2>
            <p className="text-[#888] mt-4 text-lg">14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.</p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                    plan.popular
                      ? 'bg-[#0a0a0a] border border-[#333] shadow-[0_0_60px_rgba(255,255,255,0.03)]'
                      : 'bg-[#080808] border border-[#161616] hover:border-[#222]'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-[11px] font-semibold rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                  <h3 className="text-[18px] font-semibold text-white">{plan.name}</h3>
                  <p className="text-[14px] text-[#555] mt-1">{plan.desc}</p>
                  <div className="mt-6 mb-8">
                    <span className="text-[3rem] font-bold text-white tracking-tight">${plan.price}</span>
                    <span className="text-[15px] text-[#555] ml-1">/mes</span>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-[#444] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-[14px] text-[#999] leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?plan=${plan.name.toLowerCase()}`}
                    className={`mt-8 block text-center py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 ${
                      plan.popular
                        ? 'bg-white text-black hover:bg-[#e8e8e8]'
                        : 'bg-[#111] text-[#aaa] border border-[#222] hover:text-white hover:border-[#333]'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* Setup banner */}
            <Link
              href="/setup-profesional"
              className="mt-6 flex items-center justify-between p-5 rounded-xl border border-[#161616] bg-[#080808] hover:border-[#222] transition-colors group"
            >
              <span className="text-[14px] text-[#666]">¿No tienes tiempo? <strong className="text-[#aaa]">Te lo configuramos</strong> — desde $149</span>
              <svg className="w-4 h-4 text-[#444] group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Separator ── */}
      <div className="max-w-5xl mx-auto h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />

      {/* ── Testimonials ── */}
      <section className="relative bg-black py-32 md:py-40 overflow-hidden">
        {/* Ambient fog */}
        <div className="ambient-fog ambient-fog-left top-[30%]" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[14px] text-[#555] uppercase tracking-[0.2em] mb-5">Testimonios</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold text-white tracking-tight">
              Lo que dicen nuestros clientes
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-[#161616] bg-[#080808] p-7 hover:border-[#222] transition-colors"
                >
                  <p className="text-[15px] text-[#999] leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="text-[14px] font-medium text-white">{t.name}</p>
                    <p className="text-[13px] text-[#555] mt-0.5">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Separator ── */}
      <div className="max-w-5xl mx-auto h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />

      {/* ── Final CTA (Resend style) ── */}
      <section className="relative py-40 md:py-52 bg-black overflow-hidden">
        {/* Floor glow from below */}
        <div className="floor-glow" />
        {/* Light ray */}
        <div className="light-ray top-[-30%] right-[30%]" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-[2.5rem] md:text-[4rem] font-bold text-white tracking-tight leading-[1.1]">
              Menú digital.<br />
              <span className="text-[#555]">Disponible hoy.</span>
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-[#e8e8e8] transition-colors"
              >
                Empezar gratis
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-[#222] text-[#888] font-medium text-[15px] hover:text-white hover:border-[#444] transition-all"
              >
                Ver demo en vivo
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </LazyMotion>
  );
}
