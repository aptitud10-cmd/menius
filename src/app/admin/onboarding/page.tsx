'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  status: string;
  plan: string;
  owner_email: string;
}

interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  aiSuggestion?: string;
}

const STEPS_TEMPLATE: OnboardingStep[] = [
  { id: 'profile', label: 'Perfil de tienda (nombre, logo, colores)', done: false },
  { id: 'categories', label: 'Categorías del menú (AI sugiere basado en tipo de restaurante)', done: false },
  { id: 'products', label: 'Productos iniciales (AI genera 5-10 productos de ejemplo)', done: false },
  { id: 'schedule', label: 'Horario de atención', done: false },
  { id: 'payments', label: 'Configuración de pagos / delivery', done: false },
  { id: 'publish', label: 'Publicar y compartir link', done: false },
];

export default function OnboardingPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>(STEPS_TEMPLATE);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => {
        // Filter new restaurants (trialing or status none — likely not yet configured)
        const list = (d.restaurants ?? []).filter(
          (r: Restaurant) => r.status === 'trialing' || r.status === 'active'
        );
        setRestaurants(list);
        setLoadingList(false);
      })
      .catch(() => setLoadingList(false));
  }, []);

  const filtered = restaurants.filter(r =>
    !searchQ || r.name.toLowerCase().includes(searchQ.toLowerCase()) || r.slug.includes(searchQ)
  );

  const askAI = async (prompt: string, stepId: string) => {
    setActiveStep(stepId);
    setAiLoading(true);
    setAiOutput('');
    setAiMessage('');
    try {
      const res = await fetch('/api/admin/dev/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-3-5',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok || !res.body) { setAiOutput('Error al consultar AI'); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let out = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'token') {
              out += ev.text;
              setAiOutput(out);
            }
          } catch {}
        }
      }
    } finally {
      setAiLoading(false);
    }
  };

  const markDone = (stepId: string) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, done: true } : s));
    setActiveStep(null);
    setAiOutput('');
  };

  const completedCount = steps.filter(s => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const getStepPrompt = (stepId: string): string => {
    const name = selected?.name ?? 'este restaurante';
    const slug = selected?.slug ?? 'restaurante';
    const prompts: Record<string, string> = {
      categories: `Sugiere 6-8 categorías de menú ideales para un restaurante llamado "${name}" (slug: ${slug}). Sé específico, creativo y relevante. Para cada categoría da: nombre, emoji e ícono sugerido. Responde en español, formato lista.`,
      products: `Crea 8 productos de ejemplo para el menú de "${name}". Para cada uno incluye: nombre atractivo, descripción de 1 línea, precio sugerido en USD, categoría. Hazlos realistas y apetitosos. Lista numerada.`,
      profile: `Dame 3 sugerencias de descripción corta (máx 120 chars) para la bio/descripción de la tienda "${name}". Que sean atractivas para clientes en app móvil. También sugiere 3 opciones de eslogan.`,
      schedule: `Sugiere un horario de atención típico para un restaurante como "${name}". Incluye días de la semana, horarios de apertura y cierre. Considera almuerzo y cena si aplica.`,
      payments: `Lista los métodos de pago más populares para restaurantes en Latinoamérica que debería configurar "${name}". Incluye opciones de delivery local.`,
      publish: `Escribe un mensaje de bienvenida corto (máx 3 líneas) para enviar por WhatsApp al dueño de "${name}" (${selected?.owner_email}) cuando su tienda esté lista para publicar. Incluye el link: https://menius.app/${slug}`,
    };
    return prompts[stepId] ?? `Ayuda con el paso "${stepId}" para el restaurante "${name}".`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-600 hover:text-gray-400 text-sm">← Admin</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold text-white">🚀 Onboarding de tiendas</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Configura nuevas tiendas con ayuda de AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT: store list ─── */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 mb-2">Seleccionar tienda</p>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar tienda…"
                className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {loadingList ? (
                <p className="text-xs text-gray-600 text-center py-6">Cargando…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-6">Sin tiendas</p>
              ) : filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelected(r);
                    setSteps(STEPS_TEMPLATE.map(s => ({ ...s, done: false })));
                    setAiOutput('');
                    setActiveStep(null);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors"
                  style={{ background: selected?.id === r.id ? '#1f2937' : undefined }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-xs font-medium text-gray-200 truncate">{r.name}</p>
                      <p className="text-[10px] text-gray-600">{r.slug} · {r.plan}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: wizard ─── */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
              <p className="text-4xl mb-3">👈</p>
              <p className="text-sm text-gray-400">Selecciona una tienda para empezar el onboarding asistido por AI</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Store header */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{selected.name}</p>
                  <p className="text-xs text-gray-500">menius.app/{selected.slug} · {selected.owner_email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Progreso</p>
                  <p className="text-lg font-bold text-purple-400">{progress}%</p>
                  <div className="w-20 bg-gray-800 rounded-full h-1.5 mt-1">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Steps */}
              {steps.map(step => (
                <div
                  key={step.id}
                  className="bg-gray-900 border rounded-2xl overflow-hidden transition-all"
                  style={{ borderColor: step.done ? '#16a34a40' : activeStep === step.id ? '#7c3aed40' : '#1f2937' }}
                >
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className="text-lg flex-shrink-0">
                      {step.done ? '✅' : activeStep === step.id ? '⏳' : '⬜'}
                    </span>
                    <p className={`flex-1 text-sm ${step.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <button
                        onClick={() => askAI(getStepPrompt(step.id), step.id)}
                        disabled={aiLoading}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                        style={{ background: '#7c3aed20', color: '#a78bfa' }}
                      >
                        {aiLoading && activeStep === step.id ? '⏳ AI…' : '✨ Sugerir con AI'}
                      </button>
                    )}
                    {!step.done && (
                      <button
                        onClick={() => markDone(step.id)}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        style={{ background: '#16a34a20', color: '#4ade80' }}
                      >
                        ✓ Listo
                      </button>
                    )}
                  </div>

                  {/* AI output for this step */}
                  {activeStep === step.id && aiOutput && (
                    <div className="px-5 pb-4 border-t border-gray-800 pt-3">
                      <p className="text-[10px] text-purple-400 mb-2 font-semibold">✨ Sugerencia de AI:</p>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{aiOutput}</pre>
                      {!aiLoading && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(aiOutput);
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-200"
                          >
                            📋 Copiar
                          </button>
                          <a
                            href={`/app?restaurant=${selected.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-200"
                          >
                            🔗 Abrir tienda
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Completion */}
              {completedCount === steps.length && (
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-2xl p-6 text-center">
                  <p className="text-3xl mb-2">🎉</p>
                  <p className="text-lg font-bold text-emerald-400">¡Onboarding completado!</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">La tienda {selected.name} está lista para sus clientes.</p>
                  <a
                    href={`https://menius.app/${selected.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl font-medium hover:bg-emerald-500 transition-colors"
                  >
                    Ver tienda →
                  </a>
                </div>
              )}

              {aiMessage && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400">{aiMessage}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
