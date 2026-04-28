'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MasterAnchor } from '@/lib/anchors/master-anchors';

export function MasterAnchorsClient({ initialAnchors }: { initialAnchors: MasterAnchor[] }) {
  const [anchors, setAnchors] = useState<MasterAnchor[]>(initialAnchors);
  const [editingAliasesFor, setEditingAliasesFor] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);

  async function clearAnchor(id: string) {
    if (!confirm('Clear this anchor image? It can be regenerated.')) return;
    setSaving(id);
    try {
      const r = await fetch('/api/admin/master-anchors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error((await r.json())?.error ?? r.statusText);
      setAnchors((prev) =>
        prev.map((a) => (a.id === id ? { ...a, anchor_url: null } : a)),
      );
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(null);
    }
  }

  async function saveAliases(id: string) {
    const aliases = aliasDraft
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (aliases.length === 0) {
      alert('Aliases cannot be empty.');
      return;
    }
    setSaving(id);
    try {
      const r = await fetch('/api/admin/master-anchors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aliases }),
      });
      if (!r.ok) throw new Error((await r.json())?.error ?? r.statusText);
      const { anchor } = await r.json();
      setAnchors((prev) => prev.map((a) => (a.id === id ? anchor : a)));
      setEditingAliasesFor(null);
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(null);
    }
  }

  const missingCount = anchors.filter((a) => !a.anchor_url).length;

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-gray-400">
          {anchors.length} categories ·{' '}
          <span className={missingCount > 0 ? 'text-orange-400' : 'text-emerald-400'}>
            {missingCount > 0 ? `${missingCount} missing anchor` : 'all configured'}
          </span>
        </div>
        <Link
          href="/admin/style_anchors/calibrate"
          className="px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition-colors"
        >
          Generate / recalibrate →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anchors.map((a) => {
          const editing = editingAliasesFor === a.id;
          return (
            <div
              key={a.id}
              className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
            >
              <div className="aspect-[4/3] bg-gray-900 relative">
                {a.anchor_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.anchor_url}
                    alt={a.display_name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                    No anchor yet
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold">{a.display_name}</h3>
                  <code className="text-[10px] text-gray-600 font-mono">{a.category_slug}</code>
                </div>

                {editing ? (
                  <div className="space-y-2 mb-4">
                    <textarea
                      value={aliasDraft}
                      onChange={(e) => setAliasDraft(e.target.value)}
                      rows={3}
                      placeholder="comma-separated, e.g.: omelette, omelet, tortilla francesa"
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving === a.id}
                        onClick={() => saveAliases(a.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAliasesFor(null)}
                        className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-400 text-xs font-semibold hover:bg-white/[0.04] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed line-clamp-2">
                    {a.aliases.join(', ')}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setAliasDraft(a.aliases.join(', '));
                        setEditingAliasesFor(a.id);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-400 text-xs font-medium hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      Edit aliases
                    </button>
                  )}
                  {a.anchor_url && (
                    <button
                      type="button"
                      disabled={saving === a.id}
                      onClick={() => clearAnchor(a.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 hover:border-red-500/40 transition-colors disabled:opacity-50"
                    >
                      Clear image
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
