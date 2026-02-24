'use client';

import { useState } from 'react';
import { Mail, Share2, Smartphone, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminEmailCampaigns } from './AdminEmailCampaigns';
import { AdminSocialMedia } from './AdminSocialMedia';
import { AdminAutomationsPanel } from './AdminAutomationsPanel';

interface Props {
  totalRestaurants: number;
  restaurantsWithEmail: number;
  planCounts: Record<string, number>;
}

const TABS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'social', label: 'Redes Sociales', icon: Share2 },
  { id: 'automations', label: 'Automatizaciones', icon: Zap },
] as const;

type TabId = typeof TABS[number]['id'];

export function AdminMarketingHub(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('email');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Marketing MENIUS</h1>
          <p className="text-sm text-gray-500 mt-1">Campañas, redes sociales y automatizaciones hacia dueños de restaurantes</p>
        </div>
        <a href="/admin" className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:text-white transition-colors">
          ← Admin
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center',
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300')}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'email' && (
        <AdminEmailCampaigns
          totalRestaurants={props.totalRestaurants}
          restaurantsWithEmail={props.restaurantsWithEmail}
          planCounts={props.planCounts}
        />
      )}

      {activeTab === 'social' && <AdminSocialMedia />}

      {activeTab === 'automations' && <AdminAutomationsPanel />}
    </div>
  );
}
