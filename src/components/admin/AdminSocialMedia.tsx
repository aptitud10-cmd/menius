'use client';

import { useState } from 'react';
import { Sparkles, Copy, CheckCircle2, Loader2, Clock, Lightbulb, Image as ImageIcon, Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { value: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'bg-white/10' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
];

const POST_TYPES = [
  { value: 'case_study', label: 'Caso de éxito' },
  { value: 'feature', label: 'Destacar función' },
  { value: 'stats', label: 'Estadísticas' },
  { value: 'tips', label: 'Tips para restaurantes' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'trend', label: 'Tendencia industria' },
  { value: 'behind_scenes', label: 'Detrás de cámaras' },
];

interface GeneratedPost {
  caption: string;
  hashtags: string;
  imageIdea: string;
  bestTime: string;
  tip: string;
  hookVariant: string;
}

export function AdminSocialMedia() {
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('case_study');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setPost(null);
    try {
      const res = await fetch('/api/admin/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'social', campaignType: platform, audience: postType, customPrompt: customPrompt.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando post');
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando con IA');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const selectedPlatform = PLATFORMS.find(p => p.value === platform)!;

  return (
    <div className="space-y-6">
      {/* Platform selector */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-3">Red social de MENIUS</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const Icon = p.icon;
            return (
              <button key={p.value} onClick={() => setPlatform(p.value)}
                className={cn('flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all',
                  platform === p.value ? 'border-purple-500 bg-purple-500/[0.08]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]')}>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white', p.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn('text-sm font-medium', platform === p.value ? 'text-purple-300' : 'text-gray-400')}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Config + generate */}
      <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" /> Generar post para {selectedPlatform.label}
        </h3>
        <p className="text-xs text-gray-500">Contenido para atraer dueños de restaurantes a MENIUS. Usa datos reales de la plataforma.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Tipo de post</label>
            <select value={postType} onChange={(e) => setPostType(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/30">
              {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Instrucciones extra</label>
            <input type="text" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Enfocarse en la función de IA..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30" />
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4" /> Generar post con IA</>}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Generated post */}
      {post && (
        <div className="space-y-4">
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Caption</p>
              <button onClick={() => copyToClipboard(post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption, 'caption')}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium">
                {copied === 'caption' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar todo</>}
              </button>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
            {post.hashtags && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-purple-400 leading-relaxed">{post.hashtags}</p>
              </div>
            )}
          </div>

          {post.hookVariant && (
            <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-400 mb-2">Variante A/B del hook</p>
              <p className="text-xs text-amber-200/80 leading-relaxed">{post.hookVariant}</p>
              <button onClick={() => copyToClipboard(post.hookVariant, 'hook')}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                {copied === 'hook' ? <><CheckCircle2 className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar variante</>}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2"><ImageIcon className="w-3.5 h-3.5" aria-hidden /> Idea de imagen</div>
              <p className="text-xs text-gray-400 leading-relaxed">{post.imageIdea}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2"><Clock className="w-3.5 h-3.5" /> Mejor hora</div>
              <p className="text-xs text-gray-400 leading-relaxed">{post.bestTime}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2"><Lightbulb className="w-3.5 h-3.5" /> Tip profesional</div>
              <p className="text-xs text-gray-400 leading-relaxed">{post.tip}</p>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-purple-500/30 text-purple-400 hover:bg-purple-500/[0.06] text-sm font-medium transition-colors disabled:opacity-50">
            <Sparkles className="w-4 h-4" /> Generar otra versión
          </button>
        </div>
      )}
    </div>
  );
}
