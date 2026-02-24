'use client';

import { Mail, Clock, UserPlus, ShoppingBag, Zap, CheckCircle2, Settings, TrendingUp, Star, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationItem {
  id: string;
  title: string;
  description: string;
  trigger: string;
  icon: typeof Mail;
  status: 'active' | 'active_new' | 'planned';
  category: 'existing' | 'new';
}

const AUTOMATIONS: AutomationItem[] = [
  {
    id: 'trial_expiring',
    title: 'Trial por vencer',
    description: 'Avisa al dueño cuando faltan 3 días o menos para que termine su prueba gratuita. Incluye link a elegir plan y recomendación de Pro.',
    trigger: 'Diario 10:00 UTC · Restaurantes con trial_end ≤ 3 días',
    icon: Clock,
    status: 'active',
    category: 'existing',
  },
  {
    id: 'setup_incomplete',
    title: 'Menú vacío',
    description: 'Recuerda configurar el menú a restaurantes creados hace 2-7 días sin productos. Menciona la importación con IA.',
    trigger: 'Diario 10:00 UTC · Restaurantes 2-7 días sin productos',
    icon: Settings,
    status: 'active',
    category: 'existing',
  },
  {
    id: 'no_orders',
    title: 'Sin pedidos — Tips',
    description: 'Envía 4 tips de marketing (compartir en redes, QR, fotos, notificaciones) a restaurantes con productos pero sin pedidos en 14 días.',
    trigger: 'Diario 10:00 UTC · Con productos, 0 pedidos en 14 días',
    icon: ShoppingBag,
    status: 'active',
    category: 'existing',
  },
  {
    id: 'onboarding_day1',
    title: 'Onboarding — Día 1',
    description: 'Bienvenida personalizada al registrarse. Guía paso a paso: personalizar menú, generar QR, compartir link. Tono cálido y motivacional.',
    trigger: 'Diario 10:00 UTC · Restaurantes creados ayer',
    icon: UserPlus,
    status: 'active_new',
    category: 'new',
  },
  {
    id: 'onboarding_day3',
    title: 'Onboarding — Día 3',
    description: 'Tips intermedios: importar menú con IA, agregar fotos (venden 30% más), activar pedidos online, configurar notificaciones.',
    trigger: 'Diario 10:00 UTC · Restaurantes creados hace 3 días',
    icon: Star,
    status: 'active_new',
    category: 'new',
  },
  {
    id: 'onboarding_day7',
    title: 'Onboarding — Día 7',
    description: 'Tips avanzados: campañas de email a clientes, promociones, analytics, considerar upgrade a Pro para delivery y WhatsApp.',
    trigger: 'Diario 10:00 UTC · Restaurantes creados hace 7 días',
    icon: TrendingUp,
    status: 'active_new',
    category: 'new',
  },
  {
    id: 'monthly_report',
    title: 'Reporte mensual',
    description: 'Resumen mensual: pedidos recibidos, nuevos clientes, revenue estimado, comparativa vs. mes anterior, sugerencias de mejora.',
    trigger: 'Día 1 de cada mes · Restaurantes activos',
    icon: CalendarDays,
    status: 'active_new',
    category: 'new',
  },
];

export function AdminAutomationsPanel() {
  const existingAutomations = AUTOMATIONS.filter(a => a.category === 'existing');
  const newAutomations = AUTOMATIONS.filter(a => a.category === 'new');

  const renderAutomation = (a: AutomationItem) => {
    const Icon = a.icon;
    const isNew = a.status === 'active_new';
    return (
      <div key={a.id} className="flex items-start gap-4 p-4 rounded-xl bg-[#0a0a0a] border border-white/[0.06] transition-colors hover:border-white/[0.1]">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          a.status === 'planned' ? 'bg-white/[0.04] text-gray-600' : 'bg-purple-500/[0.12] text-purple-400')}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{a.title}</p>
            <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
              a.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
              a.status === 'active_new' ? 'bg-purple-500/15 text-purple-400' :
              'bg-white/[0.04] text-gray-600')}>
              {a.status === 'planned' ? 'Planeado' : <><CheckCircle2 className="w-2.5 h-2.5" /> {isNew ? 'Nuevo' : 'Activa'}</>}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
              <Zap className="w-3 h-3" /> {a.trigger}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">{AUTOMATIONS.filter(a => a.status !== 'planned').length} automatizaciones activas</p>
          <p className="text-xs text-emerald-400/60">Cron diario a las 10:00 UTC via Vercel</p>
        </div>
      </div>

      {/* Existing */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Automatizaciones existentes</h3>
        <div className="space-y-2">{existingAutomations.map(renderAutomation)}</div>
      </div>

      {/* New */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nuevas automatizaciones</h3>
        <div className="space-y-2">{newAutomations.map(renderAutomation)}</div>
      </div>

      {/* Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          Todas las automatizaciones se ejecutan desde <code className="text-purple-400">/api/cron/email-automations</code> configurado en <code className="text-purple-400">vercel.json</code>.
          Los emails usan el branding MENIUS con tema oscuro.
          Cada automatización tiene protección contra duplicados y respeta el opt-out del restaurante.
        </p>
      </div>
    </div>
  );
}
