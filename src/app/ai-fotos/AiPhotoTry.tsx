'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Alert, Spinner } from '@/components/landing-v2/auth-bits';

export type AiPhotoExample = { src: string; name: string; alt: string };

export type AiPhotoTryText = {
  title: string;
  lead: string;
  label: string;
  placeholder: string;
  create: string;
  creating: string;
  exampleCap: string;
  resultCap: string;
  open: string;
  again: string;
  errEmpty: string;
  errLimit: string;
  errDefault: string;
  errNetwork: string;
  note: string;
};

/**
 * Prueba pública de /ai-fotos: crea una foto desde el nombre del plato con la
 * misma API de siempre (POST /api/ai/generate, límite por IP sin cuenta).
 * Por defecto muestra 2 fotos creadas con "Generar con IA" del panel
 * (public/landing/v2/ai-example-*: copiadas de product-images/<user>/ai-*.webp,
 * ruta que solo escribe /api/ai/generate-image). El recuadro vacío solo aparece
 * mientras se genera.
 * Grilla con áreas: escritorio = título + formulario | fotos;
 * celular = título → fotos → formulario.
 */
export function AiPhotoTry({ t, examples, headingId }: { t: AiPhotoTryText; examples: AiPhotoExample[]; headingId: string }) {
  const [dish, setDish] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = dish.trim();
    if (!name) { setErr(t.errEmpty); return; }
    setLoading(true); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: name, cuisine: 'General', style: 'bright_airy' }),
      });
      const data: unknown = await res.json().catch(() => null);
      const url = data && typeof data === 'object' ? (data as { url?: unknown }).url : undefined;
      if (res.ok && typeof url === 'string' && url) {
        setResult({ url, name });
      } else {
        setErr(res.status === 429 ? t.errLimit : t.errDefault);
      }
    } catch {
      setErr(t.errNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="try">
      <div className="try-head">
        <h2 id={headingId} className="h-a">{t.title}</h2>
        <p className="lead">{t.lead}</p>
      </div>

      <div className="try-shots" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="tile try-wait">
            <div>
              <Spinner />
              <p>{t.creating}</p>
            </div>
          </div>
        ) : result ? (
          <figure className="try-fig one">
            <div className="tile try-img">
              <Image src={result.url} alt={result.name} fill unoptimized sizes="(max-width: 1100px) 100vw, 680px" />
            </div>
            <figcaption>
              <b>{result.name}</b>
              <span>{t.resultCap}</span>
              <a className="tlink" href={result.url} target="_blank" rel="noopener noreferrer">{t.open}</a>
            </figcaption>
          </figure>
        ) : (
          <div className="try-pair">
            {examples.map((ex) => (
              <figure key={ex.src} className="try-fig">
                <div className="tile try-img">
                  <Image src={ex.src} alt={ex.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 340px" />
                </div>
                <figcaption>
                  <b>{ex.name}</b>
                  <span>{t.exampleCap}</span>
                </figcaption>
              </figure>
            ))}
            <p className="try-pair-cap">{t.exampleCap}</p>
          </div>
        )}
      </div>

      <form className="form try-form" onSubmit={run}>
        <div className="fld">
          <label htmlFor="ai-dish">{t.label}</label>
          <input id="ai-dish" className="inp" type="text" maxLength={120} autoComplete="off"
            value={dish} onChange={(e) => setDish(e.target.value)} placeholder={t.placeholder} />
        </div>
        {err && <Alert>{err}</Alert>}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? (<><Spinner />{t.creating}</>) : result ? t.again : t.create}
        </button>
        <p className="hint">{t.note}</p>
      </form>
    </div>
  );
}
