'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Mail, ChevronDown, ChevronUp, Send,
  Loader2, CheckCircle, AlertCircle, ArrowRight, Zap,
  BookOpen, HelpCircle, Shield, Clock,
} from 'lucide-react';

type Locale = 'es' | 'en';

const FAQS_ES = [
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

const FAQS_EN = [
  {
    q: 'How do I create my first menu?',
    a: 'Go to your dashboard at menius.app/app and click "Add category" then "Add product". You can also import your entire menu automatically from a photo using our AI feature. It\'s very fast!',
  },
  {
    q: 'How do I generate a QR code for my tables?',
    a: 'In your dashboard go to "Tables" → select a table → click "View QR". You can download it as a PDF and print it directly.',
  },
  {
    q: 'What happens when my trial period ends?',
    a: 'Your account automatically moves to the free plan forever. Your digital menu will keep working with up to 5 tables and 50 orders per month. No credit card required.',
  },
  {
    q: 'Can I have delivery and pickup on the free plan?',
    a: 'The free plan includes dine-in orders. To enable pickup and delivery you need the Starter plan ($39/mo). You can compare plans at menius.app/pricing.',
  },
  {
    q: 'How do I add photos to my products?',
    a: 'Edit any product in your dashboard → click "Change photo" → upload from your computer or use "Generate with AI" to let MENIUS automatically create a photo based on the dish name.',
  },
  {
    q: 'Are my data and menu secure?',
    a: 'Yes, we use Supabase with end-to-end encryption. Your data is never shared with third parties. You can export or delete your account at any time from Settings.',
  },
  {
    q: 'How do I change my menu language?',
    a: 'In your dashboard go to "Settings" → "Language". You can have your menu in Spanish or English, and also enable automatic detection based on customer location.',
  },
  {
    q: 'Does MENIUS have a mobile app for receiving orders?',
    a: 'The orders panel is optimized to work from the browser on any device, including tablets and phones. Add menius.app/app to your home screen for an app-like experience. A native app is on the roadmap.',
  },
];

const GUIDES_ES = [
  { icon: '🚀', title: 'Primeros pasos', desc: 'Crea tu menú en menos de 10 minutos', href: 'https://menius.app/app' },
  { icon: '📸', title: 'Agregar fotos con IA', desc: 'Genera imágenes automáticas de tus platillos', href: 'https://menius.app/app' },
  { icon: '📦', title: 'Importar menú desde foto', desc: 'Sube una foto de tu carta y MENIUS la digitaliza', href: 'https://menius.app/app' },
  { icon: '📊', title: 'Ver analytics', desc: 'Descubre tus platillos más populares', href: 'https://menius.app/app' },
];

const GUIDES_EN = [
  { icon: '🚀', title: 'Getting started', desc: 'Create your menu in less than 10 minutes', href: 'https://menius.app/app' },
  { icon: '📸', title: 'Add photos with AI', desc: 'Auto-generate images for your dishes', href: 'https://menius.app/app' },
  { icon: '📦', title: 'Import menu from photo', desc: 'Upload a photo of your menu and MENIUS digitizes it', href: 'https://menius.app/app' },
  { icon: '📊', title: 'View analytics', desc: 'Discover your most popular dishes', href: 'https://menius.app/app' },
];

const T = {
  es: {
    helpBadge: 'Centro de ayuda',
    heroTitle1: '¿En qué te podemos',
    heroTitle2: 'ayudar hoy?',
    heroSub: 'Respondemos en menos de 24 horas. También puedes chatear con nosotros en tiempo real.',
    sendMsg: 'Enviar mensaje',
    channelsTitle: 'Canales de atención',
    chatTitle: 'Chat en vivo',
    chatDesc: 'Habla con el equipo en tiempo real desde el dashboard.',
    chatCta: 'Ir al dashboard',
    emailTitle: 'Email',
    emailDesc: 'Enviamos respuesta en menos de 24 horas hábiles.',
    scheduleTitle: 'Horario',
    scheduleDesc: 'Lunes a viernes, 9:00 am – 7:00 pm (GMT-5). Fines de semana por email.',
    available: 'Estamos disponibles 🟢',
    guidesTitle: 'Guías rápidas',
    faqTitle: 'Preguntas frecuentes',
    contactTeam: 'Contacta al equipo',
    contactDesc: '¿Necesitas ayuda con tu cuenta, un bug o tienes una idea para mejorar MENIUS? Escríbenos y te respondemos en menos de 24 horas.',
    privacy: 'Tu información es privada y nunca se comparte.',
    responseTime: 'Respondemos en menos de 24 horas hábiles.',
    urgency: 'Para urgencias, usa el chat desde tu dashboard.',
    namePlaceholder: 'María García',
    nameLabel: 'Tu nombre',
    emailLabel: 'Tu email',
    emailPlaceholder: 'maria@mirestaurante.com',
    messageLabel: '¿En qué te podemos ayudar?',
    messagePlaceholder: 'Describe tu duda o problema lo mejor que puedas…',
    sending: 'Enviando…',
    send: 'Enviar mensaje',
    successTitle: '¡Mensaje enviado!',
    successMsg: '¡Mensaje recibido! Te respondemos en menos de 24 horas.',
    anotherMsg: 'Enviar otro mensaje',
    errorDefault: 'Error al enviar. Por favor intenta por WhatsApp o email directo.',
    errorNetwork: 'Error de red. Escríbenos a soporte@menius.app directamente.',
    footerCopy: 'Menús digitales para restaurantes',
    myDashboard: 'Mi dashboard',
  },
  en: {
    helpBadge: 'Help Center',
    heroTitle1: 'How can we',
    heroTitle2: 'help you today?',
    heroSub: 'We respond in under 24 hours. You can also chat with us in real time.',
    sendMsg: 'Send a message',
    channelsTitle: 'Support channels',
    chatTitle: 'Live chat',
    chatDesc: 'Talk to the team in real time from the dashboard.',
    chatCta: 'Go to dashboard',
    emailTitle: 'Email',
    emailDesc: 'We reply within 24 business hours.',
    scheduleTitle: 'Hours',
    scheduleDesc: 'Monday–Friday, 9:00 am – 7:00 pm (GMT-5). Weekends by email.',
    available: 'We are available 🟢',
    guidesTitle: 'Quick guides',
    faqTitle: 'Frequently asked questions',
    contactTeam: 'Contact the team',
    contactDesc: 'Need help with your account, found a bug, or have an idea to improve MENIUS? Write to us and we\'ll respond in under 24 hours.',
    privacy: 'Your information is private and never shared.',
    responseTime: 'We respond in under 24 business hours.',
    urgency: 'For urgent issues, use the chat from your dashboard.',
    namePlaceholder: 'John Smith',
    nameLabel: 'Your name',
    emailLabel: 'Your email',
    emailPlaceholder: 'john@myrestaurant.com',
    messageLabel: 'How can we help you?',
    messagePlaceholder: 'Describe your question or issue as clearly as you can…',
    sending: 'Sending…',
    send: 'Send message',
    successTitle: 'Message sent!',
    successMsg: 'Message received! We\'ll get back to you within 24 hours.',
    anotherMsg: 'Send another message',
    errorDefault: 'Error sending. Please try via email directly.',
    errorNetwork: 'Network error. Email us at soporte@menius.app directly.',
    footerCopy: 'Digital menus for restaurants',
    myDashboard: 'My dashboard',
  },
} as const;

export default function PublicSupportPage({ locale = 'es' }: { locale?: Locale }) {
  const t = T[locale];
  const FAQS = locale === 'en' ? FAQS_EN : FAQS_ES;
  const GUIDES = locale === 'en' ? GUIDES_EN : GUIDES_ES;

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
        setSendMsg(t.successMsg);
        setName(''); setEmail(''); setMessage('');
      } else {
        setSendState('error');
        setSendMsg(data.error ?? t.errorDefault);
      }
    } catch {
      setSendState('error');
      setSendMsg(t.errorNetwork);
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
              {t.myDashboard} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-6 tracking-wide uppercase">
            <HelpCircle className="w-3.5 h-3.5" /> {t.helpBadge}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            {t.heroTitle1}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
              {t.heroTitle2}
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            {t.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <a
              href="#contact"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" /> {t.sendMsg}
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

        {/* Support channels */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">{t.channelsTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-purple-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t.chatTitle}</h3>
              <p className="text-sm text-gray-500 mb-4">{t.chatDesc}</p>
              <a href="/app" className="text-sm text-purple-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                {t.chatCta} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-blue-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t.emailTitle}</h3>
              <p className="text-sm text-gray-500 mb-4">{t.emailDesc}</p>
              <a href="mailto:soporte@menius.app" className="text-sm text-blue-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                soporte@menius.app <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t.scheduleTitle}</h3>
              <p className="text-sm text-gray-500 mb-4">{t.scheduleDesc}</p>
              <span className="text-sm text-emerald-400 font-medium">{t.available}</span>
            </div>
          </div>
        </section>

        {/* Guides */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">{t.guidesTitle}</h2>
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
            <h2 className="text-sm font-bold text-white">{t.faqTitle}</h2>
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
                <h2 className="text-sm font-bold text-white">{t.contactTeam}</h2>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {t.contactDesc}
              </p>
              <div className="space-y-4 text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{t.privacy}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{t.responseTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{t.urgency}</span>
                </div>
              </div>
            </div>
            <div>
              {sendState === 'done' ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[#0a0a0a] rounded-2xl border border-emerald-500/20 text-center px-8">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">{t.successTitle}</h3>
                  <p className="text-gray-400 text-sm">{sendMsg}</p>
                  <button onClick={() => setSendState('idle')} className="mt-6 text-sm text-purple-400 hover:text-purple-300">{t.anotherMsg}</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{t.nameLabel}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder={t.namePlaceholder}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{t.emailLabel}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder={t.emailPlaceholder}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t.messageLabel}</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      rows={5}
                      placeholder={t.messagePlaceholder}
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
                    {sendState === 'loading' ? t.sending : t.send}
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
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} MENIUS · {t.footerCopy}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a href="/app" className="hover:text-white transition-colors">Dashboard</a>
            <a href="mailto:soporte@menius.app" className="hover:text-white transition-colors">soporte@menius.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
