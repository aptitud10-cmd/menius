'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Lock, Play, Sparkles, X } from 'lucide-react';
import { C, type CounterText } from './ui';
import { previewTheme, previewVolume } from './audio';
import {
  SOUND_THEMES, RECOMMENDED_SOUND_THEMES, SOUND_CATEGORY_LABEL, type SoundTheme, type SoundThemeId,
} from '@/lib/sound-themes';
import { SCREEN_THEMES, type ScreenTheme, type ScreenThemeId } from '@/lib/counter-themes';
import { URGENT_CHOICES, type CounterSettings, type CounterSettingsPatch } from '@/lib/counter-settings';
import type { SaveCounterSettingsResult } from '@/lib/actions/counter-settings';

type Tab = 'sound' | 'colors' | 'volume';
export interface AppearancePreview { screenTheme: ScreenThemeId }

/**
 * Panel lateral del Counter: sonido, pantalla (Claro/Oscuro) y volumen, con vista previa en
 * vivo. Nada se guarda hasta "Usar este" (el volumen y el urgente se guardan al
 * soltar). Lo guardado llega a todas las tablets del restaurante por Realtime.
 */
export function CustomizePanel({
  T, lang, settings, canCustomize, isOwner, onPreviewAppearance, onSave, onVolumeLive, onClose, onStartDemo,
}: {
  T: CounterText;
  lang: 'es' | 'en';
  settings: CounterSettings;
  /** false: tablet vinculada y el dueño apagó staff_can_customize. */
  canCustomize: boolean;
  /** Sesión del dueño (no tablet vinculada): ve el permiso y el modo demo. */
  isOwner: boolean;
  onPreviewAppearance: (a: AppearancePreview | null) => void;
  onSave: (patch: CounterSettingsPatch) => Promise<SaveCounterSettingsResult>;
  onVolumeLive: (v: number) => void;
  onClose: () => void;
  onStartDemo?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('sound');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sonido
  const [sound, setSound] = useState<SoundThemeId>(settings.soundTheme);
  const [allSounds, setAllSounds] = useState(false);
  const stopPreview = useRef<(() => void) | null>(null);

  // Pantalla: Claro u Oscuro
  const [theme, setTheme] = useState<ScreenThemeId>(settings.screenTheme);

  // Volumen
  const [volume, setVolume] = useState(settings.soundVolume);

  useEffect(() => () => { stopPreview.current?.(); onPreviewAppearance(null); }, [onPreviewAppearance]);

  // Vista previa en vivo de la apariencia en toda la pantalla.
  useEffect(() => {
    if (theme === settings.screenTheme) onPreviewAppearance(null);
    else onPreviewAppearance({ screenTheme: theme });
  }, [theme, settings.screenTheme, onPreviewAppearance]);

  const run = async (patch: CounterSettingsPatch) => {
    setSaving(true); setError(null);
    const r = await onSave(patch);
    setSaving(false);
    if (!r.ok) setError(r.error === 'locked' ? T.locked : T.saveFailed);
    return r.ok;
  };

  const listen = async (id: SoundThemeId) => {
    stopPreview.current?.();
    stopPreview.current = await previewTheme(id);
  };

  // Volumen: suena y se guarda al dejar de mover (no en cada paso del slider).
  const volTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeVolume = (v: number) => {
    setVolume(v);
    onVolumeLive(v);
    if (volTimer.current) clearTimeout(volTimer.current);
    volTimer.current = setTimeout(() => {
      previewVolume();
      if (canCustomize && v !== settings.soundVolume) void run({ soundVolume: v });
    }, 450);
  };
  useEffect(() => () => { if (volTimer.current) clearTimeout(volTimer.current); }, []);

  const soundDirty = sound !== settings.soundTheme;
  const colorsDirty = theme !== settings.screenTheme;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sound', label: T.tabSound }, { key: 'colors', label: T.tabColors }, { key: 'volume', label: T.tabVolume },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label={T.close} className="absolute inset-0 cursor-default" style={{ background: C.scrim }} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={T.customize}
        className="relative w-full max-w-[560px] h-full flex flex-col shadow-2xl"
        style={{ background: C.bg, color: C.ink, boxShadow: `-1px 0 0 ${C.raisedEdge}, -24px 0 48px rgba(0,0,0,.28)`, paddingTop: 'env(safe-area-inset-top)' }}>

        <div className="flex-none flex items-center gap-3 px-5 pt-4 pb-3">
          <h2 className="flex-1 text-[24px] font-bold tracking-[-0.02em]">{T.customize}</h2>
          <button type="button" onClick={onClose} aria-label={T.close} className="w-12 h-12 rounded-full inline-flex items-center justify-center" style={{ background: C.fill, color: C.ink }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div role="tablist" className="flex-none mx-5 mb-4 p-1 rounded-2xl grid grid-cols-3 gap-0.5" style={{ background: C.fill }}>
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className="h-11 rounded-xl text-[16px]"
              style={tab === t.key
                ? { background: C.thumb, color: C.ink, boxShadow: C.thumbShadow, fontWeight: 700 }
                : { color: C.ink, fontWeight: 500 }}>
              {t.label}
            </button>
          ))}
        </div>

        {!canCustomize && (
          <p className="flex-none mx-5 mb-3 rounded-xl px-4 py-3 text-[15px] font-semibold flex items-start gap-2.5" style={{ background: C.warnBg, color: C.warnText, boxShadow: `inset 3px 0 0 ${C.warnBar}` }}>
            <Lock className="w-5 h-5 flex-none mt-0.5" /> {T.locked}
          </p>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 flex flex-col gap-5 [&>*]:shrink-0">
          {tab === 'sound' && (
            <>
              <SoundCard theme={SOUND_THEMES[0]} T={T} featured selected={sound === SOUND_THEMES[0].id} inUse={settings.soundTheme === SOUND_THEMES[0].id}
                onPick={() => { setSound(SOUND_THEMES[0].id); void listen(SOUND_THEMES[0].id); }} />
              <Section title={T.recommended}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RECOMMENDED_SOUND_THEMES.map((id) => {
                    const st = SOUND_THEMES.find((x) => x.id === id)!;
                    return <SoundCard key={id} theme={st} T={T} selected={sound === id} inUse={settings.soundTheme === id}
                      onPick={() => { setSound(id); void listen(id); }} />;
                  })}
                </div>
              </Section>
              <button type="button" onClick={() => setAllSounds((v) => !v)}
                className="h-14 rounded-2xl font-semibold text-[16px] inline-flex items-center justify-center gap-2" style={{ background: C.fill, color: C.ink }}>
                {allSounds ? T.hideAllSounds : T.seeAllSounds}
                <ChevronDown className={`w-5 h-5 transition-transform ${allSounds ? 'rotate-180' : ''}`} />
              </button>
              {allSounds && (['premium', 'classical', 'cultural', 'famous'] as const).map((cat) => (
                <Section key={cat} title={SOUND_CATEGORY_LABEL[cat][lang]}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SOUND_THEMES.filter((x) => x.category === cat).map((st) => (
                      <SoundCard key={st.id} theme={st} T={T} selected={sound === st.id} inUse={settings.soundTheme === st.id}
                        onPick={() => { setSound(st.id); void listen(st.id); }} />
                    ))}
                  </div>
                </Section>
              ))}
            </>
          )}

          {tab === 'colors' && (
            <div className="grid grid-cols-2 gap-3">
              {SCREEN_THEMES.map((x) => (
                <AppearanceCard key={x.id} theme={x} lang={lang} T={T} selected={theme === x.id} inUse={settings.screenTheme === x.id}
                  onPick={() => setTheme(x.id)} />
              ))}
            </div>
          )}

          {tab === 'volume' && (
            <>
              <Section title={T.volume}>
                <div className="flex items-center gap-4">
                  <input type="range" min={0} max={100} step={5} value={volume} disabled={!canCustomize}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    aria-label={T.volume}
                    className="flex-1 h-12"
                    style={{ accentColor: C.accent }} />
                  <span className="w-16 text-right text-[22px] font-bold tabular-nums">{volume}%</span>
                </div>
              </Section>
              <Section title={T.urgentAfter}>
                <div role="radiogroup" aria-label={T.urgentAfter} className="grid grid-cols-4 gap-0.5 p-1 rounded-2xl" style={{ background: C.fill }}>
                  {URGENT_CHOICES.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={settings.urgentAfterSeconds === s} disabled={!canCustomize || saving}
                      onClick={() => void run({ urgentAfterSeconds: s })}
                      className="h-12 rounded-xl text-[18px] tabular-nums"
                      style={settings.urgentAfterSeconds === s
                        ? { background: C.thumb, color: C.ink, boxShadow: C.thumbShadow, fontWeight: 700 }
                        : { color: C.ink, fontWeight: 500 }}>
                      {T.seconds(s)}
                    </button>
                  ))}
                </div>
              </Section>
              {isOwner && (
                <label className="flex items-center justify-between gap-4 rounded-2xl px-4 py-4 cursor-pointer" style={{ background: C.surface }}>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold">{T.staffCanCustomize}</span>
                    <span className="block text-[14px] mt-0.5" style={{ color: C.sub }}>{T.staffCanCustomizeHelp}</span>
                  </span>
                  <input type="checkbox" checked={settings.staffCanCustomize} disabled={saving}
                    onChange={(e) => void run({ staffCanCustomize: e.target.checked })}
                    style={{ accentColor: C.accent, width: 24, height: 24 }} />
                </label>
              )}
            </>
          )}

          {isOwner && onStartDemo && (
            <div className="rounded-2xl px-4 py-4 flex flex-col gap-3" style={{ background: C.surface }}>
              <p className="flex items-center gap-2 text-[16px] font-semibold"><Sparkles className="w-5 h-5" /> {T.demoMode}</p>
              <p className="text-[14px] -mt-1" style={{ color: C.sub }}>{T.demoModeHelp}</p>
              <button type="button" onClick={onStartDemo} className="h-12 rounded-xl font-semibold text-[16px]" style={{ background: C.fill, color: C.ink }}>
                {T.startDemo}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="flex-none mx-5 mb-2 rounded-xl px-4 py-3 text-[15px] font-semibold" style={{ background: C.surface, color: C.destructive, boxShadow: `inset 3px 0 0 ${C.destructive}` }}>{error}</p>
        )}

        {((tab === 'sound' && soundDirty) || (tab === 'colors' && colorsDirty)) && (
          <div className="flex-none px-5 pt-3 border-t" style={{ borderColor: C.line, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button type="button"
              disabled={!canCustomize || saving}
              onClick={() => void (tab === 'sound'
                ? run({ soundTheme: sound })
                : run({ screenTheme: theme }))}
              className="w-full h-16 rounded-2xl font-semibold text-[20px] disabled:opacity-50"
              style={{ background: C.accent, color: C.onAccent }}>
              {T.useThis}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[15px] font-semibold" style={{ color: C.sub }}>{title}</h3>
      {children}
    </section>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'accent' | 'dark' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap ${tone === 'dark' ? 'h-6 px-2.5 rounded-full' : ''}`}
      style={tone === 'accent' ? { color: C.accentText } : { background: C.inverse, color: C.onInverse }}>
      {children}
    </span>
  );
}

function SoundCard({ theme, T, selected, inUse, featured = false, onPick }: {
  theme: SoundTheme; T: CounterText; selected: boolean; inUse: boolean; featured?: boolean; onPick: () => void;
}) {
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={`w-full text-left rounded-2xl flex items-center gap-3.5 ${featured ? 'px-4 py-4' : 'px-3.5 py-3'}`}
      style={{ background: C.surface, boxShadow: selected ? `inset 0 0 0 2px ${C.accent}` : undefined }}>
      <span className={`flex-none rounded-xl inline-flex items-center justify-center ${featured ? 'w-14 h-14' : 'w-11 h-11'}`}
        style={selected ? { background: C.accent, color: C.onAccent } : { background: C.fill, color: C.ink }} aria-label={T.listen}>
        <Play className={featured ? 'w-6 h-6' : 'w-5 h-5'} fill="currentColor" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold ${featured ? 'text-[19px]' : 'text-[16px]'}`}>
            {/* El badge ya dice "Oficial": sin el "(oficial)" del catálogo. */}
            {featured ? theme.name.replace(/\s*\(oficial\)\s*$/i, '') : theme.name}
          </span>
          {featured && <Badge tone="dark">{T.official}</Badge>}
          {inUse && <Badge tone="accent"><Check className="w-3.5 h-3.5" strokeWidth={2.6} />{T.inUse}</Badge>}
        </span>
        <span className="block text-[14px] leading-snug mt-0.5" style={{ color: C.sub }}>{theme.description}</span>
      </span>
    </button>
  );
}

/** Claro u Oscuro: una mini vista del tablero con los colores de esa apariencia. */
function AppearanceCard({ theme, lang, T, selected, inUse, onPick }: {
  theme: ScreenTheme; lang: 'es' | 'en'; T: CounterText; selected: boolean; inUse: boolean; onPick: () => void;
}) {
  const k = theme.tokens;
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className="w-full text-left rounded-[22px] p-2.5 flex flex-col gap-3"
      style={{ background: C.surface, boxShadow: selected ? `inset 0 0 0 3px ${C.accent}` : `inset 0 0 0 1px ${C.line}` }}>
      {/* Miniatura: fondo, una tarjeta con su botón Aceptar y otra con su botón gris. */}
      <span aria-hidden className="block rounded-2xl p-2.5" style={{ background: k.bg, boxShadow: `inset 0 0 0 1px ${k.line}` }}>
        <span className="flex items-center gap-1.5 mb-2">
          <span className="h-2 w-2 rounded-full" style={{ background: k.status }} />
          <span className="h-2 w-12 rounded-full" style={{ background: k.fill }} />
        </span>
        <span className="grid grid-cols-2 gap-1.5">
          <span className="block rounded-lg p-1.5" style={{ background: k.surface }}>
            <span className="block h-1.5 w-3/4 rounded-full mb-1" style={{ background: k.ink }} />
            <span className="block h-1.5 w-1/2 rounded-full mb-1.5" style={{ background: k.sub }} />
            <span className="block h-4 rounded-md" style={{ background: k.accent }} />
          </span>
          <span className="block rounded-lg p-1.5" style={{ background: k.surface }}>
            <span className="block h-1.5 w-2/3 rounded-full mb-1" style={{ background: k.ink }} />
            <span className="block h-1.5 w-1/2 rounded-full mb-1.5" style={{ background: k.blue }} />
            <span className="block h-4 rounded-md" style={{ background: k.fill }} />
          </span>
        </span>
      </span>
      <span className="flex items-center gap-2 px-1.5 pb-1">
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[18px] tracking-[-0.01em]">{theme.name[lang]}</span>
          {inUse && <Badge tone="accent">{T.inUse}</Badge>}
        </span>
        <span className="flex-none w-7 h-7 rounded-full inline-flex items-center justify-center"
          style={selected ? { background: C.accent, color: C.onAccent } : { boxShadow: `inset 0 0 0 2px ${C.lineStrong}` }}>
          {selected && <Check className="w-4 h-4" strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}
