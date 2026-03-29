'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Mail, ChevronDown, ChevronUp, Send,
  Loader2, CheckCircle, AlertCircle, ArrowRight, Zap,
  BookOpen, HelpCircle, Shield, Clock,
} from 'lucide-react';

const FAQS = [
  {
    q: '¿Cómo creo mi primer menú?',
    a: 'Ve a tu dashboard en menius.app/app y haz clic en "Agregar categoría" y luego en "Agregar producto". También puedes importar todo tu menú automáticamente desde una foto con nuestra función de IA. ¡Es muy rápido!',
  },
  {
    q: '¿Cómo genero el código QR para mis mesas?',
    a: 'En tu dashboard ve a "Mesas" → selecciona una mesa → haz clic en "Ver QR". Puedes descargarlo en PDF e imprimirlo directamente.',
  },
  {
    q: '¿Qué pasa cuando termina mi periodo de prueba?',
    a: 'Tu cuenta pasa automáticamente al plan gratuito para siempre. Tu menú digital seguirá funcionando con hasta 5 mesas y 50 pedidos por mes. No se requiere tarjeta de crédito.',
  },
  {
    q: '¿Puedo tener delivery y pickup con el plan gratuito?',
    a: 'El plan gratuito incluye órdenes de dine-in (en restaurante). Para habilitar pickup y delivery necesitas el plan Starter ($39/mes). Puedes comparar planes en menius.app/pricing.',
  },
  {
    q: '¿Cómo agrego fotos a mis productos?',
    a: 'Edita cualquier producto en tu dashboard → haz clic en "Cambiar foto" → sube desde tu computadora o usa "Generar con IA" para que MENIUS cree una foto automáticamente basada en el nombre de tu platillo.',
  },
  {
    q: '¿Mis datos y menú están seguros?',
    a: 'Sí, usamos Supabase con cifrado de extremo a extremo. Tus datos nunca se comparten con terceros. Puedes exportar o eliminar tu cuenta en cualquier momento desde Configuración.',
  },
  {
    q: '¿Cómo cambio el idioma de mi menú?',
    a: 'En tu dashboard ve a "Configuración" → "Idioma". Puedes tener tu menú en español o inglés, y también activar la detección automática por ubicación del cliente.',
  },
  {
    q: '¿MENIUS tiene app móvil para recibir pedidos?',
    a: 'El panel de pedidos está optimizado para funcionar desde el navegador en cualquier dispositivo, incluyendo tablets y teléfonos. Agrega menius.app/app a tu pantalla de inicio para una experiencia tipo app. Una app nativa está en el roadmap.',
  },
];

const GUIDES = [
  { icon: '🚀', title: 'Primeros pasos', desc: 'Crea tu menú en menos de 10 minutos', href: 'https://menius.app/app' },
  { icon: '📸', title: 'Agregar fotos con IA', desc: 'Genera imágenes automáticas de tus platillos', href: 'https://menius.app/app' },
  { icon: '📦', title: 'Importar menú desde foto', desc: 'Sube una foto de tu carta y MENIUS la digitaliza', href: 'https://menius.app/app' },
  { icon: '📊', title: 'Ver analytics', desc: 'Descubre tus platillos más populares', href: 'https://menius.app/app' },
];

export default function PublicSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [sendMsg, setSendMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSendState('loading');
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (data.ok) {
        setSendState('done');
        setSendMsg('¡Mensaje recibido! Te respondemos en menos de 24 horas.');
        setName(''); setEmail(''); setMessage('');
      } else {
        setSendState('error');
        setSendMsg(data.error ?? 'Error al enviar. Por favor intenta por WhatsApp o email directo.');
      }
    } catch {
      setSendState('error');
      setSendMsg('Error de red. Escríbenos a soporte@menius.app directamente.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">

      {/* Nav */}
      <nav className="border-b border-white/[0.06] sticky top-0 bg-[#050505]/90 backdrop-blur-xl z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            MENIUS<span className="text-purple-500">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/app" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
              Mi dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-6 tracking-wide uppercase">
            <HelpCircle className="w-3.5 h-3.5" /> Centro de ayuda
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            ¿En qué te podemos<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
              ayudar hoy?
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Respondemos en menos de 24 horas. También puedes chatear con nosotros en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <a
              href="#contact"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" /> Enviar mensaje
            </a>
            <a
              href="mailto:soporte@menius.app"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium hover:bg-white/[0.08] transition-colors"
            >
              <Mail className="w-4 h-4" /> soporte@menius.app
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 space-y-20">

        {/* Quick help cards */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Canales de atención</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-purple-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Chat en vivo</h3>
              <p className="text-sm text-gray-500 mb-4">Habla con el equipo en tiempo real desde el dashboard.</p>
              <a href="/app" className="text-sm text-purple-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Ir al dashboard <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-blue-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Email</h3>
              <p className="text-sm text-gray-500 mb-4">Enviamos respuesta en menos de 24 horas hábiles.</p>
              <a href="mailto:soporte@menius.app" className="text-sm text-blue-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                soporte@menius.app <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Horario</h3>
              <p className="text-sm text-gray-500 mb-4">Lunes a viernes, 9:00 am – 7:00 pm (GMT-5). Fines de semana por email.</p>
              <span className="text-sm text-emerald-400 font-medium">Estamos disponibles 🟢</span>
            </div>
          </div>
        </section>

        {/* Guides */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Guías rápidas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {GUIDES.map(g => (
              <a
                key={g.title}
                href={g.href}
                className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 hover:border-amber-500/30 transition-colors group"
              >
                <div className="text-2xl mb-3">{g.icon}</div>
                <p className="text-sm font-semibold text-white mb-1 group-hover:text-amber-400 transition-colors">{g.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-white hover:text-purple-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-4" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 border-t border-white/[0.06]">
                    <p className="text-sm text-gray-400 leading-relaxed pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section id="contact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">Contacta al equipo</h2>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                ¿Necesitas ayuda con tu cuenta, un bug o tienes una idea para mejorar MENIUS? Escríbenos y te respondemos en menos de 24 horas.
              </p>
              <div className="space-y-4 text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Tu información es privada y nunca se comparte.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Respondemos en menos de 24 horas hábiles.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Para urgencias, usa el chat desde tu dashboard.</span>
                </div>
              </div>
            </div>
            <div>
              {sendState === 'done' ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[#0a0a0a] rounded-2xl border border-emerald-500/20 text-center px-8">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">¡Mensaje enviado!</h3>
                  <p className="text-gray-400 text-sm">{sendMsg}</p>
                  <button onClick={() => setSendState('idle')} className="mt-6 text-sm text-purple-400 hover:text-purple-300">Enviar otro mensaje</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tu nombre</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="María García"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tu email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="maria@mirestaurante.com"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">¿En qué te podemos ayudar?</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      rows={5}
                      placeholder="Describe tu duda o problema lo mejor que puedas…"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 transition-colors resize-none"
                    />
                  </div>
                  {sendState === 'error' && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {sendMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={sendState === 'loading'}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                  >
                    {sendState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sendState === 'loading' ? 'Enviando…' : 'Enviar mensaje'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-white tracking-tight">
            MENIUS<span className="text-purple-500">.</span>
          </Link>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} MENIUS · Menús digitales para restaurantes</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a href="/app" className="hover:text-white transition-colors">Dashboard</a>
            <a href="mailto:soporte@menius.app" className="hover:text-white transition-colors">soporte@menius.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
