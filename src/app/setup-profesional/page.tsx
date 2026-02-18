import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { SetupForm } from './SetupForm';

export const metadata: Metadata = {
  title: 'Setup Profesional — MENIUS',
  description: 'Nuestro equipo configura tu menú digital, sube tus productos con fotos IA, y deja tu restaurante listo para recibir pedidos.',
  alternates: { canonical: '/setup-profesional' },
  openGraph: {
    title: 'Setup Profesional — MENIUS',
    description: 'Servicio profesional de configuración para tu restaurante digital. Tu menú listo en 48 horas.',
    type: 'website',
  },
};

const packages = [
  {
    id: 'setup-basico',
    name: 'Setup Básico',
    price: 149,
    tag: null,
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
  },
  {
    id: 'setup-premium',
    name: 'Setup Premium',
    price: 349,
    tag: 'Recomendado',
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
  },
  {
    id: 'setup-enterprise',
    name: 'Setup Enterprise',
    price: 699,
    tag: 'Concierge',
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
  },
  {
    id: 'soporte-mensual',
    name: 'Soporte Prioritario',
    price: 79,
    tag: 'Mensual',
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
  },
];

const processSteps = [
  {
    step: 1,
    title: 'Solicitud',
    desc: 'Llena el formulario con la información de tu restaurante y elige el plan que necesitas.',
  },
  {
    step: 2,
    title: 'Confirmación',
    desc: 'Te contactamos en menos de 24 horas para confirmar detalles y coordinar el inicio.',
  },
  {
    step: 3,
    title: 'Configuración',
    desc: 'Nuestro equipo configura tu menú digital con fotos IA, tu marca y todos tus productos.',
  },
  {
    step: 4,
    title: '¡Listo!',
    desc: 'Revisamos contigo el resultado, hacemos ajustes y tu restaurante queda online.',
  },
];

export default function SetupProfesionalPage() {
  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Servicio profesional
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-tight">
            Tú cocinas.{' '}<br className="hidden sm:block" />
            <span className="text-gradient-premium">Nosotros digitalizamos.</span>
          </h1>
          <p className="text-lg text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed font-light">
            Nuestro equipo se encarga de crear tu menú digital, subir todos tus productos con fotos profesionales generadas por IA, y dejar tu restaurante listo para recibir pedidos online.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="relative z-10 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-12 tracking-tight">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {processSteps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-semibold text-purple-400">{s.step}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-4xl mx-auto" />

      {/* Packages */}
      <section className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-4 tracking-tight">Elige tu plan de servicio</h2>
          <p className="text-sm text-gray-500 text-center mb-12 max-w-lg mx-auto">Pago único por setup. Sin sorpresas. Garantía de satisfacción o te devolvemos el dinero.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-7 flex flex-col transition-all duration-300 ${
                  pkg.tag === 'Recomendado'
                    ? 'card-gradient-border shimmer-border bg-[#0a0a0a] ring-1 ring-purple-500/30'
                    : 'card-premium'
                }`}
              >
                {pkg.tag && (
                  <span className={`absolute -top-3 right-6 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    pkg.tag === 'Recomendado'
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
                    {pkg.id === 'soporte-mensual' ? 'USD/mes' : 'USD único'}
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
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm leading-snug text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#solicitar"
                  className={`mt-6 text-center py-3 rounded-xl text-sm font-medium transition-all ${
                    pkg.tag === 'Recomendado'
                      ? 'bg-white text-black hover:bg-gray-100 btn-glow'
                      : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] border border-white/[0.06]'
                  }`}
                >
                  Solicitar {pkg.name}
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
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3 tracking-tight">Solicitar Setup Profesional</h2>
          <p className="text-sm text-gray-500 text-center mb-10">Llena el formulario y te contactamos en menos de 24 horas.</p>
          <Suspense fallback={<div className="py-12 text-center text-gray-500">Cargando formulario...</div>}>
            <SetupForm packages={packages.map((p) => ({ id: p.id, name: p.name, price: p.price }))} />
          </Suspense>
        </div>
      </section>

      <div className="separator-gradient max-w-4xl mx-auto" />

      {/* FAQ mini */}
      <section className="relative z-10 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-white text-center mb-8">Preguntas sobre el servicio</h2>
          <div className="space-y-3">
            {[
              { q: '¿Qué necesito para empezar?', a: 'Solo tu menú (foto, PDF o lista) y tu logo. Nosotros nos encargamos de todo lo demás: categorías, productos, fotos, precios, QR y configuración completa.' },
              { q: '¿Cómo generan las fotos de los platos?', a: 'Usamos Google Gemini AI para generar fotos profesionales de cada plato. El resultado es una imagen de alta calidad que se ve como fotografía profesional de comida.' },
              { q: '¿Puedo hacer cambios después?', a: 'Sí. Una vez configurado, tienes acceso completo a tu dashboard para editar cualquier cosa. Si tienes Soporte Prioritario, nosotros lo hacemos por ti.' },
              { q: '¿Ofrecen garantía?', a: 'Sí. Si no estás satisfecho con el setup, te devolvemos el 100% de tu dinero. Sin preguntas ni letras pequeñas.' },
              { q: '¿Necesito una suscripción mensual también?', a: 'Sí, el servicio de setup es adicional a tu suscripción mensual de MENIUS (desde $39/mes). El setup es un pago único que cubre la configuración inicial completa.' },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-purple-500/20 transition-colors duration-300">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
                  <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                  <span className="faq-icon text-purple-400 text-xl font-light transition-transform duration-200 flex-shrink-0">+</span>
                </summary>
                <div className="faq-answer px-6 pb-5">
                  <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-black overflow-hidden">
        <div className="separator-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 bg-black pt-10 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                <p className="text-[13px] text-gray-600 mt-4 leading-relaxed max-w-[200px]">Menús digitales y pedidos en línea para restaurantes.</p>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/#funciones" className="text-[13px] text-gray-600 hover:text-white transition-colors">Funciones</Link></li>
                  <li><Link href="/#precios" className="text-[13px] text-gray-600 hover:text-white transition-colors">Precios</Link></li>
                  <li><Link href="/r/demo" className="text-[13px] text-gray-600 hover:text-white transition-colors">Demo en vivo</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-[13px] text-gray-600 hover:text-white transition-colors">Blog</Link></li>
                  <li><Link href="/faq" className="text-[13px] text-gray-600 hover:text-white transition-colors">FAQ</Link></li>
                  <li><a href="mailto:soporte@menius.app" className="text-[13px] text-gray-600 hover:text-white transition-colors">Soporte</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/privacy" className="text-[13px] text-gray-600 hover:text-white transition-colors">Privacidad</Link></li>
                  <li><Link href="/terms" className="text-[13px] text-gray-600 hover:text-white transition-colors">Términos</Link></li>
                  <li><Link href="/cookies" className="text-[13px] text-gray-600 hover:text-white transition-colors">Cookies</Link></li>
                </ul>
              </div>
            </div>
            <div className="separator-gradient mt-12" />
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-gray-700" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
              <p className="text-[11px] text-gray-700">
                Hecho en{' '}
                <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">Scuart Digital</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
