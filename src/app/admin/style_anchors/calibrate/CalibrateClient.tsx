'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MasterAnchor } from '@/lib/anchors/master-anchors';

type CandidatesMap = Record<string, string[]>;
type FailureList = Array<{ slug: string; reason: string }>;

export function CalibrateClient({ initialAnchors }: { initialAnchors: MasterAnchor[] }) {
  const [anchors, setAnchors] = useState<MasterAnchor[]>(initialAnchors);
  const [candidates, setCandidates] = useState<CandidatesMap>({});
  const [failures, setFailures] = useState<FailureList>([]);
  const [generating, setGenerating] = useState(false);
  const [regeneratingSlug, setRegeneratingSlug] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const missingSlugs = anchors.filter((a) => !a.anchor_url).map((a) => a.category_slug);
  const totalToGenerate = missingSlugs.length;

  async function callGenerate(slugs: string[]) {
    const r = await fetch('/api/admin/master-anchors/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      throw new Error(errBody.error ?? r.statusText);
    }
    return r.json() as Promise<{ candidates?: CandidatesMap; failures?: FailureList }>;
  }

  async function generateAll() {
    if (totalToGenerate === 0) {
      if (!confirm('All categories already have anchors. Regenerate ALL anyway? This will take ~5 min and cost ~$2.70.')) return;
    }
    setError(null);
    setGenerating(true);
    setCandidates({});
    setFailures([]);
    try {
      const slugsToSend = totalToGenerate > 0 ? missingSlugs : anchors.map((a) => a.category_slug);
      const data = await callGenerate(slugsToSend);
      const cands = data.candidates ?? {};
      const fails = data.failures ?? [];
      setCandidates(cands);
      setFailures(fails);
      const totalCandidates = Object.values(cands).reduce((sum, arr) => sum + arr.length, 0);
      if (totalCandidates === 0) {
        setError(
          fails.length > 0
            ? `0 images generated. ${fails.length} failures — see details below.`
            : '0 images generated and no failures reported. The request may have timed out on Vercel before completing. Check Vercel function logs.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateOne(slug: string) {
    setError(null);
    setRegeneratingSlug(slug);
    try {
      const data = await callGenerate([slug]);
      const newCands = data.candidates?.[slug] ?? [];
      const newFails = (data.failures ?? []).filter((f) => f.slug === slug);
      setCandidates((prev) => ({ ...prev, [slug]: newCands }));
      // Replace existing failures for this slug with the new ones
      setFailures((prev) => [...prev.filter((f) => f.slug !== slug), ...newFails]);
      if (newCands.length === 0) {
        setError(
          newFails.length > 0
            ? `0 images generated for ${slug}. ${newFails.length} failure(s).`
            : `0 images generated for ${slug} and no failures reported.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegeneratingSlug(null);
    }
  }

  async function pickCandidate(slug: string, url: string) {
    const anchor = anchors.find((a) => a.category_slug === slug);
    if (!anchor) return;
    setSavingSlug(slug);
    try {
      const r = await fetch('/api/admin/master-anchors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: anchor.id, anchor_url: url }),
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody.error ?? r.statusText);
      }
      const { anchor: updated } = await r.json();
      setAnchors((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      // Remove this slug from candidates so the row collapses
      setCandidates((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingSlug(null);
    }
  }

  function regenerateButtonClasses(slug: string, variant: 'compact' | 'full') {
    const base = variant === 'compact'
      ? 'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-wait'
      : 'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-wait';
    return `${base} border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 ${regeneratingSlug === slug || generating ? 'opacity-50 cursor-wait' : ''}`;
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-gray-400">
          {anchors.length} categories · {totalToGenerate} missing
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/style_anchors"
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-gray-400 text-sm font-medium hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            ← Back to list
          </Link>
          <button
            type="button"
            onClick={generateAll}
            disabled={generating || regeneratingSlug !== null}
            className="px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating… (3-5 min)' : totalToGenerate > 0 ? `Generate ${totalToGenerate} missing` : 'Regenerate all'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {failures.length > 0 && (
        <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          <p className="font-semibold mb-1">Some variants failed ({failures.length}):</p>
          <ul className="text-xs space-y-0.5">
            {failures.slice(0, 8).map((f, i) => (
              <li key={i}>• {f.slug}: {f.reason}</li>
            ))}
            {failures.length > 8 && <li>+ {failures.length - 8} more</li>}
          </ul>
        </div>
      )}

      <div className="space-y-8">
        {anchors.map((a) => {
          const cands = candidates[a.category_slug] ?? [];
          const isRegenerating = regeneratingSlug === a.category_slug;

          if (cands.length === 0 && a.anchor_url) {
            return (
              <section
                key={a.id}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-5 flex items-center gap-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.anchor_url}
                  alt={a.display_name}
                  className="w-24 h-18 rounded-lg object-cover ring-1 ring-white/10"
                  style={{ aspectRatio: '4/3' }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-emerald-300">{a.display_name}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">Configured · {a.category_slug}</p>
                </div>
                <button
                  type="button"
                  disabled={isRegenerating || generating}
                  onClick={() => regenerateOne(a.category_slug)}
                  className={regenerateButtonClasses(a.category_slug, 'compact')}
                >
                  {isRegenerating ? 'Generating… (~30s)' : 'Regenerate 3'}
                </button>
              </section>
            );
          }
          if (cands.length === 0) {
            return (
              <section
                key={a.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 flex items-center gap-5"
              >
                <div className="w-24 h-18 rounded-lg bg-gray-900 flex items-center justify-center text-xs text-gray-600" style={{ aspectRatio: '4/3' }}>
                  Pending
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold">{a.display_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">No anchor yet · {a.category_slug}</p>
                </div>
                <button
                  type="button"
                  disabled={isRegenerating || generating}
                  onClick={() => regenerateOne(a.category_slug)}
                  className={regenerateButtonClasses(a.category_slug, 'compact')}
                >
                  {isRegenerating ? 'Generating… (~30s)' : 'Generate 3'}
                </button>
              </section>
            );
          }
          return (
            <section key={a.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="text-base font-semibold">{a.display_name}</h3>
                  <code className="text-[10px] text-gray-600 font-mono">{a.category_slug}</code>
                </div>
                <button
                  type="button"
                  disabled={isRegenerating || generating}
                  onClick={() => regenerateOne(a.category_slug)}
                  className={regenerateButtonClasses(a.category_slug, 'full')}
                >
                  {isRegenerating ? 'Regenerating… (~30s)' : 'Regenerate 3'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cands.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    disabled={savingSlug === a.category_slug || isRegenerating}
                    onClick={() => pickCandidate(a.category_slug, url)}
                    className="group relative rounded-xl overflow-hidden border-2 border-white/[0.06] hover:border-emerald-400/60 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    style={{ aspectRatio: '4/3' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${a.display_name} candidate ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-full bg-emerald-500 text-black text-xs font-bold">
                        {savingSlug === a.category_slug ? 'Saving…' : `Pick #${i + 1}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
