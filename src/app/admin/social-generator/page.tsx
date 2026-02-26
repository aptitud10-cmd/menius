'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Instagram, Facebook, Twitter, Linkedin, Sparkles,
  Copy, Check, Loader2, RefreshCw, ChevronDown, Globe,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'bg-gray-700' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-500' },
  { id: 'tiktok', label: 'TikTok', icon: Globe, color: 'bg-purple-600' },
] as const;

const POST_TYPES = [
  { id: 'product_launch', label: '🚀 Feature Launch', labelEs: '🚀 Lanzamiento' },
  { id: 'pain_point', label: '🔥 Pain Point', labelEs: '🔥 Punto de dolor' },
  { id: 'comparison', label: '⚡ vs Competitors', labelEs: '⚡ vs Competencia' },
  { id: 'testimonial', label: '💬 Testimonial', labelEs: '💬 Testimonio' },
  { id: 'educational', label: '📚 Educational', labelEs: '📚 Educativo' },
  { id: 'stat', label: '📊 Stat / Data', labelEs: '📊 Estadística' },
  { id: 'behind_scenes', label: '🎬 Behind Scenes', labelEs: '🎬 Detrás de cámaras' },
  { id: 'promotion', label: '🎁 Promotion', labelEs: '🎁 Promoción' },
] as const;

interface GeneratedPost {
  caption: string;
  hashtags: string;
  hook: string;
  cta: string;
  imageIdea: string;
  bestTimeToPost: string;
  tip: string;
}

export default function SocialGeneratorPage() {
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('pain_point');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [customContext, setCustomContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<GeneratedPost & { platform: string; postType: string }>>([]);

  const generate = useCallback(async () => {
    setLoading(true);
    setPost(null);
    try {
      const res = await fetch('/api/admin/menius-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, postType, language, customContext }),
      });
      const data = await res.json();
      if (data.post) {
        setPost(data.post);
        setHistory(prev => [{ ...data.post, platform, postType }, ...prev].slice(0, 20));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [platform, postType, language, customContext]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const copyFullPost = useCallback(() => {
    if (!post) return;
    const full = `${post.hook}\n\n${post.caption}\n\n${post.cta}\n\n${post.hashtags}`;
    copyToClipboard(full, 'full');
  }, [post, copyToClipboard]);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                MENIUS Social Post Generator
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">AI-powered marketing content for MENIUS SaaS</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Platform */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 block">Platform</label>
              <div className="grid grid-cols-5 gap-2">
                {PLATFORMS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        platform === p.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:border-white/[0.12]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Type */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 block">Post Type</label>
              <div className="grid grid-cols-2 gap-2">
                {POST_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPostType(t.id)}
                    className={`text-left p-3 rounded-xl border transition-all text-sm ${
                      postType === t.id
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:border-white/[0.12]'
                    }`}
                  >
                    {language === 'es' ? t.labelEs : t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language + Context */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 block">Language</label>
                <div className="flex gap-2">
                  {(['es', 'en'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        language === lang
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {lang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Extra context (optional)</label>
                <textarea
                  value={customContext}
                  onChange={e => setCustomContext(e.target.value)}
                  placeholder="e.g. Focus on Latin American market, mention new AI feature..."
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Post</>
              )}
            </button>
          </div>

          {/* Right: Result */}
          <div className="space-y-5">
            {post ? (
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Generated Post</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generate}
                      className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      onClick={copyFullPost}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                    >
                      {copied === 'full' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'full' ? 'Copied!' : 'Copy All'}
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <PostField label="Hook" value={post.hook} onCopy={() => copyToClipboard(post.hook, 'hook')} copied={copied === 'hook'} />
                  <PostField label="Caption" value={post.caption} onCopy={() => copyToClipboard(post.caption, 'caption')} copied={copied === 'caption'} multiline />
                  <PostField label="CTA" value={post.cta} onCopy={() => copyToClipboard(post.cta, 'cta')} copied={copied === 'cta'} />
                  <PostField label="Hashtags" value={post.hashtags} onCopy={() => copyToClipboard(post.hashtags, 'hashtags')} copied={copied === 'hashtags'} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                    <MetaField label="📸 Image Idea" value={post.imageIdea} />
                    <MetaField label="⏰ Best Time" value={post.bestTimeToPost} />
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-medium">💡 Tip: {post.tip}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-12 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-10 h-10 text-gray-700 mb-4" />
                <h3 className="text-sm font-semibold text-gray-500">Ready to generate</h3>
                <p className="text-xs text-gray-600 mt-1 max-w-xs">
                  Select a platform and post type, then click Generate to create AI-powered marketing content for MENIUS.
                </p>
              </div>
            )}

            {/* History */}
            {history.length > 1 && (
              <details className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
                <summary className="px-5 py-4 flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-400 hover:text-gray-300 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  History ({history.length} posts)
                </summary>
                <div className="px-5 pb-4 space-y-3">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setPost(h)}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-500">{h.platform}</span>
                        <span className="text-[10px] text-gray-600">•</span>
                        <span className="text-[10px] text-gray-500">{h.postType.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{h.hook}</p>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostField({ label, value, onCopy, copied, multiline }: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{label}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-emerald-400 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={`text-sm text-gray-200 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</p>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">{label}</span>
      <p className="text-xs text-gray-300">{value}</p>
    </div>
  );
}
