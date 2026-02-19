import Link from 'next/link';

/* ══════════════════════════════════════════════════
   IMPACT
   ══════════════════════════════════════════════════ */

function ImpactSection() {
  return (
    <section className="relative py-16 md:py-24 bg-[#050505]">
      <div className="max-w-[1140px] mx-auto px-5 text-center">
        <p className="text-5xl md:text-7xl font-bold text-white tracking-tight">30%</p>
        <p className="text-lg md:text-xl text-gray-400 mt-2">No es crecimiento.</p>

        <div className="my-8 flex justify-center">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
        </div>

        <p className="text-5xl md:text-7xl font-bold text-emerald-400 tracking-tight">0%</p>
        <p className="text-lg md:text-xl text-gray-400 mt-2">Es control.</p>

        <p className="text-sm text-gray-500 mt-8 max-w-md mx-auto">
          Deja de pagar comisiones por cada pedido. Tus clientes, tus datos, tu dinero.
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   HOW IT WORKS
   ══════════════════════════════════════════════════ */

function HowItWorksSection() {
  const steps = [
    { num: '1', icon: '📱', title: 'QR para cada mesa', desc: 'Tu cliente escanea con su celular.' },
    { num: '2', icon: '🛒', title: 'Pide desde el menú', desc: 'Elige, personaliza y ordena.' },
    { num: '3', icon: '🍳', title: 'Cocina recibe al instante', desc: 'Pedido directo a pantalla KDS.' },
  ];

  return (
    <section id="producto" className="relative py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-[1.75rem] md:text-4xl font-bold text-white tracking-tight">
            Escanea. Pide. Listo.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s) => (
            <div key={s.num} className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 md:mt-14 flex items-center justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
            Rápido
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            Moderno
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Confiable
          </span>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   COMPARISON CARDS
   ══════════════════════════════════════════════════ */

function ComparisonSection() {
  return (
    <section className="relative py-16 md:py-24 bg-[#050505]">
      <div className="max-w-[600px] mx-auto px-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.04]">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Apps de delivery</p>
            <p className="text-xl font-bold text-white mb-2">15–30% por pedido</p>
            <p className="text-sm text-gray-500">La app se queda con tus clientes y tus datos.</p>
          </div>
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06]">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">MENIUS</p>
            <p className="text-xl font-bold text-white mb-2">0% comisiones</p>
            <p className="text-sm text-gray-500">Tu marca, tus datos, tus clientes. Siempre.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   FEATURES GRID
   ══════════════════════════════════════════════════ */

function FeaturesSection() {
  const features = [
    { icon: '📋', title: 'Pedidos directos', desc: 'Dine-in, pickup y delivery sin intermediarios.' },
    { icon: '💳', title: 'Pagos integrados', desc: 'Stripe, efectivo o pago en mesa.' },
    { icon: '🍳', title: 'Cocina en tiempo real', desc: 'Pantalla KDS para tu equipo de cocina.' },
    { icon: '🤖', title: 'IA integrada', desc: 'Asistente que ayuda a vender más.' },
  ];

  return (
    <section className="relative py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-[1.75rem] md:text-4xl font-bold text-white tracking-tight">
            Hecho para restaurantes modernos
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-5 md:p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <span className="text-2xl md:text-3xl block mb-3">{f.icon}</span>
              <h3 className="text-sm md:text-base font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   PRICING
   ══════════════════════════════════════════════════ */

function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: 39,
      desc: 'Para empezar a digitalizar tu menú.',
      features: ['Menú QR', 'Pedidos directos', 'Hasta 50 productos'],
      popular: false,
    },
    {
      name: 'Pro',
      price: 79,
      desc: 'Todo lo que necesitas para crecer.',
      features: ['Todo de Starter', 'Asistente IA', '0% comisiones', '200 productos', 'Analytics'],
      popular: true,
    },
    {
      name: 'Business',
      price: 149,
      desc: 'Para operaciones avanzadas.',
      features: ['Todo de Pro', 'Productos ilimitados', 'Multi-sucursal', 'API access', 'Soporte prioritario'],
      popular: false,
    },
  ];

  return (
    <section id="precios" className="relative py-16 md:py-24 bg-[#050505]">
      <div className="max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-[1.75rem] md:text-4xl font-bold text-white tracking-tight">
            Precios simples
          </h2>
          <p className="text-sm text-gray-500 mt-3">14 días gratis. Sin tarjeta.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-[900px] mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border ${
                plan.popular
                  ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  Popular
                </span>
              )}
              <p className="text-sm font-semibold text-gray-400">{plan.name}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-sm text-gray-500">/mes</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{plan.desc}</p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block w-full text-center mt-6 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.popular
                    ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                    : 'bg-white/[0.06] text-white hover:bg-white/10'
                }`}
              >
                Empezar gratis
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   TESTIMONIALS
   ══════════════════════════════════════════════════ */

function TestimonialsSection() {
  const testimonials = [
    { quote: 'Dejamos de pagar $23k al año en comisiones. MENIUS se pagó solo el primer mes.', name: 'Carlos R.', role: 'Taquería El Patrón' },
    { quote: 'Mis clientes piden desde su celular y la cocina recibe al instante. Cero errores.', name: 'María G.', role: 'La Cocina de María' },
    { quote: 'El menú QR se ve increíble. Mis clientes creen que es una app propia.', name: 'Roberto S.', role: 'Mariscos Don Beto' },
  ];

  return (
    <section className="relative py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-[1.75rem] md:text-4xl font-bold text-white tracking-tight">
            Restaurantes que confían en MENIUS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-[900px] mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-400">{t.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   CTA FINAL
   ══════════════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="relative py-20 md:py-28 bg-[#050505]">
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.05] to-transparent" />
      <div className="relative z-10 max-w-[1140px] mx-auto px-5 text-center">
        <h2 className="text-[1.75rem] md:text-5xl font-bold text-white tracking-tight">
          Tu menú digital.
          <br />
          Disponible hoy.
        </h2>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 px-4 sm:px-0">
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
        <p className="mt-5 text-xs text-gray-500">14 días gratis · Sin tarjeta de crédito</p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   EXPORT ALL
   ══════════════════════════════════════════════════ */

export function LandingSections() {
  return (
    <>
      <ImpactSection />
      <HowItWorksSection />
      <ComparisonSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
