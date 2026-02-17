'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FadeIn, Stagger, StaggerItem, LazyMotion, domAnimation } from './Animations';

/* ─── PRICING DATA ─── */

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
    cta: 'Contactar ventas',
  },
];

export function LandingSections() {
  return (
    <LazyMotion features={domAnimation}>
      {/* ── Bento Grid: Features ── */}
      <section id="funciones" className="relative bg-black py-28 md:py-36">
        <div className="absolute inset-0 grid-pattern" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.2em] mb-4">Funciones</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gradient-subtle font-heading">
              Todo lo que necesitas
            </h2>
          </FadeIn>

          {/* Bento Grid */}
          <div className="bento-grid grid-cols-1 md:grid-cols-3">
            {/* Card 1 — large (spans 2) */}
            <div className="md:col-span-2 card-shine flex flex-col md:flex-row items-center gap-6 md:gap-10 p-8 md:p-10">
              <div className="flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-heading">Menú digital con QR</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Tus clientes escanean el QR desde la mesa, ven el menú con fotos y precios, y ordenan desde su celular. Sin descargar apps.</p>
              </div>
              <div className="w-full md:w-[220px] h-[160px] rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                <svg className="w-20 h-20 text-brand-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card-shine p-8">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Pedidos en tiempo real</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Tablero Kanban para gestionar pedidos al instante. Notificaciones por WhatsApp y email.</p>
            </div>

            {/* Card 3 */}
            <div className="card-shine p-8">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Fotos con IA</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Genera fotos profesionales de tus platillos con Google Gemini. Sin fotógrafo.</p>
            </div>

            {/* Card 4 — large (spans 2) */}
            <div className="md:col-span-2 card-shine p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="w-full md:w-[220px] h-[160px] rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                <svg className="w-20 h-20 text-brand-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 font-heading">Analytics inteligente</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Ventas por día, platillos más vendidos, ticket promedio, horas pico. Exporta datos. Toma decisiones con información real.</p>
              </div>
            </div>

            {/* Small cards row */}
            <div className="card-shine p-8">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Pagos con Stripe</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Acepta pagos online seguros. Dinero directo a tu cuenta.</p>
            </div>

            <div className="card-shine p-8">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Promociones</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Códigos de descuento con límites y fechas de vigencia.</p>
            </div>

            <div className="card-shine p-8">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Notificaciones</h3>
              <p className="text-sm text-gray-500 leading-relaxed">WhatsApp, email y sonido al recibir un pedido nuevo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product: Dashboard ── */}
      <section className="relative bg-black py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="line-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Dashboard image */}
            <FadeIn direction="left">
              <div className="relative">
                <div className="absolute inset-0 scale-105 bg-brand-500/[0.05] rounded-2xl blur-[40px]" />
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/50">
                  <Image
                    src="/images/hero-dashboard-mockup.webp"
                    alt="Dashboard de MENIUS"
                    width={500}
                    height={500}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </FadeIn>

            {/* Right: Text */}
            <FadeIn direction="right" delay={0.15}>
              <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.2em] mb-4">Dashboard</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white font-heading leading-tight">
                Gestiona tu restaurante<br />
                <span className="text-gradient">desde un solo lugar</span>
              </h2>
              <p className="text-gray-400 mt-5 leading-relaxed">
                Pedidos en tiempo real, analytics de ventas, gestión de menú con editor visual, equipo con roles y permisos. Todo en un dashboard limpio y rápido.
              </p>
              <div className="mt-8 space-y-3">
                {['Pedidos con tablero Kanban', 'Analytics y reportes', 'Editor de menú con variantes y extras', 'Importar menú con foto + IA'].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm text-gray-300">{f}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="relative bg-black py-28 md:py-36">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="line-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20">
          <FadeIn className="text-center mb-14">
            <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.2em] mb-4">Sin intermediarios</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-heading">
              MENIUS vs Apps de Delivery
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto text-sm">Las apps cobran hasta 30% por pedido. Con MENIUS, tarifa fija y el 100% de tus ventas es tuyo.</p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="space-y-2">
              {[
                ['Comisión por pedido', '0%', '15%–30%'],
                ['Control de clientes', 'Tus datos', 'La app se los queda'],
                ['Tu marca', 'Dominio propio', 'Junto a la competencia'],
                ['Fotos del menú', 'IA genera fotos pro', 'Tú las subes'],
                ['WhatsApp', 'Sí (Plan Pro+)', 'No'],
              ].map(([feature, menius, other]) => (
                <div key={feature} className="grid grid-cols-3 gap-2 items-center rounded-xl overflow-hidden">
                  <div className="bg-white/[0.02] px-4 py-3.5">
                    <p className="text-xs font-medium text-gray-500">{feature}</p>
                  </div>
                  <div className="bg-brand-500/[0.06] border border-brand-500/10 px-4 py-3.5 rounded-lg">
                    <p className="text-sm font-semibold text-brand-300">{menius}</p>
                  </div>
                  <div className="bg-white/[0.02] px-4 py-3.5">
                    <p className="text-sm text-gray-600">{other}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-sm text-gray-400 leading-relaxed text-center">
                <strong className="text-white">Ejemplo:</strong> Un restaurante que vende $10,000/mes pierde{' '}
                <strong className="text-red-400">$3,000 en comisiones</strong> con apps. Con MENIUS Pro ($79/mes),
                ahorra <strong className="text-brand-400">$35,000 al año</strong>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="relative bg-black py-28 md:py-36">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="line-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20">
          <FadeIn className="text-center mb-14">
            <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.2em] mb-4">Precios</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-heading">
              Sin comisiones. Sin sorpresas.
            </h2>
            <p className="text-gray-500 mt-3 text-sm">14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.</p>
          </FadeIn>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-white/[0.04] rounded-2xl overflow-hidden" staggerDelay={0.1}>
            {plans.map((plan) => (
              <StaggerItem key={plan.name}>
                <div className={`relative h-full p-7 flex flex-col ${
                  plan.popular ? 'bg-brand-950' : 'bg-black'
                }`}>
                  {plan.popular && (
                    <span className="absolute top-4 right-4 px-2.5 py-1 bg-brand-400 text-brand-950 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                  <h3 className="text-base font-bold text-white font-heading">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
                  <div className="mt-5 mb-6">
                    <span className="text-3xl font-extrabold text-white font-heading">${plan.price}</span>
                    <span className="text-xs text-gray-500 ml-1">/mes</span>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-xs text-gray-400 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.name === 'Business' ? 'mailto:ventas@menius.app?subject=Plan%20Business' : `/signup?plan=${plan.name.toLowerCase()}`}
                    className={`mt-7 block text-center py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      plan.popular
                        ? 'bg-white text-black hover:bg-gray-100'
                        : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Setup banner */}
          <FadeIn delay={0.3}>
            <Link
              href="/setup-profesional"
              className="mt-8 flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                <span className="text-sm text-gray-400">¿No tienes tiempo? <strong className="text-white">Te lo configuramos</strong> — desde $149</span>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative py-32 md:py-40 bg-black overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-500/[0.06] rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading leading-tight">
              <span className="text-gradient-subtle">Digitaliza tu restaurante</span>
              <br />
              <span className="text-gradient">hoy mismo</span>
            </h2>
            <p className="text-gray-500 mt-6 max-w-md mx-auto leading-relaxed">
              Únete a los restaurantes que reciben más pedidos, ahorran en comisiones, y ofrecen una experiencia digital premium.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-colors"
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/[0.1] text-white font-medium text-sm hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
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
