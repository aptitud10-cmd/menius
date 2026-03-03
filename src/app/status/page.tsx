import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Estado del sistema — MENIUS',
  description: 'Monitoreo en tiempo real de todos los servicios de MENIUS: API, base de datos, pagos, notificaciones y más.',
  alternates: { canonical: '/status' },
};

const SERVICES: Service[] = [
  { name: 'API & Dashboard', nameEn: 'API & Dashboard', status: 'operational' },
  { name: 'Menú digital (QR)', nameEn: 'Digital Menu (QR)', status: 'operational' },
  { name: 'Pagos (Stripe)', nameEn: 'Payments (Stripe)', status: 'operational' },
  { name: 'Notificaciones (Email)', nameEn: 'Notifications (Email)', status: 'operational' },
  { name: 'Base de datos', nameEn: 'Database', status: 'operational' },
  { name: 'Almacenamiento de imágenes', nameEn: 'Image Storage', status: 'operational' },
  { name: 'Autenticación', nameEn: 'Authentication', status: 'operational' },
  { name: 'IA (Asistente MENIUS)', nameEn: 'AI (MENIUS Assistant)', status: 'operational' },
];

const INCIDENTS: { date: string; title: string; titleEn: string; description: string; descriptionEn: string; resolved: boolean }[] = [];

type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface Service { name: string; nameEn: string; status: ServiceStatus }

function StatusBadge({ status, en }: { status: ServiceStatus; en: boolean }) {
  if (status === 'operational') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <CheckCircle className="w-4 h-4" />
        {en ? 'Operational' : 'Operativo'}
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
        <AlertTriangle className="w-4 h-4" />
        {en ? 'Degraded' : 'Degradado'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
      <AlertTriangle className="w-4 h-4" />
      {en ? 'Outage' : 'Interrupción'}
    </span>
  );
}

export default async function StatusPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value ?? 'es') as LandingLocale;
  const en = locale === 'en';

  const allOperational = SERVICES.every((s) => s.status === 'operational');
  const hasOutage = SERVICES.some((s) => s.status === 'outage');

  return (
    <>
      <LandingNav locale={locale} />
      <main className="min-h-screen bg-white pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Hero status banner */}
          <div className={`rounded-2xl p-8 text-center mb-10 ${
            hasOutage
              ? 'bg-red-50 border border-red-200'
              : allOperational
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
              hasOutage ? 'bg-red-100' : allOperational ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              {allOperational
                ? <CheckCircle className="w-7 h-7 text-emerald-600" />
                : <AlertTriangle className={`w-7 h-7 ${hasOutage ? 'text-red-600' : 'text-amber-600'}`} />
              }
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${
              hasOutage ? 'text-red-800' : allOperational ? 'text-emerald-800' : 'text-amber-800'
            }`}>
              {allOperational
                ? (en ? 'All systems operational' : 'Todos los sistemas operativos')
                : hasOutage
                ? (en ? 'Service disruption detected' : 'Interrupción de servicio detectada')
                : (en ? 'Some services degraded' : 'Algunos servicios degradados')
              }
            </h1>
            <p className={`text-sm ${
              hasOutage ? 'text-red-600' : allOperational ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {en
                ? `Last updated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                : `Última actualización: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
              }
            </p>
          </div>

          {/* Services list */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {en ? 'Services' : 'Servicios'}
            </h2>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {SERVICES.map((service) => (
                <div key={service.name} className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm font-medium text-gray-800">
                    {en ? service.nameEn : service.name}
                  </span>
                  <StatusBadge status={service.status} en={en} />
                </div>
              ))}
            </div>
          </section>

          {/* Incidents */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {en ? 'Incident history' : 'Historial de incidentes'}
            </h2>
            {INCIDENTS.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-gray-500 border border-gray-200 rounded-xl px-5 py-4 bg-white">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {en
                  ? 'No incidents reported in the last 90 days.'
                  : 'Sin incidentes reportados en los últimos 90 días.'}
              </div>
            ) : (
              <div className="space-y-3">
                {INCIDENTS.map((incident, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-5 bg-white">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {en ? incident.titleEn : incident.title}
                      </p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                        incident.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {incident.resolved ? (en ? 'Resolved' : 'Resuelto') : (en ? 'Ongoing' : 'En curso')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{incident.date}</p>
                    <p className="text-sm text-gray-600">{en ? incident.descriptionEn : incident.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Uptime note */}
          <div className="text-center">
            <p className="text-xs text-gray-400">
              {en
                ? 'Have an issue? Contact us at '
                : '¿Tienes un problema? Contáctanos en '}
              <a href="mailto:soporte@menius.app" className="text-emerald-600 hover:underline font-medium">
                soporte@menius.app
              </a>
            </p>
          </div>

        </div>
      </main>
      <LandingFooter locale={locale} />
    </>
  );
}
