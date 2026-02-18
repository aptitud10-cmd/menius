'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FadeIn, LazyMotion, domAnimation } from './Animations';

/* ─── DATA ─── */

const features = [
  {
    tab: 'Menú Digital',
    title: 'Menú con QR y pedidos directos',
    desc: 'Tus clientes escanean el QR, ven el menú con fotos y precios, y ordenan desde su celular. Sin descargar apps.',
    details: ['QR único por mesa', 'Fotos generadas con IA', 'Pedidos dine-in, pickup y delivery', 'Variantes y extras por producto'],
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
      </svg>
    ),
    gradient: 'from-purple-500/20 to-blue-500/20',
    accent: 'purple',
    visualItems: [
      { label: 'Escanea QR', value: 'Mesa 5' },
      { label: 'Hamburguesa Clásica', value: '$14.99' },
      { label: 'Limonada Fresca', value: '$4.00' },
      { label: 'Total del pedido', value: '$18.99' },
    ],
  },
  {
    tab: 'Dashboard',
    title: 'Gestiona todo desde un solo lugar',
    desc: 'Pedidos en tiempo real con tablero Kanban, analytics de ventas, editor visual de menú, equipo con roles y permisos.',
    details: ['Pedidos en tiempo real', 'Analytics y reportes', 'Editor de menú drag & drop', 'Roles de equipo'],
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    gradient: 'from-blue-500/20 to-cyan-500/20',
    accent: 'blue',
    visualItems: [
      { label: 'Órdenes hoy', value: '47' },
      { label: 'Ventas hoy', value: '$1,240' },
      { label: 'Productos activos', value: '38' },
      { label: 'Mesas activas', value: '12' },
    ],
  },
  {
    tab: 'Pagos',
    title: 'Cobra online sin complicaciones',
    desc: 'Acepta pagos con tarjeta vía Stripe. También efectivo y otros métodos. El dinero va directo a tu cuenta.',
    details: ['Stripe integrado', 'Pagos en efectivo', 'Propinas opcionales', 'Historial de transacciones'],
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    gradient: 'from-emerald-500/20 to-green-500/20',
    accent: 'emerald',
    visualItems: [
      { label: 'Pago recibido', value: '$45.80' },
      { label: 'Propina (18%)', value: '$8.24' },
      { label: 'Método', value: 'Visa •4242' },
      { label: 'Estado', value: '✓ Exitoso' },
    ],
  },
  {
    tab: 'IA',
    title: 'Fotos profesionales con un clic',
    desc: 'Google Gemini genera fotos de tus platillos automáticamente. Importa tu menú completo desde una foto con OCR inteligente.',
    details: ['Generación de fotos con IA', 'Importar menú con foto (OCR)', 'Edición de imágenes', 'Formato WebP optimizado'],
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    gradient: 'from-amber-500/20 to-orange-500/20',
    accent: 'amber',
    visualItems: [
      { label: 'Foto generada', value: 'Risotto' },
      { label: 'Calidad', value: '4K WebP' },
      { label: 'Menú importado', value: '38 items' },
      { label: 'Tiempo', value: '< 30 seg' },
    ],
  },
];

const accentColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  purple: { bg: 'bg-purple-500/[0.08]', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'bg-purple-500/20' },
  blue: { bg: 'bg-blue-500/[0.08]', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'bg-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'bg-emerald-500/20' },
  amber: { bg: 'bg-amber-500/[0.08]', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'bg-amber-500/20' },
};

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
  const colors = accentColors[f.accent];

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-fit mx-auto mb-14">
        {features.map((feat, i) => (
          <button
            key={feat.tab}
            onClick={() => setActive(i)}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
              active === i
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
            }`}
          >
            {feat.tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h3 className="text-3xl md:text-4xl font-semibold text-white leading-tight tracking-tight">
            {f.title}
          </h3>
          <p className="mt-6 text-lg text-gray-400 leading-relaxed font-light">
            {f.desc}
          </p>
          <div className="mt-10 space-y-4">
            {f.details.map((d) => (
              <div key={d} className="flex items-center gap-3.5">
                <div className={`w-6 h-6 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[15px] text-gray-300">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visual — dynamic card per tab */}
        <div className="relative flex justify-center">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full ${colors.glow} blur-[80px]`} />

          <div className="relative z-10 w-full max-w-[380px]">
            {/* Icon header */}
            <div className={`rounded-2xl border ${colors.border} bg-white/[0.02] backdrop-blur-sm overflow-hidden`}>
              <div className={`px-6 py-5 border-b ${colors.border} flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text}`}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.tab}</p>
                  <p className="text-xs text-gray-500">MENIUS</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-gray-500">Activo</span>
                </div>
              </div>

              {/* Data rows */}
              <div className="divide-y divide-white/[0.04]">
                {f.visualItems.map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t ${colors.border} bg-white/[0.01]`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Actualizado en tiempo real</span>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                    En vivo
                  </div>
                </div>
              </div>
            </div>
          </div>
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
      <section id="funciones" className="relative py-32 md:py-40 overflow-hidden">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-8">
            <p className="text-sm text-purple-400 uppercase tracking-[0.2em] font-medium mb-5">Funciones</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
              Todo bajo control
            </h2>
            <p className="text-gray-400 mt-5 text-lg max-w-lg mx-auto font-light">
              Las herramientas que necesitas para digitalizar tu restaurante.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <FeatureTabs />
          </FadeIn>
        </div>
      </section>

      {/* Separator */}
      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Comparison ── */}
      <section className="relative py-32 md:py-40 overflow-hidden">
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-sm text-sky-400 uppercase tracking-[0.2em] font-medium mb-5">Sin intermediarios</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
              MENIUS vs Apps de Delivery
            </h2>
            <p className="text-gray-400 mt-5 text-lg max-w-lg mx-auto font-light">
              Las apps cobran hasta 30% por pedido. Con MENIUS, tarifa fija y tus ventas son tuyas.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02] overflow-x-auto">
              <div className="min-w-[480px]">
                <div className="grid grid-cols-3">
                  <div className="p-4 sm:p-5 border-b border-white/[0.06]" />
                  <div className="p-4 sm:p-5 text-center border-b border-white/[0.06] bg-purple-500/[0.06]">
                    <span className="text-sm font-semibold text-white">MENIUS</span>
                  </div>
                  <div className="p-4 sm:p-5 text-center border-b border-white/[0.06]">
                    <span className="text-xs text-gray-400">UberEats, DoorDash, Grubhub</span>
                  </div>
                </div>

                {comparison.map(([feature, menius, other], i) => (
                  <div key={feature} className={`grid grid-cols-3 ${i < comparison.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <p className="text-xs sm:text-sm text-gray-400">{feature}</p>
                    </div>
                    <div className="px-4 sm:px-6 py-3 sm:py-4 text-center bg-purple-500/[0.03]">
                      <p className="text-xs sm:text-sm font-medium text-white">{menius}</p>
                    </div>
                    <div className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                      <p className="text-xs sm:text-sm text-gray-500">{other}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <p className="text-[15px] text-gray-400 leading-relaxed text-center">
                <strong className="text-white">Ejemplo:</strong> Un restaurante con $10,000/mes pierde{' '}
                <strong className="text-red-400">$3,000 en comisiones</strong> con apps. Con MENIUS Pro ($79/mes),
                ahorra <strong className="text-white">$35,000 al año</strong>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Separator */}
      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Pricing ── */}
      <section id="precios" className="relative py-32 md:py-40 overflow-hidden">
        <div className="section-glow section-glow-blue" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-sm text-blue-400 uppercase tracking-[0.2em] font-medium mb-5">Precios</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
              Sin comisiones. Sin sorpresas.
            </h2>
            <p className="text-gray-400 mt-5 text-lg font-light">14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.</p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                    plan.popular
                      ? 'card-popular-glow bg-white/[0.04] border border-purple-500/20 shimmer-border'
                      : 'card-gradient-border bg-white/[0.02] rounded-2xl hover:bg-white/[0.04]'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[11px] font-semibold rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/25">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-400 mt-1.5">{plan.desc}</p>
                  <div className="mt-7 mb-8">
                    <span className="text-5xl font-bold text-white tracking-tight">${plan.price}</span>
                    <span className="text-sm text-gray-400 ml-1.5">/mes</span>
                  </div>
                  <ul className="space-y-3.5 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-purple-400/60 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm text-gray-400 leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?plan=${plan.name.toLowerCase()}`}
                    className={`mt-8 block text-center py-3.5 rounded-xl font-medium text-[15px] transition-all duration-300 ${
                      plan.popular
                        ? 'bg-white text-black hover:bg-gray-100 btn-glow shadow-lg shadow-white/5'
                        : 'bg-white/[0.06] text-gray-300 border border-white/[0.08] hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15]'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <Link
              href="/setup-profesional"
              className="mt-6 flex items-center justify-between p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group"
            >
              <span className="text-sm text-gray-400">¿No tienes tiempo? <strong className="text-gray-200">Te lo configuramos</strong> — desde $149</span>
              <svg className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Separator */}
      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Testimonials ── */}
      <section className="relative py-32 md:py-40 overflow-hidden">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-sm text-purple-400 uppercase tracking-[0.2em] font-medium mb-5">Testimonios</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
              Lo que dicen nuestros clientes
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {testimonials.map((t) => (
                <div key={t.name} className="card-premium rounded-2xl p-8">
                  <p className="text-[15px] text-gray-400 leading-relaxed mb-7">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Separator */}
      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Final CTA ── */}
      <section className="relative py-40 md:py-52 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-br from-purple-600/25 to-blue-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.05]">
              Tu menú digital.
              <br />
              <span className="text-gradient-premium">Disponible hoy.</span>
            </h2>
            <p className="mt-6 text-lg text-gray-400 font-light max-w-md mx-auto">
              Únete a cientos de restaurantes que ya usan MENIUS para recibir más pedidos.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all btn-glow"
              >
                Empezar gratis &rarr;
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-10 py-4 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 transition-all"
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
