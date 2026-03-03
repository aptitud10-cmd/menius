'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { LandingLocale } from '@/lib/landing-translations';

type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface ServiceResult {
  id: string;
  name: string;
  nameEn: string;
  status: ServiceStatus;
  latency: number;
}

interface StatusResponse {
  services: ServiceResult[];
  checkedAt: string;
}

const REFRESH_INTERVAL = 60;

function LatencyDot({ status }: { status: ServiceStatus }) {
  if (status === 'operational') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
    );
  }
  if (status === 'degraded') {
    return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />;
  }
  return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />;
}

function LatencyBar({ latency }: { latency: number }) {
  // 0–500ms = green, 500–1500ms = yellow, >1500ms = red
  const capped = Math.min(latency, 3000);
  const pct = (capped / 3000) * 100;
  const color =
    latency < 500 ? 'bg-emerald-400' : latency < 1500 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-14 text-right">
        {latency < 2 ? '< 1 ms' : `${latency} ms`}
      </span>
    </div>
  );
}

function StatusLabel({ status, en }: { status: ServiceStatus; en: boolean }) {
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
      <WifiOff className="w-4 h-4" />
      {en ? 'Outage' : 'Interrupción'}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="h-4 w-40 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function StatusClient({ locale }: { locale: LandingLocale }) {
  const en = locale === 'en';
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(false);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const json: StatusResponse = await res.json();
      setData(json);
      setCountdown(REFRESH_INTERVAL);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown ticker
  useEffect(() => {
    if (loading) return;
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [loading]);

  const services = data?.services ?? [];
  const allOperational = services.length > 0 && services.every((s) => s.status === 'operational');
  const hasOutage = services.some((s) => s.status === 'outage');

  const checkedAt = data?.checkedAt
    ? new Date(data.checkedAt).toLocaleTimeString(en ? 'en-US' : 'es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">

      {/* Hero banner */}
      <div
        className={`rounded-2xl p-8 text-center mb-10 transition-colors duration-500 ${
          loading
            ? 'bg-gray-50 border border-gray-200'
            : hasOutage
            ? 'bg-red-50 border border-red-200'
            : !allOperational
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-emerald-50 border border-emerald-200'
        }`}
      >
        <div
          className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
            loading
              ? 'bg-gray-100'
              : hasOutage
              ? 'bg-red-100'
              : !allOperational
              ? 'bg-amber-100'
              : 'bg-emerald-100'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-7 h-7 text-gray-400 animate-spin" />
          ) : allOperational ? (
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          ) : (
            <AlertTriangle className={`w-7 h-7 ${hasOutage ? 'text-red-600' : 'text-amber-600'}`} />
          )}
        </div>

        <h1
          className={`text-2xl font-bold mb-2 ${
            loading
              ? 'text-gray-400'
              : hasOutage
              ? 'text-red-800'
              : !allOperational
              ? 'text-amber-800'
              : 'text-emerald-800'
          }`}
        >
          {loading
            ? (en ? 'Checking services…' : 'Verificando servicios…')
            : allOperational
            ? (en ? 'All systems operational' : 'Todos los sistemas operativos')
            : hasOutage
            ? (en ? 'Service disruption detected' : 'Interrupción de servicio detectada')
            : (en ? 'Some services degraded' : 'Algunos servicios degradados')}
        </h1>

        {!loading && checkedAt && (
          <p
            className={`text-sm ${
              hasOutage ? 'text-red-600' : !allOperational ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {en ? `Last checked: ${checkedAt}` : `Última verificación: ${checkedAt}`}
          </p>
        )}
      </div>

      {/* Services list */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            {en ? 'Services' : 'Servicios'}
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {!loading && !refreshing && (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>{en ? `Refresh in ${countdown}s` : `Actualiza en ${countdown}s`}</span>
                <button
                  onClick={() => fetchStatus(true)}
                  className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={en ? 'Refresh now' : 'Actualizar ahora'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
            {refreshing && (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {en ? 'Checking…' : 'Verificando…'}
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
            : error
            ? (
              <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-gray-500">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {en ? 'Could not load service status.' : 'No se pudo cargar el estado.'}
              </div>
            )
            : services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LatencyDot status={service.status} />
                  <span className="text-sm font-medium text-gray-800">
                    {en ? service.nameEn : service.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <LatencyBar latency={service.latency} />
                  <StatusLabel status={service.status} en={en} />
                </div>
              </div>
            ))}
        </div>

        {/* Legend */}
        {!loading && !error && (
          <div className="flex items-center gap-5 mt-3 px-1">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block w-2 h-1.5 rounded bg-emerald-400" />
              {en ? '< 500 ms' : '< 500 ms'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block w-2 h-1.5 rounded bg-amber-400" />
              {en ? '500 – 1500 ms' : '500 – 1500 ms'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block w-2 h-1.5 rounded bg-red-400" />
              {en ? '> 1500 ms' : '> 1500 ms'}
            </span>
          </div>
        )}
      </section>

      {/* Incident history */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {en ? 'Incident history' : 'Historial de incidentes'}
        </h2>
        <div className="flex items-center gap-3 text-sm text-gray-500 border border-gray-200 rounded-xl px-5 py-4 bg-white">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {en
            ? 'No incidents reported in the last 90 days.'
            : 'Sin incidentes reportados en los últimos 90 días.'}
        </div>
      </section>

      {/* Contact */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          {en ? 'Have an issue? Contact us at ' : '¿Tienes un problema? Contáctanos en '}
          <a href="mailto:soporte@menius.app" className="text-emerald-600 hover:underline font-medium">
            soporte@menius.app
          </a>
        </p>
      </div>

    </div>
  );
}
