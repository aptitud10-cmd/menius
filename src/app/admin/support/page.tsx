'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, MessageSquare, Send, Loader2,
  ExternalLink, CheckCircle, AlertCircle, Clock, Users,
} from 'lucide-react';

interface ContactEntry {
  id: string;
  restaurant: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  created_at: string;
}

const MOCK_CONTACTS: ContactEntry[] = [];

export default function AdminSupportPage() {
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const sendManualEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody }),
      });
      const data = await res.json();
      setSendResult({ ok: data.ok, msg: data.ok ? 'Email enviado correctamente' : (data.error ?? 'Error al enviar') });
      if (data.ok) { setComposeTo(''); setComposeSubject(''); setComposeBody(''); }
    } catch (e) {
      setSendResult({ ok: false, msg: String(e) });
    }
    setSending(false);
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
            <p className="text-sm text-gray-500 mt-1">Comunícate con tus usuarios directamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Compose email */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" /> Enviar email a usuario
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

                {sendResult && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${sendResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {sendResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {sendResult.msg}
                  </div>
                )}

                <button
                  onClick={sendManualEmail}
                  disabled={sending || !composeTo || !composeSubject || !composeBody}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Enviando…' : 'Enviar email'}
                </button>
              </div>
            </div>

            {/* Contacts log placeholder */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" /> Historial de contactos
              </h2>
              {MOCK_CONTACTS.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aún no hay contactos registrados.</p>
                  <p className="text-xs text-gray-700 mt-1">Los mensajes de soporte aparecerán aquí cuando implementes el formulario de contacto.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_CONTACTS.map(c => (
                    <div key={c.id} className="border border-white/[0.06] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-white text-sm font-medium">{c.subject}</p>
                          <p className="text-gray-500 text-xs">{c.restaurant} · {c.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${c.status === 'open' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : c.status === 'answered' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-500 bg-white/[0.04] border-white/[0.08]'}`}>
                          {c.status === 'open' ? 'Abierto' : c.status === 'answered' ? 'Respondido' : 'Cerrado'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs line-clamp-2">{c.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: quick links and tips */}
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Accesos rápidos</h3>
              <div className="space-y-2">
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
                <AlertCircle className="w-4 h-4" /> Diagnóstico de emails
              </h3>
              <p className="text-xs text-amber-400/70 mb-3 leading-relaxed">
                Si no recibes notificaciones de nuevos registros, verifica:
              </p>
              <ol className="text-xs text-amber-400/70 space-y-1.5 list-decimal list-inside">
                <li><strong className="text-amber-400">ADMIN_EMAIL</strong> está configurada en Vercel con tu email</li>
                <li><strong className="text-amber-400">RESEND_API_KEY</strong> está activa y válida</li>
                <li>El dominio <code className="text-amber-300">menius.app</code> está verificado en Resend</li>
                <li>Revisa los logs de Vercel en el deployment más reciente</li>
              </ol>
              <Link href="/admin" className="inline-flex items-center gap-1.5 mt-3 text-xs text-amber-400 hover:text-amber-300">
                Probar email desde Admin <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white mb-2">Canal de soporte actual</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Tus usuarios actualmente pueden contactarte a través del chat Crisp integrado en el dashboard y por email a <strong className="text-gray-400">soporte@menius.app</strong>.
              </p>
              <p className="text-xs text-gray-600">
                Para tickets más avanzados considera integrar Linear, Notion o un formulario de contacto en la app.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
