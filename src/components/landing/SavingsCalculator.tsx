'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LandingLocale } from '@/lib/landing-translations';

interface SavingsCalculatorProps {
  locale: LandingLocale;
}

function formatUSD(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function SavingsCalculator({ locale }: SavingsCalculatorProps) {
  const isEn = locale === 'en';

  const [tables, setTables] = useState(10);
  const [ticket, setTicket] = useState(15);
  const [ordersPerDay, setOrdersPerDay] = useState(30);

  const monthlyRevenue = tables * ordersPerDay * ticket * 30;
  const withOnline = Math.round(monthlyRevenue * 1.3);
  const savingsVsApps = Math.round(monthlyRevenue * 0.3);

  const t = {
    title: isEn ? 'Calculate your savings' : 'Calcula tu ahorro',
    subtitle: isEn
      ? 'See how much more you could earn with MENIUS'
      : 'Descubre cuánto más podrías ganar con MENIUS',
    tables: isEn ? 'Number of tables' : 'Número de mesas',
    ticket: isEn ? 'Average ticket (USD)' : 'Ticket promedio (USD)',
    ordersDay: isEn ? 'Orders per day' : 'Pedidos por día',
    monthly: isEn ? 'Estimated monthly revenue' : 'Ingreso mensual estimado',
    withOnline: isEn ? 'With online orders (+30%)' : 'Con pedidos online (+30%)',
    savings: isEn ? 'Savings vs. app commissions (30%)' : 'Ahorro vs comisiones de apps (30%)',
    cta: isEn ? 'Start free' : 'Empieza gratis',
    perMonth: isEn ? '/mo' : '/mes',
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-md bg-white/5 p-6 md:p-10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#05c8a7]/10 via-transparent to-[#7c3aed]/10 pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <h3 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            {t.title}
          </h3>
          <p className="text-gray-400 text-sm md:text-base">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Tables slider */}
          <SliderField
            label={t.tables}
            value={tables}
            min={1} max={50} step={1}
            onChange={setTables}
            suffix=""
          />
          {/* Ticket slider */}
          <SliderField
            label={t.ticket}
            value={ticket}
            min={5} max={100} step={5}
            onChange={setTicket}
            suffix="$"
            prefix
          />
          {/* Orders/day slider */}
          <SliderField
            label={t.ordersDay}
            value={ordersPerDay}
            min={10} max={200} step={10}
            onChange={setOrdersPerDay}
            suffix=""
          />
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <ResultCard label={t.monthly} value={formatUSD(monthlyRevenue)} accent="white" />
          <ResultCard label={t.withOnline} value={formatUSD(withOnline)} accent="emerald" badge="+30%" />
          <ResultCard label={t.savings} value={formatUSD(savingsVsApps) + t.perMonth} accent="violet" badge={isEn ? 'vs apps' : 'vs apps'} />
        </div>

        <div className="text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#05c8a7] hover:bg-[#04b096] text-black font-bold text-sm md:text-base transition-colors shadow-lg shadow-[#05c8a7]/20"
          >
            {t.cta} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  prefix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix: string;
  prefix?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-bold text-white">
          {prefix ? `$${value}` : value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#05c8a7] bg-white/10"
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{prefix ? `$${min}` : min}</span>
        <span>{prefix ? `$${max}` : max}</span>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  accent,
  badge,
}: {
  label: string;
  value: string;
  accent: 'white' | 'emerald' | 'violet';
  badge?: string;
}) {
  const accentClasses = {
    white: 'text-white',
    emerald: 'text-[#05c8a7]',
    violet: 'text-violet-400',
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/8 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium leading-tight">{label}</span>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 ${accentClasses[accent]}`}>
            {badge}
          </span>
        )}
      </div>
      <span className={`text-2xl font-extrabold tracking-tight ${accentClasses[accent]}`}>
        {value}
      </span>
    </div>
  );
}
