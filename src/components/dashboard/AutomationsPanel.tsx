'use client';

import { Mail, MessageCircle, Star, Clock, ShoppingBag, UserPlus, Zap, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  notificationsEnabled: boolean;
  hasEmail: boolean;
  hasWhatsApp: boolean;
}

interface AutomationItem {
  id: string;
  title: string;
  description: string;
  trigger: string;
  channel: 'email' | 'whatsapp' | 'both';
  icon: typeof Mail;
  category: 'restaurant' | 'platform';
}

const AUTOMATIONS: AutomationItem[] = [
  {
    id: 'order_confirm',
    title: 'Confirmación de pedido',
    description: 'Envía confirmación automática al cliente cuando realiza un pedido con su email.',
    trigger: 'Cada nuevo pedido',
    channel: 'email',
    icon: ShoppingBag,
    category: 'restaurant',
  },
  {
    id: 'order_status',
    title: 'Actualización de estado',
    description: 'Notifica al cliente cuando su pedido cambia de estado (confirmado, preparando, listo, entregado).',
    trigger: 'Cambio de estado del pedido',
    channel: 'both',
    icon: Clock,
    category: 'restaurant',
  },
  {
    id: 'owner_new_order',
    title: 'Alerta de nuevo pedido (dueño)',
    description: 'Envía notificación al dueño del restaurante cada vez que llega un nuevo pedido.',
    trigger: 'Cada nuevo pedido',
    channel: 'both',
    icon: Zap,
    category: 'restaurant',
  },
  {
    id: 'welcome',
    title: 'Bienvenida a nuevos clientes',
    description: 'Email automático de bienvenida a clientes que hacen su primer pedido.',
    trigger: 'Diario a las 10:00 UTC (cron)',
    channel: 'email',
    icon: UserPlus,
    category: 'restaurant',
  },
  {
    id: 'reactivation',
    title: 'Reactivación de inactivos',
    description: 'Invita a regresar a clientes que no han ordenado en 30+ días.',
    trigger: 'Diario a las 10:00 UTC (cron)',
    channel: 'email',
    icon: MessageCircle,
    category: 'restaurant',
  },
  {
    id: 'review_request',
    title: 'Solicitud de reseña',
    description: 'Pide una reseña al cliente 1-2 días después de que su pedido fue entregado.',
    trigger: 'Diario a las 10:00 UTC (cron)',
    channel: 'email',
    icon: Star,
    category: 'restaurant',
  },
  {
    id: 'trial_expiring',
    title: 'Trial por vencer (MENIUS)',
    description: 'Avisa al dueño cuando faltan 3 días o menos para que termine su prueba gratuita.',
    trigger: 'Diario a las 10:00 UTC (cron)',
    channel: 'email',
    icon: Clock,
    category: 'platform',
  },
  {
    id: 'setup_incomplete',
    title: 'Menú vacío (MENIUS)',
    description: 'Recuerda al dueño configurar su menú si lleva 2+ días sin productos.',
    trigger: 'Diario a las 10:00 UTC (cron)',
    channel: 'email',
    icon: Info,
    category: 'platform',
  },
  {
    id: 'no_orders',
    title: 'Sin pedidos (MENIUS)',
    description: 'Envía tips de marketing a restaurantes con productos pero sin pedidos en 14 días.',
    trigger: 'Diario a las 10:00 UTC (cron)',
    channel: 'email',
    icon: Mail,
    category: 'platform',
  },
];

export function AutomationsPanel({ notificationsEnabled, hasEmail, hasWhatsApp }: Props) {
  const restaurantAutomations = AUTOMATIONS.filter(a => a.category === 'restaurant');
  const platformAutomations = AUTOMATIONS.filter(a => a.category === 'platform');

  const getStatus = (a: AutomationItem): { active: boolean; reason?: string } => {
    if (!notificationsEnabled) return { active: false, reason: 'Notificaciones desactivadas' };
    if (a.channel === 'email' && !hasEmail) return { active: false, reason: 'Sin email configurado' };
    if (a.channel === 'whatsapp' && !hasWhatsApp) return { active: false, reason: 'Sin WhatsApp configurado' };
    if (a.channel === 'both' && !hasEmail && !hasWhatsApp) return { active: false, reason: 'Sin canales configurados' };
    return { active: true };
  };

  const renderAutomation = (a: AutomationItem) => {
    const status = getStatus(a);
    const Icon = a.icon;
    return (
      <div key={a.id} className={cn('flex items-start gap-4 p-4 rounded-xl border transition-colors', status.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-70')}>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', status.active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400')}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium', status.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500')}>
              {status.active ? <><CheckCircle2 className="w-2.5 h-2.5" /> Activa</> : 'Inactiva'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Zap className="w-3 h-3" /> {a.trigger}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              {a.channel === 'email' && <><Mail className="w-3 h-3" /> Email</>}
              {a.channel === 'whatsapp' && <><MessageCircle className="w-3 h-3" /> WhatsApp</>}
              {a.channel === 'both' && <><Mail className="w-3 h-3" /> Email + WhatsApp</>}
            </span>
          </div>
          {!status.active && status.reason && (
            <p className="text-[10px] text-amber-600 mt-1.5">{status.reason}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={cn('flex items-center gap-3 p-4 rounded-xl border', notificationsEnabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200')}>
        <div className={cn('w-3 h-3 rounded-full', notificationsEnabled ? 'bg-green-500 animate-pulse' : 'bg-amber-500')} />
        <div>
          <p className={cn('text-sm font-semibold', notificationsEnabled ? 'text-green-800' : 'text-amber-800')}>
            {notificationsEnabled ? 'Automatizaciones activas' : 'Automatizaciones pausadas'}
          </p>
          <p className={cn('text-xs', notificationsEnabled ? 'text-green-600' : 'text-amber-600')}>
            {notificationsEnabled
              ? `${hasEmail ? 'Email' : ''}${hasEmail && hasWhatsApp ? ' + ' : ''}${hasWhatsApp ? 'WhatsApp' : ''} configurado${!hasEmail && !hasWhatsApp ? 'Configura un canal en Ajustes' : ''}`
              : 'Activa las notificaciones en Ajustes > Notificaciones'}
          </p>
        </div>
      </div>

      {/* Restaurant automations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Restaurante → Cliente</h3>
        <div className="space-y-2">
          {restaurantAutomations.map(renderAutomation)}
        </div>
      </div>

      {/* Platform automations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">MENIUS → Dueño del restaurante</h3>
        <div className="space-y-2">
          {platformAutomations.map(renderAutomation)}
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Las automatizaciones se ejecutan diariamente a las 10:00 UTC mediante un cron job de Vercel.
          Los emails en tiempo real (confirmación de pedido, alertas) se envían al instante cuando ocurre el evento.
          Para activar/desactivar automatizaciones, ve a <strong>Ajustes → Notificaciones</strong>.
        </p>
      </div>
    </div>
  );
}
