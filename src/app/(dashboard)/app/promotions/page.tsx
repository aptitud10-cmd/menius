'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useToast } from '@/components/dashboard/DashToast';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface Promotion {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function PromotionsPage() {
  const { t } = useDashboardLocale();
  const toast = useToast();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tenant/promotions');
    const data = await res.json();
    setPromos(data.promotions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  const resetForm = () => {
    setCode(''); setDescription(''); setDiscountType('percentage');
    setDiscountValue(''); setMinOrder(''); setMaxUses(''); setExpiresAt('');
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/tenant/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code, description, discount_type: discountType,
        discount_value: discountValue,
        min_order: minOrder || 0,
        max_uses: maxUses || null,
        expires_at: expiresAt || null,
      }),
    });
    if (res.ok) { resetForm(); fetchPromos(); }
    else { const d = await res.json(); toast.error(d.error || t.promo_errorSaving); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.promo_deleteConfirm)) return;
    await fetch('/api/tenant/promotions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchPromos();
  };

  const toggleActive = async (promo: Promotion) => {
    const { getSupabaseBrowser } = await import('@/lib/supabase/browser');
    const supabase = getSupabaseBrowser();
    await supabase
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id);
    fetchPromos();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="w-7 h-7 text-amber-500" />
          <h1 className="dash-heading">{t.promo_title}</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          {t.promo_newPromotion}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_code}</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="BIENVENIDO20"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_description}</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="20% descuento en tu primer pedido"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_discountType}</label>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              >
                <option value="percentage">{t.promo_percentage}</option>
                <option value="fixed">{t.promo_fixedAmount}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_value}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '20' : '5.00'}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_minOrder}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minOrder}
                onChange={e => setMinOrder(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_maxUses}</label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder={t.promo_unlimited}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.promo_expiresAt}</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.promo_createPromotion}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition"
            >
              {t.promo_cancel}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{t.promo_noPromos}</p>
          <p className="text-sm mt-1">{t.promo_noPromosDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => (
            <div key={p.id} className={`flex items-center justify-between bg-white border rounded-xl p-4 transition ${p.is_active ? 'border-gray-200' : 'border-gray-200/50 opacity-60'}`}>
              <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 text-amber-400 font-mono font-bold px-3 py-1 rounded-lg text-sm">
                  {p.code}
                </div>
                <div>
                  <div className="text-gray-900 font-medium">
                    {p.discount_type === 'percentage' ? `${p.discount_value}%` : `$${Number(p.discount_value).toFixed(2)}`}
                    {' '}{t.promo_discount}
                  </div>
                  {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                    {p.min_order > 0 && <span>Min: ${Number(p.min_order).toFixed(2)}</span>}
                    {p.max_uses && <span>{t.promo_uses} {p.current_uses}/{p.max_uses}</span>}
                    {p.expires_at && <span>{t.promo_expires} {new Date(p.expires_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(p)} title={p.is_active ? t.promo_deactivate : t.promo_activate}>
                  {p.is_active
                    ? <ToggleRight className="w-6 h-6 text-green-500" />
                    : <ToggleLeft className="w-6 h-6 text-gray-500" />}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-gray-500 hover:text-red-400 transition">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
