'use client';

import { useState } from 'react';
import { Sparkles, Copy, CheckCircle2, Loader2, Clock, Lightbulb, Image, Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  restaurantName: string;
  menuSlug: string;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { value: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'bg-black' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
];

const POST_TYPES = [
  { value: 'promo', label: 'Promoción / Descuento' },
  { value: 'new_dish', label: 'Nuevo platillo' },
  { value: 'daily_special', label: 'Especial del día' },
  { value: 'behind_scenes', label: 'Detrás de cámaras' },
  { value: 'customer_review', label: 'Reseña de cliente' },
  { value: 'general', label: 'Post general' },
  { value: 'event', label: 'Evento especial' },
  { value: 'story', label: 'Historia del restaurante' },
];

interface GeneratedPost {
  caption: string;
  hashtags: string;
  imageIdea: string;
  bestTime: string;
  tip: string;
}

export function SocialMediaManager({ restaurantName, menuSlug }: Props) {
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('promo');
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
      const res = await fetch('/api/ai/social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, postType, customPrompt: customPrompt.trim() || undefined }),
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
        <p className="text-xs text-gray-500 font-medium mb-3">Elige la red social</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={cn(
                  'flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all',
                  platform === p.value
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white', p.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn('text-sm font-medium', platform === p.value ? 'text-purple-700' : 'text-gray-700')}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Post type + custom prompt */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" /> Generar post con IA para {selectedPlatform.label}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Tipo de publicación</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            >
              {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Instrucciones extra (opcional)</label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Menciona el 2x1 en pizzas los martes..."
              className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generando post...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generar post con IA</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Generated post */}
      {post && (
        <div className="space-y-4">
          {/* Caption */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Caption / Texto</p>
              <button
                onClick={() => copyToClipboard(post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption, 'caption')}
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                {copied === 'caption' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar todo</>}
              </button>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
            {post.hashtags && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-blue-600 leading-relaxed">{post.hashtags}</p>
              </div>
            )}
          </div>

          {/* Tips row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-2">
                <Image className="w-3.5 h-3.5" /> Idea de imagen
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">{post.imageIdea}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mb-2">
                <Clock className="w-3.5 h-3.5" /> Mejor hora
              </div>
              <p className="text-xs text-blue-900 leading-relaxed">{post.bestTime}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 mb-2">
                <Lightbulb className="w-3.5 h-3.5" /> Tip profesional
              </div>
              <p className="text-xs text-green-900 leading-relaxed">{post.tip}</p>
            </div>
          </div>

          {/* Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> Generar otra versión
          </button>
        </div>
      )}
    </div>
  );
}
