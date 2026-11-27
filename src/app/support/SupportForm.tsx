'use client';

import { useState } from 'react';
import { Alert, Spinner } from '@/components/landing-v2/auth-bits';
import { SUPPORT_CONTACT } from '@/lib/support-contact';

export type SupportFormText = {
  title: string;
  topic: string;
  topicNone: string;
  topics: { id: string; label: string }[];
  name: string;
  namePh: string;
  email: string;
  emailPh: string;
  message: string;
  messagePh: string;
  send: string;
  sending: string;
  sentTitle: string;
  sentMsg: string;
  again: string;
  errTooMany: string;
  errDefault: string;
  errNetwork: string;
  optional: string;
};

/**
 * Formulario de contacto de /support. Misma API de siempre
 * (POST /api/support/contact con name, email y message; el tema va como
 * prefijo "[Tema]" del mensaje).
 */
export function SupportForm({ t }: { t: SupportFormText }) {
  const [topic, setTopic] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setState('loading');
    const label = t.topics.find((c) => c.id === topic)?.label ?? '';
    const full = label ? `[${label}] ${message}` : message;
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: full }),
      });
      const data: unknown = await res.json().catch(() => null);
      const ok = !!data && typeof data === 'object' && (data as { ok?: unknown }).ok === true;
      if (ok) {
        setState('done');
        setName(''); setEmail(''); setMessage(''); setTopic('');
        return;
      }
      setState('error');
      setErr(res.status === 429 ? t.errTooMany : t.errDefault);
    } catch {
      setState('error');
      setErr(t.errNetwork);
    }
  };

  if (state === 'done') {
    return (
      <div className="auth-card req-card sent" role="status">
        <h2>{t.sentTitle}</h2>
        <p>{t.sentMsg}</p>
        <button type="button" className="tlink sent-again" onClick={() => setState('idle')}>
          {t.again}
        </button>
      </div>
    );
  }

  return (
    <form className="auth-card req-card" onSubmit={submit} aria-label={t.title}>
      <div className="form">
        <div className="fld">
          <label htmlFor="sup-topic">
            {t.topic} <span className="opt">({t.optional})</span>
          </label>
          <select id="sup-topic" className="sel" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">{t.topicNone}</option>
            {t.topics.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="two">
          <div className="fld">
            <label htmlFor="sup-name">{t.name}</label>
            <input id="sup-name" className="inp" type="text" autoComplete="name" required maxLength={200}
              value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} />
          </div>
          <div className="fld">
            <label htmlFor="sup-email">{t.email}</label>
            <input id="sup-email" className="inp" type="email" autoComplete="email" inputMode="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="sup-msg">{t.message}</label>
          <textarea id="sup-msg" className="txt" rows={5} required maxLength={4800}
            value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.messagePh} />
        </div>
        {state === 'error' && (
          <Alert>
            {err}{' '}
            <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
          </Alert>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={state === 'loading'}>
          {state === 'loading' ? (<><Spinner />{t.sending}</>) : t.send}
        </button>
      </div>
    </form>
  );
}
