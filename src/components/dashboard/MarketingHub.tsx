'use client';

import { useState } from 'react';
import { Mail, Share2, Smartphone, Zap, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { EmailCampaigns } from './EmailCampaigns';
import { SocialMediaManager } from './SocialMediaManager';
import { SMSCampaigns } from './SMSCampaigns';
import { AutomationsPanel } from './AutomationsPanel';
import { WhatsAppCampaigns } from './WhatsAppCampaigns';

interface Props {
  restaurantName: string;
  menuSlug: string;
  restaurantLocale: string;
  totalCustomers: number;
  customersWithEmail: number;
  customersWithPhone: number;
  notificationsEnabled: boolean;
  hasEmail: boolean;
  hasWhatsApp: boolean;
}

type TabId = 'email' | 'whatsapp' | 'social' | 'sms' | 'automations';

export function MarketingHub(props: Props) {
  const { t } = useDashboardLocale();
  const [activeTab, setActiveTab] = useState<TabId>('email');

  const TABS: { id: TabId; label: string; icon: typeof Mail }[] = [
    { id: 'email', label: t.marketing_tabEmail, icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'social', label: t.marketing_tabSocial, icon: Share2 },
    { id: 'sms', label: t.marketing_tabSms, icon: Smartphone },
    { id: 'automations', label: t.marketing_tabAutomations, icon: Zap },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{t.marketing_title}</h1>
      <p className="text-sm text-gray-500 mb-6">{t.marketing_subtitle}</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center',
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'email' && (
        <EmailCampaigns
          restaurantName={props.restaurantName}
          menuSlug={props.menuSlug}
          restaurantLocale={props.restaurantLocale}
          totalCustomers={props.totalCustomers}
          customersWithEmail={props.customersWithEmail}
        />
      )}

      {activeTab === 'whatsapp' && (
        <WhatsAppCampaigns
          restaurantName={props.restaurantName}
          menuSlug={props.menuSlug}
          restaurantLocale={props.restaurantLocale}
          customersWithPhone={props.customersWithPhone}
        />
      )}

      {activeTab === 'social' && (
        <SocialMediaManager
          restaurantName={props.restaurantName}
          menuSlug={props.menuSlug}
          restaurantLocale={props.restaurantLocale}
        />
      )}

      {activeTab === 'sms' && (
        <SMSCampaigns
          restaurantName={props.restaurantName}
          menuSlug={props.menuSlug}
          restaurantLocale={props.restaurantLocale}
          totalCustomers={props.totalCustomers}
          customersWithPhone={props.customersWithPhone}
        />
      )}

      {activeTab === 'automations' && (
        <AutomationsPanel
          notificationsEnabled={props.notificationsEnabled}
          hasEmail={props.hasEmail}
          hasWhatsApp={props.hasWhatsApp}
        />
      )}
    </div>
  );
}
