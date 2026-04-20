'use client';

import { Mail, Star, Clock, ShoppingBag, UserPlus, Zap, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface Props {
  notificationsEnabled: boolean;
  hasEmail: boolean;
}

interface AutomationItem {
  id: string;
  title: string;
  description: string;
  trigger: string;
  channel: 'email';
  icon: typeof Mail;
  category: 'restaurant' | 'platform';
}

export function AutomationsPanel({ notificationsEnabled, hasEmail }: Props) {
  const { t } = useDashboardLocale();

  const AUTOMATIONS: AutomationItem[] = [
    { id: 'order_confirm', title: t.auto_orderConfirmTitle, description: t.auto_orderConfirmDesc, trigger: t.auto_eachNewOrder, channel: 'email', icon: ShoppingBag, category: 'restaurant' },
    { id: 'order_status', title: t.auto_orderStatusTitle, description: t.auto_orderStatusDesc, trigger: t.auto_statusChangeTrigger, channel: 'email', icon: Clock, category: 'restaurant' },
    { id: 'owner_new_order', title: t.auto_ownerAlertTitle, description: t.auto_ownerAlertDesc, trigger: t.auto_eachNewOrder, channel: 'email', icon: Zap, category: 'restaurant' },
    { id: 'welcome', title: t.auto_welcomeTitle, description: t.auto_welcomeDesc, trigger: t.auto_cronTrigger, channel: 'email', icon: UserPlus, category: 'restaurant' },
    { id: 'reactivation', title: t.auto_reactivationTitle, description: t.auto_reactivationDesc, trigger: t.auto_cronTrigger, channel: 'email', icon: Mail, category: 'restaurant' },
    { id: 'review_request', title: t.auto_reviewRequestTitle, description: t.auto_reviewRequestDesc, trigger: t.auto_cronTrigger, channel: 'email', icon: Star, category: 'restaurant' },
    { id: 'trial_expiring', title: t.auto_trialExpiringTitle, description: t.auto_trialExpiringDesc, trigger: t.auto_cronTrigger, channel: 'email', icon: Clock, category: 'platform' },
    { id: 'setup_incomplete', title: t.auto_setupIncompleteTitle, description: t.auto_setupIncompleteDesc, trigger: t.auto_cronTrigger, channel: 'email', icon: Info, category: 'platform' },
    { id: 'no_orders', title: t.auto_noOrdersTitle, description: t.auto_noOrdersDesc, trigger: t.auto_cronTrigger, channel: 'email', icon: Mail, category: 'platform' },
  ];
  const restaurantAutomations = AUTOMATIONS.filter(a => a.category === 'restaurant');
  const platformAutomations = AUTOMATIONS.filter(a => a.category === 'platform');

  const getStatus = (a: AutomationItem): { active: boolean; reason?: string } => {
    if (!notificationsEnabled) return { active: false, reason: t.auto_reasonNotifOff };
    if (a.channel === 'email' && !hasEmail) return { active: false, reason: t.auto_reasonNoEmail };
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
              {status.active ? <><CheckCircle2 className="w-2.5 h-2.5" /> {t.auto_statusActive}</> : t.auto_statusInactive}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Zap className="w-3 h-3" /> {a.trigger}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Mail className="w-3 h-3" /> Email
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
            {notificationsEnabled ? t.auto_active : t.auto_paused}
          </p>
          <p className={cn('text-xs', notificationsEnabled ? 'text-green-600' : 'text-amber-600')}>
            {notificationsEnabled
              ? `${hasEmail ? 'Email' : ''} ${t.auto_configuredMsg}${!hasEmail ? t.auto_enableMsg : ''}`
              : t.auto_enableMsg}
          </p>
        </div>
      </div>

      {/* Restaurant automations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.auto_restaurantToClient}</h3>
        <div className="space-y-2">
          {restaurantAutomations.map(renderAutomation)}
        </div>
      </div>

      {/* Platform automations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.auto_platformToOwner}</h3>
        <div className="space-y-2">
          {platformAutomations.map(renderAutomation)}
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.auto_infoText }} />
      </div>
    </div>
  );
}
