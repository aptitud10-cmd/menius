'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StatusData {
  checks: Record<string, boolean>;
  indexedChunks: number;
  indexedFiles: number;
  lastIndexed: string | null;
  migrationSql: string;
  supabaseSqlUrl: string;
  allReady: boolean;
}

const CHECK_LABELS: Record<string, { label: string; desc: string; group: string }> = {
  code_embeddings:      { label: 'Tabla code_embeddings',    desc: 'Almacena los embeddings del codebase',         group: 'db' },
  dev_conversations:    { label: 'Tabla dev_conversations',  desc: 'Guarda el historial de conversaciones',        group: 'db' },
  search_function:      { label: 'Función search_code_embeddings', desc: 'Búsqueda semántica en pgvector',         group: 'db' },
  exec_function:        { label: 'Función exec_readonly_sql', desc: 'Queries SQL desde el chat',                  group: 'db' },
  anthropic_key:        { label: 'ANTHROPIC_API_KEY',        desc: 'Claude Opus, Sonnet, Haiku',                  group: 'env' },
  github_token:         { label: 'GITHUB_TOKEN',             desc: 'Leer y escribir archivos del repo',           group: 'env' },
  voyage_key:           { label: 'VOYAGE_API_KEY',           desc: 'Embeddings de código + reranking',            group: 'env' },
  tavily_key:           { label: 'TAVILY_API_KEY',           desc: 'Búsqueda web desde el chat',                  group: 'env' },
  vercel_token:         { label: 'VERCEL_TOKEN',             desc: 'Estado de deploy + logs en vivo',             group: 'env' },
  gemini_key:           { label: 'GEMINI_API_KEY',           desc: 'Gemini 2.5 Pro/Flash (1M tokens context)',    group: 'env' },
  sentry_token:         { label: 'SENTRY_AUTH_TOKEN',        desc: 'Ver errores de producción en el chat',        group: 'env' },
  github_webhook_secret:{ label: 'GITHUB_WEBHOOK_SECRET',   desc: 'Auto-indexado en cada push',                  group: 'env' },
};

export default function SetupWizard() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dev/setup');
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const copySQL = async () => {
    if (!data?.migrationSql) return;
    await navigator.clipboard.writeText(data.migrationSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerIndex = async (force = false) => {
    setIndexing(true);
    setIndexResult(null);
    try {
      const res = await fetch('/api/admin/dev/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.ok) {
        setIndexResult(`✅ Indexado: ${json.indexed} archivos nuevos, ${json.skipped} sin cambios`);
        await fetchStatus();
      } else {
        setIndexResult(`❌ Error: ${json.error}`);
      }
    } finally { setIndexing(false); }
  };

  const dbChecks = Object.entries(CHECK_LABELS).filter(([, v]) => v.group === 'db');
  const envChecks = Object.entries(CHECK_LABELS).filter(([, v]) => v.group === 'env');
  const dbReady = data ? dbChecks.every(([k]) => data.checks[k]) : false;
  const coreEnvReady = data ? ['anthropic_key', 'github_token', 'voyage_key'].every(k => data.checks[k]) : false;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dev" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Dev Tool
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            ⚡ Setup — Menius Dev Tool
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 animate-pulse">Verificando estado…</div>
          </div>
        ) : !data ? (
          <div className="text-red-400">Error al cargar el estado. <button onClick={fetchStatus} className="underline">Reintentar</button></div>
        ) : (
          <div className="space-y-6">

            {/* Overall status */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                background: data.allReady ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.1)',
                borderColor: data.allReady ? '#16a34a' : '#ca8a04',
              }}
            >
              <span className="text-lg">{data.allReady ? '✅' : '⚠️'}</span>
              <div>
                <p className="text-sm font-medium text-white">
                  {data.allReady ? 'Todo listo — puedes usar el Dev Tool' : 'Faltan configuraciones'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {Object.values(data.checks).filter(Boolean).length} / {Object.keys(data.checks).length} checks pasados
                </p>
              </div>
              <button
                onClick={fetchStatus}
                className="ml-auto text-xs text-gray-400 hover:text-white transition-colors"
              >
                ↺ Refrescar
              </button>
            </div>

            {/* STEP 1: Database */}
            <section className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${dbReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {dbReady ? '✓' : '1'}
                  </span>
                  <h2 className="text-sm font-semibold text-white">Migración SQL en Supabase</h2>
                </div>
                {!dbReady && (
                  <a
                    href={data.supabaseSqlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                  >
                    Abrir Supabase SQL Editor ↗
                  </a>
                )}
              </div>

              <div className="p-5 space-y-3">
                {dbChecks.map(([key, info]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${data.checks[key] ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {data.checks[key] ? '✓' : '✗'}
                    </span>
                    <div>
                      <span className="text-sm font-mono text-gray-200">{info.label}</span>
                      <span className="text-xs text-gray-500 ml-2">{info.desc}</span>
                    </div>
                  </div>
                ))}

                {!dbReady && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">
                        1. Copia el SQL de abajo → 2. Abre Supabase SQL Editor → 3. Pégalo y ejecuta → 4. Vuelve y refresca
                      </p>
                      <button
                        onClick={copySQL}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-gray-300 hover:bg-white/[0.06] transition-colors"
                      >
                        {copied ? '✓ Copiado!' : '📋 Copiar SQL'}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-gray-500 bg-black/40 rounded-xl p-3 overflow-auto max-h-48 border border-white/[0.06]">
                      {data.migrationSql}
                    </pre>
                  </div>
                )}
              </div>
            </section>

            {/* STEP 2: Indexing */}
            <section className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${data.indexedFiles > 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {data.indexedFiles > 0 ? '✓' : '2'}
                </span>
                <h2 className="text-sm font-semibold text-white">Indexar el codebase</h2>
              </div>
              <div className="p-5">
                {data.indexedFiles > 0 ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-400 font-medium">✓ Codebase indexado</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {data.indexedFiles} archivos · {data.indexedChunks} chunks
                        {data.lastIndexed && ` · Última actualización: ${new Date(data.lastIndexed).toLocaleDateString('es')}`}
                      </p>
                    </div>
                    <button
                      onClick={() => triggerIndex(true)}
                      disabled={indexing || !dbReady}
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-gray-400 hover:text-white hover:border-white/[0.2] transition-colors disabled:opacity-40"
                    >
                      {indexing ? '⏳ Indexando…' : '↺ Re-indexar todo'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-300 mb-3">
                      El codebase no está indexado. Esto tarda ~3-5 minutos la primera vez y es necesario para la búsqueda semántica.
                    </p>
                    <button
                      onClick={() => triggerIndex(false)}
                      disabled={indexing || !dbReady}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                      style={{ background: dbReady ? '#7c3aed' : '#374151', color: 'white' }}
                    >
                      {indexing ? '⏳ Indexando… (puede tardar 3-5 min)' : '🔍 Indexar codebase ahora'}
                    </button>
                    {!dbReady && <p className="text-xs text-yellow-400 mt-2">⚠ Primero ejecuta la migración SQL</p>}
                  </div>
                )}
                {indexResult && (
                  <p className={`text-xs mt-3 ${indexResult.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                    {indexResult}
                  </p>
                )}
              </div>
            </section>

            {/* STEP 3: Environment variables */}
            <section className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${coreEnvReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {coreEnvReady ? '✓' : '3'}
                </span>
                <h2 className="text-sm font-semibold text-white">Variables de entorno en Vercel</h2>
              </div>
              <div className="p-5 space-y-3">
                {envChecks.map(([key, info]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${data.checks[key] ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {data.checks[key] ? '✓' : '!'}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs font-mono text-gray-200">{info.label}</span>
                      <span className="text-xs text-gray-500 ml-2">{info.desc}</span>
                    </div>
                    {!data.checks[key] && (
                      <span className="text-[10px] text-orange-400 flex-shrink-0">Falta</span>
                    )}
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-gray-500">
                    Las marcadas en naranja son opcionales — el tool funciona sin ellas pero con capacidades reducidas.
                    Las críticas son: <span className="text-white font-mono">ANTHROPIC_API_KEY</span>, <span className="text-white font-mono">GITHUB_TOKEN</span>, <span className="text-white font-mono">VOYAGE_API_KEY</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* STEP 4: GitHub Webhook */}
            <section className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${data.checks.github_webhook_secret ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  4
                </span>
                <h2 className="text-sm font-semibold text-white">Webhook de GitHub (auto-indexado)</h2>
                <span className="text-xs text-gray-500">— opcional</span>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-300">
                  Registra este webhook en GitHub para que el índice se actualice automáticamente en cada push:
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Payload URL', value: 'https://menius.app/api/admin/dev/webhook' },
                    { label: 'Content type', value: 'application/json' },
                    { label: 'Secret', value: 'El valor de CRON_SECRET en Vercel' },
                    { label: 'Events', value: 'Just the push event' },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-3 text-xs">
                      <span className="text-gray-500 w-28 flex-shrink-0">{row.label}:</span>
                      <code className="text-gray-200 bg-white/[0.04] px-2 py-0.5 rounded">{row.value}</code>
                    </div>
                  ))}
                </div>
                <a
                  href="https://github.com/aptitud10-cmd/menius/settings/hooks/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-gray-300 hover:bg-white/[0.06] transition-colors"
                >
                  Abrir GitHub Webhooks ↗
                </a>
              </div>
            </section>

            {/* CTA */}
            {coreEnvReady && dbReady && (
              <div className="text-center pt-2">
                <Link
                  href="/admin/dev"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-colors"
                  style={{ background: '#7c3aed' }}
                >
                  ⚡ Ir al Dev Tool
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
