'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, MessageSquare, Send, Loader2,
  ExternalLink, CheckCircle, AlertCircle, Users, Clock,
  Zap,
} from 'lucide-react';

interface SendState {
  status: 'idle' | 'loading' | 'done' | 'error';
  msg?: string;
}

const RETENTION_USERS = [
  {
    key: 'rosario',
    type: 'trial_ending' as const,
    to: 'ros.june252823@gmail.com',
    ownerName: 'Rosario Quispe Villaneva',
    restaurantName: 'EL SABOR',
    restaurantSlug: 'el-sabor',
    trialEndDate: '31 de marzo de 2026',
    daysLeft: 2,
    badge: '⚠️ Trial vence en 2 días',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Email de transición: le explica que pasa a Free Forever con lo que incluye y la opción de quedarse en Starter.',
  },
  {
    key: 'noelia',
    type: 'engagement' as const,
    to: 'noelia700@outlook.com',
    ownerName: 'Noelia Larios',
    restaurantName: 'Hot dogs perrones',
    restaurantSlug: 'hot-dogs-perrones',
    trialEndDate: '10 de abril de 2026',
    daysLeft: 12,
    badge: '🟢 Trial activo — 12 días',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Email de engagement: tips de funciones que quizás no ha explorado + link a su menú público.',
  },
];

export default function AdminSupportPage() {
  const [sendStates, setSendStates] = useState<Record<string, SendState>>({});
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [customSend, setCustomSend] = useState<SendState>({ status: 'idle' });

  const sendRetentionEmail = async (user: typeof RETENTION_USERS[0]) => {
    setSendStates(prev => ({ ...prev, [user.key]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/admin/retention-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: user.type,
          to: user.to,
          ownerName: user.ownerName,
          restaurantName: user.restaurantName,
          restaurantSlug: user.restaurantSlug,
          trialEndDate: user.trialEndDate,
          daysLeft: user.daysLeft,
        }),
      });
      const data = await res.json();
      setSendStates(prev => ({
        ...prev,
        [user.key]: {
          status: data.ok ? 'done' : 'error',
          msg: data.ok ? `✓ Enviado a ${user.to}` : (data.error ?? 'Error al enviar'),
        },
      }));
    } catch (e) {
      setSendStates(prev => ({ ...prev, [user.key]: { status: 'error', msg: String(e) } }));
    }
  };

  const sendCustomEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setCustomSend({ status: 'loading' });
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody }),
      });
      const data = await res.json();
      setCustomSend({ status: data.ok ? 'done' : 'error', msg: data.ok ? `✓ Enviado a ${composeTo}` : (data.error ?? 'Error') });
      if (data.ok) { setComposeTo(''); setComposeSubject(''); setComposeBody(''); }
    } catch (e) {
      setCustomSend({ status: 'error', msg: String(e) });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-400" /> Centro de Soporte
            </h1>
            <p className="text-sm text-gray-500 mt-1">Emails de retención y comunicación con usuarios</p>
          </div>
        </div>

        {/* Retention emails */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Emails de seguimiento — usuarios activos</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {RETENTION_USERS.map(user => {
              const state = sendStates[user.key] ?? { status: 'idle' };
              return (
                <div key={user.key} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-white font-semibold">{user.restaurantName}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{user.ownerName} · {user.to}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0 ${user.badgeColor}`}>
                      {user.badge}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{user.description}</p>

                  {state.status === 'done' && (
                    <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      {state.msg}
                    </div>
                  )}
                  {state.status === 'error' && (
                    <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {state.msg}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendRetentionEmail(user)}
                      disabled={state.status === 'loading' || state.status === 'done'}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {state.status === 'loading' ? 'Enviando…' : state.status === 'done' ? '✓ Enviado' : 'Enviar email'}
                    </button>
                    <a
                      href={`https://menius.app/${user.restaurantSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver menú
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Custom email composer */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" /> Enviar email personalizado
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Para (email)</label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={e => setComposeTo(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Asunto</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Ej: Seguimiento de tu cuenta en MENIUS"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Mensaje</label>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    rows={6}
                    placeholder="Hola [nombre],&#10;&#10;Vimos que te registraste recientemente en MENIUS…"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                </div>
                {customSend.status !== 'idle' && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${customSend.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : customSend.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}`}>
                    {customSend.status === 'done' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : customSend.status === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                    {customSend.msg ?? 'Enviando…'}
                  </div>
                )}
                <button
                  onClick={sendCustomEmail}
                  disabled={customSend.status === 'loading' || !composeTo || !composeSubject || !composeBody}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {customSend.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {customSend.status === 'loading' ? 'Enviando…' : 'Enviar email'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Accesos rápidos</h3>
              <div className="space-y-1">
                <Link href="/admin/users" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-sm text-gray-400 hover:text-white">
                  <Users className="w-4 h-4 text-indigo-400" /> Ver todos los usuarios
                </Link>
                <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-sm text-gray-400 hover:text-white">
                  <Mail className="w-4 h-4 text-blue-400" /> Panel de Resend <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
                <a href="https://app.crisp.chat" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-sm text-gray-400 hover:text-white">
                  <MessageSquare className="w-4 h-4 text-emerald-400" /> Crisp Live Chat <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Diagnóstico de emails
              </h3>
              <ol className="text-xs text-amber-400/70 space-y-1.5 list-decimal list-inside">
                <li><strong className="text-amber-400">ADMIN_EMAIL</strong> en Vercel env vars</li>
                <li><strong className="text-amber-400">RESEND_API_KEY</strong> activa y válida</li>
                <li>Dominio <code className="text-amber-300">menius.app</code> verificado en Resend</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
