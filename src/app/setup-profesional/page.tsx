import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SetupForm } from './SetupForm';

export const metadata: Metadata = {
  title: 'Setup Profesional — MENIUS',
  description: 'Nuestro equipo configura tu menú digital, sube tus productos con fotos IA, y deja tu restaurante listo para recibir pedidos.',
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

const process_steps = [
  {
    step: 1,
    title: 'Solicitud',
    desc: 'Llena el formulario con la información de tu restaurante y el plan que necesitas.',
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
    desc: 'Revisamos contigo el resultado, hacemos ajustes si es necesario, y tu restaurante queda online.',
  },
];

export default function SetupProfesionalPage() {
  return (
    <div className="min-h-screen-safe bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-brand-950 tracking-tight font-heading">MENIUS</Link>
          <Link href="/signup" className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
            Crear cuenta gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-brand-50/30 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Servicio profesional
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight font-heading">
            Tú cocinas.{' '}<br className="hidden sm:block" />
            <span className="text-gradient">Nosotros digitalizamos.</span>
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Nuestro equipo se encarga de crear tu menú digital, subir todos tus productos con fotos profesionales generadas por IA, y dejar tu restaurante listo para recibir pedidos online.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-12 font-heading">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {process_steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-extrabold text-brand-600 font-heading">{s.step}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-4 font-heading">Elige tu plan de servicio</h2>
          <p className="text-sm text-gray-500 text-center mb-12 max-w-lg mx-auto">Pago único por setup. Sin sorpresas. Garantía de satisfacción o te devolvemos el dinero.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  pkg.tag === 'Recomendado'
                    ? 'bg-brand-950 text-white ring-2 ring-brand-400 shadow-2xl'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {pkg.tag && (
                  <span className={`absolute -top-3 right-6 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    pkg.tag === 'Recomendado'
                      ? 'bg-brand-400 text-brand-950 shadow-lg shadow-brand-400/25'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {pkg.tag}
                  </span>
                )}

                <h3 className={`text-lg font-bold font-heading ${pkg.tag === 'Recomendado' ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
                <p className={`text-sm mt-1 ${pkg.tag === 'Recomendado' ? 'text-gray-400' : 'text-gray-500'}`}>{pkg.desc}</p>

                <div className="mt-5 mb-6">
                  <span className={`text-4xl font-extrabold font-heading ${pkg.tag === 'Recomendado' ? 'text-white' : 'text-gray-900'}`}>${pkg.price}</span>
                  <span className={`text-sm ml-1 ${pkg.tag === 'Recomendado' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {pkg.id === 'soporte-mensual' ? 'USD/mes' : 'USD único'}
                  </span>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium mb-5 w-fit ${
                  pkg.tag === 'Recomendado' ? 'bg-white/10 text-gray-300' : 'bg-gray-50 text-gray-500'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {pkg.timeline}
                </div>

                <ul className="space-y-2.5 flex-1">
                  {pkg.includes.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${pkg.tag === 'Recomendado' ? 'text-brand-400' : 'text-brand-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm leading-snug ${pkg.tag === 'Recomendado' ? 'text-gray-300' : 'text-gray-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request Form */}
      <section id="solicitar" className="py-20 md:py-28 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-3 font-heading">Solicitar Setup Profesional</h2>
          <p className="text-sm text-gray-500 text-center mb-10">Llena el formulario y te contactamos en menos de 24 horas.</p>
          <Suspense fallback={<div className="py-12 text-center text-gray-400">Cargando formulario...</div>}>
            <SetupForm packages={packages.map((p) => ({ id: p.id, name: p.name, price: p.price }))} />
          </Suspense>
        </div>
      </section>

      {/* FAQ mini */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8 font-heading">Preguntas sobre el servicio</h2>
          <div className="space-y-3">
            {[
              { q: '¿Qué necesito para empezar?', a: 'Solo tu menú (foto, PDF o lista) y tu logo. Nosotros nos encargamos de todo lo demás.' },
              { q: '¿Cómo generan las fotos de los platos?', a: 'Usamos Google Gemini AI para generar fotos profesionales de cada plato. El resultado es una imagen de alta calidad que se ve como fotografía profesional de comida.' },
              { q: '¿Puedo hacer cambios después?', a: 'Sí. Una vez configurado, tienes acceso completo a tu dashboard para editar cualquier cosa. Si tienes Soporte Prioritario, nosotros lo hacemos por ti.' },
              { q: '¿Ofrecen garantía?', a: 'Sí. Si no estás satisfecho con el setup, te devolvemos el 100% de tu dinero. Sin preguntas.' },
              { q: '¿Necesito una suscripción mensual también?', a: 'Sí, el servicio de setup es adicional a tu suscripción mensual de MENIUS (desde $39/mes). El setup es un pago único.' },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-xl bg-white border border-gray-100 overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer">
                  <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <span className="faq-icon text-brand-500 text-lg font-light transition-transform duration-200 flex-shrink-0">+</span>
                </summary>
                <div className="faq-answer px-5 pb-4">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer mini */}
      <footer className="py-8 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© 2026 MENIUS. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600">Privacidad</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600">Términos</Link>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">Inicio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
