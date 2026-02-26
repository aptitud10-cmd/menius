import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { SetupForm } from './SetupForm';

export const metadata: Metadata = {
  title: 'Professional Setup — MENIUS',
  description: 'Our team sets up your digital menu, uploads your products with AI photos, and gets your restaurant ready to receive orders.',
  alternates: { canonical: '/setup-profesional' },
  openGraph: {
    title: 'Professional Setup — MENIUS',
    description: 'Professional setup service for your digital restaurant. Your menu ready in 48 hours.',
    type: 'website',
  },
};

const t = {
  es: {
    badge: 'Servicio profesional',
    heroLine1: 'Tú cocinas.',
    heroLine2: 'Nosotros digitalizamos.',
    heroDesc: 'Nuestro equipo se encarga de crear tu menú digital, subir todos tus productos con fotos profesionales generadas por IA, y dejar tu restaurante listo para recibir pedidos online.',
    processTitle: '¿Cómo funciona?',
    processSteps: [
      { title: 'Solicitud', desc: 'Llena el formulario con la información de tu restaurante y elige el plan que necesitas.' },
      { title: 'Confirmación', desc: 'Te contactamos en menos de 24 horas para confirmar detalles y coordinar el inicio.' },
      { title: 'Configuración', desc: 'Nuestro equipo configura tu menú digital con fotos IA, tu marca y todos tus productos.' },
      { title: '¡Listo!', desc: 'Revisamos contigo el resultado, hacemos ajustes y tu restaurante queda online.' },
    ],
    packagesTitle: 'Elige tu plan de servicio',
    packagesDesc: 'Pago único por setup. Sin sorpresas. Garantía de satisfacción o te devolvemos el dinero.',
    packages: [
      {
        id: 'setup-basico',
        name: 'Setup Básico',
        price: 149,
        tag: null as string | null,
        tagHighlight: false,
        desc: 'Tu menú digital listo en 48 horas.',
        includes: [
          'Hasta 50 productos con categorías',
          'Logo y colores de tu marca',
          'Configuración de QR para mesas',
          'Fotos con IA para todos los platos',
          'Configuración de pagos (Stripe)',
          '1 revisión incluida',
        ],
        timeline: '24-48 horas',
        monthly: false,
      },
      {
        id: 'setup-premium',
        name: 'Setup Premium',
        price: 349,
        tag: 'Recomendado',
        tagHighlight: true,
        desc: 'Todo optimizado para vender más.',
        includes: [
          'Todo lo de Setup Básico',
          'Hasta 150 productos',
          'Descripciones optimizadas para venta',
          'Dominio personalizado configurado',
          'SEO básico (Google My Business)',
          'Integración WhatsApp',
          'Capacitación por video (30 min)',
          '3 revisiones incluidas',
        ],
        timeline: '3-5 días hábiles',
        monthly: false,
      },
      {
        id: 'setup-enterprise',
        name: 'Setup Enterprise',
        price: 699,
        tag: 'Concierge',
        tagHighlight: false,
        desc: 'Experiencia concierge completa.',
        includes: [
          'Todo lo de Setup Premium',
          'Productos ilimitados',
          'SEO avanzado y meta tags',
          'Diseño personalizado avanzado',
          'Configuración de analytics',
          'Capacitación 1-on-1 (1 hora)',
          'Revisiones ilimitadas (30 días)',
          'Soporte prioritario 60 días',
        ],
        timeline: '5-7 días hábiles',
        monthly: false,
      },
      {
        id: 'soporte-mensual',
        name: 'Soporte Prioritario',
        price: 79,
        tag: 'Mensual',
        tagHighlight: false,
        desc: 'Nos encargamos de todo por ti.',
        includes: [
          'Respuesta en menos de 4 horas',
          'Cambios ilimitados al menú',
          'Actualización de precios y productos',
          'Soporte por WhatsApp directo',
          'Reportes semanales de rendimiento',
          'Optimización SEO continua',
        ],
        timeline: 'Servicio continuo',
        monthly: true,
      },
    ],
    priceOneTime: 'USD one-time',
    priceMonthly: 'USD/mes',
    ctaPrefix: 'Solicitar',
    formTitle: 'Solicitar Setup Profesional',
    formDesc: 'Llena el formulario y te contactamos en menos de 24 horas.',
    formLoading: 'Cargando formulario...',
    faqTitle: 'Preguntas sobre el servicio',
    faqs: [
      { q: '¿Qué necesito para empezar?', a: 'Solo tu menú (foto, PDF o lista) y tu logo. Nosotros nos encargamos de todo lo demás: categorías, productos, fotos, precios, QR y configuración completa.' },
      { q: '¿Cómo generan las fotos de los platos?', a: 'Usamos Google Gemini AI para generar fotos profesionales de cada plato. El resultado es una imagen de alta calidad que se ve como fotografía profesional de comida.' },
      { q: '¿Puedo hacer cambios después?', a: 'Sí. Una vez configurado, tienes acceso completo a tu dashboard para editar cualquier cosa. Si tienes Soporte Prioritario, nosotros lo hacemos por ti.' },
      { q: '¿Ofrecen garantía?', a: 'Sí. Si no estás satisfecho con el setup, te devolvemos el 100% de tu dinero. Sin preguntas ni letras pequeñas.' },
      { q: '¿Necesito una suscripción mensual también?', a: 'Sí, el servicio de setup es adicional a tu suscripción mensual de MENIUS (desde $39/mes). El setup es un pago único que cubre la configuración inicial completa.' },
    ],
  },
  en: {
    badge: 'Professional service',
    heroLine1: 'You cook.',
    heroLine2: 'We digitalize.',
    heroDesc: 'Our team creates your digital menu, uploads all your products with AI-generated professional photos, and gets your restaurant ready to receive online orders.',
    processTitle: 'How does it work?',
    processSteps: [
      { title: 'Request', desc: 'Fill out the form with your restaurant info and choose the plan you need.' },
      { title: 'Confirmation', desc: 'We contact you within 24 hours to confirm details and coordinate the start.' },
      { title: 'Setup', desc: 'Our team sets up your digital menu with AI photos, your branding, and all your products.' },
      { title: 'Done!', desc: 'We review the result with you, make adjustments, and your restaurant goes live.' },
    ],
    packagesTitle: 'Choose your service plan',
    packagesDesc: 'One-time setup fee. No surprises. Satisfaction guaranteed or your money back.',
    packages: [
      {
        id: 'setup-basico',
        name: 'Basic Setup',
        price: 149,
        tag: null as string | null,
        tagHighlight: false,
        desc: 'Your digital menu ready in 48 hours.',
        includes: [
          'Up to 50 products with categories',
          'Your logo and brand colors',
          'QR code setup for tables',
          'AI photos for all dishes',
          'Payment setup (Stripe)',
          '1 revision included',
        ],
        timeline: '24-48 hours',
        monthly: false,
      },
      {
        id: 'setup-premium',
        name: 'Premium Setup',
        price: 349,
        tag: 'Recommended',
        tagHighlight: true,
        desc: 'Everything optimized to sell more.',
        includes: [
          'Everything in Basic Setup',
          'Up to 150 products',
          'Sales-optimized descriptions',
          'Custom domain configured',
          'Basic SEO (Google My Business)',
          'WhatsApp integration',
          'Video training (30 min)',
          '3 revisions included',
        ],
        timeline: '3-5 business days',
        monthly: false,
      },
      {
        id: 'setup-enterprise',
        name: 'Enterprise Setup',
        price: 699,
        tag: 'Concierge',
        tagHighlight: false,
        desc: 'Full concierge experience.',
        includes: [
          'Everything in Premium Setup',
          'Unlimited products',
          'Advanced SEO & meta tags',
          'Advanced custom design',
          'Analytics setup',
          '1-on-1 training (1 hour)',
          'Unlimited revisions (30 days)',
          'Priority support 60 days',
        ],
        timeline: '5-7 business days',
        monthly: false,
      },
      {
        id: 'soporte-mensual',
        name: 'Priority Support',
        price: 79,
        tag: 'Monthly',
        tagHighlight: false,
        desc: 'We take care of everything for you.',
        includes: [
          'Response in less than 4 hours',
          'Unlimited menu changes',
          'Price and product updates',
          'Direct WhatsApp support',
          'Weekly performance reports',
          'Ongoing SEO optimization',
        ],
        timeline: 'Ongoing service',
        monthly: true,
      },
    ],
    priceOneTime: 'USD one-time',
    priceMonthly: 'USD/mo',
    ctaPrefix: 'Request',
    formTitle: 'Request Professional Setup',
    formDesc: 'Fill out the form and we\'ll contact you within 24 hours.',
    formLoading: 'Loading form...',
    faqTitle: 'Service FAQ',
    faqs: [
      { q: 'What do I need to get started?', a: 'Just your menu (photo, PDF, or list) and your logo. We handle everything else: categories, products, photos, prices, QR codes, and full setup.' },
      { q: 'How do you generate the food photos?', a: 'We use Google Gemini AI to generate professional photos of each dish. The result is a high-quality image that looks like professional food photography.' },
      { q: 'Can I make changes after?', a: 'Yes. Once set up, you have full access to your dashboard to edit anything. If you have Priority Support, we do it for you.' },
      { q: 'Do you offer a guarantee?', a: 'Yes. If you\'re not satisfied with the setup, we refund 100% of your money. No questions asked.' },
      { q: 'Do I need a monthly subscription too?', a: 'Yes, the setup service is in addition to your monthly MENIUS subscription (from $39/mo). The setup is a one-time payment that covers the full initial configuration.' },
    ],
  },
} as const;

export default function SetupProfesionalPage() {
  const cookieStore = cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  const s = t[locale];

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav locale={locale} />

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {s.badge}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-tight">
            {s.heroLine1}{' '}<br className="hidden sm:block" />
            <span className="text-gradient-premium">{s.heroLine2}</span>
          </h1>
          <p className="text-lg text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed font-light">
            {s.heroDesc}
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="relative z-10 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-12 tracking-tight">{s.processTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {s.processSteps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-semibold text-emerald-400">{i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-4xl mx-auto" />

      {/* Packages */}
      <section className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-4 tracking-tight">{s.packagesTitle}</h2>
          <p className="text-sm text-gray-500 text-center mb-12 max-w-lg mx-auto">{s.packagesDesc}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {s.packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-7 flex flex-col transition-all duration-300 ${
                  pkg.tagHighlight
                    ? 'card-gradient-border shimmer-border bg-[#0a0a0a] ring-1 ring-emerald-500/30'
                    : 'card-premium'
                }`}
              >
                {pkg.tag && (
                  <span className={`absolute -top-3 right-6 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    pkg.tagHighlight
                      ? 'bg-white text-black shadow-lg shadow-white/10'
                      : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'
                  }`}>
                    {pkg.tag}
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                <p className="text-sm mt-1 text-gray-500">{pkg.desc}</p>

                <div className="mt-5 mb-6">
                  <span className="text-4xl font-semibold text-white">${pkg.price}</span>
                  <span className="text-sm ml-1 text-gray-500">
                    {pkg.monthly ? s.priceMonthly : s.priceOneTime}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium mb-5 w-fit bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {pkg.timeline}
                </div>

                <ul className="space-y-2.5 flex-1">
                  {pkg.includes.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm leading-snug text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#solicitar"
                  className={`mt-6 text-center py-3 rounded-xl text-sm font-medium transition-all ${
                    pkg.tagHighlight
                      ? 'bg-white text-black hover:bg-gray-100 btn-glow'
                      : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] border border-white/[0.06]'
                  }`}
                >
                  {s.ctaPrefix} {pkg.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-4xl mx-auto" />

      {/* Request Form */}
      <section id="solicitar" className="relative z-10 py-20 md:py-28 scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3 tracking-tight">{s.formTitle}</h2>
          <p className="text-sm text-gray-500 text-center mb-10">{s.formDesc}</p>
          <Suspense fallback={<div className="py-12 text-center text-gray-500">{s.formLoading}</div>}>
            <SetupForm
              packages={s.packages.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
              locale={locale}
            />
          </Suspense>
        </div>
      </section>

      <div className="separator-gradient max-w-4xl mx-auto" />

      {/* FAQ mini */}
      <section className="relative z-10 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-white text-center mb-8">{s.faqTitle}</h2>
          <div className="space-y-3">
            {s.faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-emerald-500/20 transition-colors duration-300">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
                  <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                  <span className="faq-icon text-emerald-400 text-xl font-light transition-transform duration-200 flex-shrink-0">+</span>
                </summary>
                <div className="faq-answer px-6 pb-5">
                  <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter locale={locale} />
    </div>
  );
}
