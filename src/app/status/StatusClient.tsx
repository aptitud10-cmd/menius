'use client';

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
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

export function StatusClient({ locale }: { locale: LandingLocale }) {
  const en = locale === 'en';
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [refreshing, setRefreshing] = useState(false);
  // Pulso solo cuando un servicio CAMBIA de estado (no en cada chequeo de 60 s).
  const prevStatus = useRef<Record<string, ServiceStatus>>({});
  const [changed, setChanged] = useState<Record<string, number>>({});

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(false);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const json: StatusResponse = await res.json();
      const prev = prevStatus.current;
      const hadPrev = Object.keys(prev).length > 0;
      const bumps: Record<string, number> = {};
      json.services.forEach((s) => {
        if (hadPrev && prev[s.id] && prev[s.id] !== s.status) bumps[s.id] = Date.now();
        prev[s.id] = s.status;
      });
      if (Object.keys(bumps).length) setChanged((c) => ({ ...c, ...bumps }));
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
  // Sin datos (falló /api/status) no se afirma ningún estado: banner neutro.
  const unknown = !loading && (error || services.length === 0);
  const tone = loading || unknown ? 'idle' : hasOutage ? 'down' : !allOperational ? 'slow' : 'ok';

  const title = loading
    ? (en ? 'Checking services…' : 'Verificando servicios…')
    : unknown
    ? (en ? 'Could not check services right now' : 'No pudimos verificar los servicios ahora')
    : allOperational
    ? (en ? 'All systems operational' : 'Todos los sistemas operativos')
    : hasOutage
    ? (en ? 'Service disruption detected' : 'Interrupción de servicio detectada')
    : (en ? 'Some services degraded' : 'Algunos servicios degradados');

  // "7:02:14 PM" → hora en sello + "PM" chico (es-MX da "19:02:14" sin sufijo).
  const checked = data?.checkedAt
    ? new Date(data.checkedAt).toLocaleTimeString(en ? 'en-US' : 'es-MX', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;
  const [checkedTime, ...checkedSuffix] = (checked ?? '').split(/\s+/);

  return (
    <main id="main-content" className="stat" data-tone={tone}>
      <div className="wrap">
        <div className="stat-wrap">
          <header className="ph stat-ph">
            <span className="stamp label">{en ? 'Status' : 'Estado'}</span>
            <div className="stat-hero">
              <span className="dot" aria-hidden="true" />
              <h1 key={title} className="fade-in">{title}</h1>
            </div>
            <p className="checked" aria-live="polite">
              {!loading && !unknown && checked ? (
                <>
                  {en ? 'Last checked' : 'Última verificación'}{' '}
                  <span className="stamp">
                    {checkedTime}
                    {checkedSuffix.length > 0 && <small>{checkedSuffix.join(' ')}</small>}
                  </span>
                </>
              ) : (
                <span className="checked-wait">{loading ? (en ? 'Checking…' : 'Verificando…') : '—'}</span>
              )}
            </p>
          </header>

          <div className="svcs-h">
            <h2>{en ? 'Services' : 'Servicios'}</h2>
            <div className="rf">
              {refreshing ? (
                <span>{en ? 'Checking…' : 'Verificando…'}</span>
              ) : !loading ? (
                <span>{en ? `Refresh in ${countdown}s` : `Actualiza en ${countdown}s`}</span>
              ) : null}
              <button
                type="button"
                onClick={() => fetchStatus(true)}
                disabled={loading || refreshing}
                aria-label={en ? 'Refresh now' : 'Actualizar ahora'}
              >
                <svg className={refreshing ? 'spin' : undefined} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" /></svg>
              </button>
            </div>
          </div>

          <ul className="svcs">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="sk" aria-hidden="true">
                    <span className="d" />
                    <span className="nm"><i /></span>
                    <span className="lat"><i /></span>
                    <span className="lb" />
                  </li>
                ))
              : error
              ? (
                <li className="svc-err">{en ? 'Could not load service status.' : 'No se pudo cargar el estado.'}</li>
              )
              : services.map((service) => {
                  const rowTone = service.status === 'outage' ? 'down' : service.status === 'degraded' ? 'slow' : undefined;
                  const latTone = service.latency < 500 ? undefined : service.latency < 1500 ? 'w' : 'r';
                  const pct = (Math.min(service.latency, 3000) / 3000) * 100;
                  return (
                    <li key={service.id} className={rowTone}>
                      <span key={changed[service.id] ?? 0} className={changed[service.id] ? 'd pulse' : 'd'} aria-hidden="true" />
                      <span className="nm">{en ? service.nameEn : service.name}</span>
                      <span className={latTone ? `lat ${latTone}` : 'lat'}>
                        <i style={{ '--w': `${Math.max(pct, 2)}%` } as CSSProperties} />
                        {service.latency < 2 ? '< 1 ms' : `${service.latency.toLocaleString('en-US')} ms`}
                      </span>
                      <span className="lb">{statusLabel(service.status, en)}</span>
                    </li>
                  );
                })}
          </ul>
          {!loading && !error && (
            <div className="legend">
              <span><i />&lt; 500 ms</span>
              <span><i className="w" />500 – 1500 ms</span>
              <span><i className="r" />&gt; 1500 ms</span>
            </div>
          )}

          {/* Qué mide esta página (no hay registro histórico de incidentes) */}
          <p className="stat-note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {en
              ? 'This page checks each service when you open it and every 60 seconds. It does not keep an incident history.'
              : 'Esta página verifica cada servicio al abrirla y cada 60 segundos. No guarda un historial de incidentes.'}
          </p>
          <p className="stat-contact">
            {en ? 'Have an issue? Contact us at ' : '¿Tienes un problema? Contáctanos en '}
            <a href="mailto:soporte@menius.app">soporte@menius.app</a>
          </p>
        </div>
      </div>
    </main>
  );
}

function statusLabel(status: ServiceStatus, en: boolean) {
  if (status === 'operational') return en ? 'Operational' : 'Operativo';
  if (status === 'degraded') return en ? 'Degraded' : 'Degradado';
  return en ? 'Outage' : 'Interrupción';
}
