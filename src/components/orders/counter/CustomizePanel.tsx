'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Lock, Play, Sparkles, X } from 'lucide-react';
import { C, type CounterText } from './ui';
import { previewTheme, previewVolume } from './audio';
import {
  SOUND_THEMES, RECOMMENDED_SOUND_THEMES, SOUND_CATEGORY_LABEL, type SoundTheme, type SoundThemeId,
} from '@/lib/sound-themes';
import {
  SCREEN_THEMES, RECOMMENDED_SCREEN_THEMES, deriveAccent, getScreenTheme,
  type ScreenTheme, type ScreenThemeId,
} from '@/lib/counter-themes';
import { URGENT_CHOICES, type CounterSettings, type CounterSettingsPatch } from '@/lib/counter-settings';
import type { SaveCounterSettingsResult } from '@/lib/actions/counter-settings';

type Tab = 'sound' | 'colors' | 'volume';
export interface AppearancePreview { screenTheme: ScreenThemeId; customAccent: string | null }

/**
 * Panel lateral del Counter: sonido, colores y volumen, con vista previa en
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

  // Colores
  const [theme, setTheme] = useState<ScreenThemeId>(settings.screenTheme);
  const [accent, setAccent] = useState<string | null>(settings.customAccent);
  const [allColors, setAllColors] = useState(false);

  // Volumen
  const [volume, setVolume] = useState(settings.soundVolume);

  useEffect(() => () => { stopPreview.current?.(); onPreviewAppearance(null); }, [onPreviewAppearance]);

  // Vista previa en vivo de los colores en toda la pantalla.
  useEffect(() => {
    if (theme === settings.screenTheme && accent === settings.customAccent) onPreviewAppearance(null);
    else onPreviewAppearance({ screenTheme: theme, customAccent: accent });
  }, [theme, accent, settings.screenTheme, settings.customAccent, onPreviewAppearance]);

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

  const accentCheck = useMemo(() => (accent ? deriveAccent(accent, getScreenTheme(theme)) : null), [accent, theme]);

  const soundDirty = sound !== settings.soundTheme;
  const colorsDirty = theme !== settings.screenTheme || accent !== settings.customAccent;
  const accentBlocked = accentCheck != null && !accentCheck.ok;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sound', label: T.tabSound }, { key: 'colors', label: T.tabColors }, { key: 'volume', label: T.tabVolume },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label={T.close} className="absolute inset-0 cursor-default" style={{ background: 'rgba(14,20,18,.45)' }} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={T.customize}
        className="relative w-full max-w-[560px] h-full flex flex-col shadow-2xl"
        style={{ background: C.bg, color: C.ink, paddingTop: 'env(safe-area-inset-top)' }}>

        <div className="flex-none flex items-center gap-3 px-5 pt-4 pb-3">
          <h2 className="flex-1 text-[22px] font-extrabold">{T.customize}</h2>
          <button type="button" onClick={onClose} aria-label={T.close} className="w-12 h-12 rounded-xl inline-flex items-center justify-center" style={{ background: C.surface }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div role="tablist" className="flex-none mx-5 mb-3 p-1 rounded-2xl grid grid-cols-3 gap-1" style={{ background: C.surface }}>
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className="h-12 rounded-xl font-bold text-[16px] transition-colors"
              style={tab === t.key ? { background: C.black, color: C.onBlack } : { color: C.sub }}>
              {t.label}
            </button>
          ))}
        </div>

        {!canCustomize && (
          <p className="flex-none mx-5 mb-3 rounded-xl px-4 py-3 text-[15px] font-semibold flex items-start gap-2.5" style={{ background: C.amberSoft, color: C.amber }}>
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
                className="h-14 rounded-xl font-bold text-[16px] inline-flex items-center justify-center gap-2" style={{ background: C.surface, color: C.ink }}>
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
            <>
              <ThemeCard theme={SCREEN_THEMES[0]} lang={lang} T={T} featured selected={theme === 'menius'} inUse={settings.screenTheme === 'menius'}
                onPick={() => setTheme('menius')} />
              <Section title={T.recommended}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {RECOMMENDED_SCREEN_THEMES.map((id) => (
                    <ThemeCard key={id} theme={getScreenTheme(id)} lang={lang} T={T} selected={theme === id} inUse={settings.screenTheme === id}
                      onPick={() => setTheme(id)} />
                  ))}
                </div>
              </Section>
              <button type="button" onClick={() => setAllColors((v) => !v)}
                className="h-14 rounded-xl font-bold text-[16px] inline-flex items-center justify-center gap-2" style={{ background: C.surface, color: C.ink }}>
                {allColors ? T.hideAllColors : T.seeAllColors}
                <ChevronDown className={`w-5 h-5 transition-transform ${allColors ? 'rotate-180' : ''}`} />
              </button>
              {allColors && (['dark', 'light'] as const).map((mode) => (
                <Section key={mode} title={mode === 'dark' ? T.darkThemes : T.lightThemes}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {SCREEN_THEMES.filter((x) => x.mode === mode && x.id !== 'menius').map((x) => (
                      <ThemeCard key={x.id} theme={x} lang={lang} T={T} selected={theme === x.id} inUse={settings.screenTheme === x.id}
                        onPick={() => setTheme(x.id)} />
                    ))}
                  </div>
                </Section>
              ))}

              <Section title={T.customAccent}>
                <p className="text-[15px] -mt-1" style={{ color: C.sub }}>{T.customAccentHelp}</p>
                <div className="flex items-center gap-3">
                  <label className="relative w-14 h-14 rounded-xl overflow-hidden flex-none cursor-pointer" style={{ background: accent ?? C.green, boxShadow: `inset 0 0 0 2px ${C.line}` }}>
                    <input type="color" aria-label={T.customAccent} className="absolute inset-0 opacity-0 cursor-pointer"
                      value={(accent ?? getScreenTheme(theme).tokens.green).toLowerCase()}
                      onChange={(e) => setAccent(e.target.value.toUpperCase())} />
                  </label>
                  <span className="font-mono font-bold text-[17px] tabular-nums">{accent ?? '—'}</span>
                  <span className="flex-1" />
                  {accent && (
                    <button type="button" onClick={() => setAccent(null)} className="h-12 px-4 rounded-xl font-bold text-[15px]" style={{ background: C.surface, color: C.ink }}>
                      {T.removeAccent}
                    </button>
                  )}
                </div>
                {accentCheck && !accentCheck.ok && (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: C.redSoft, color: C.red }}>
                    <span className="flex-1 min-w-[200px] text-[15px] font-semibold">{T.accentBlocked}</span>
                    {accentCheck.suggestion && (
                      <button type="button" onClick={() => setAccent(accentCheck.suggestion)}
                        className="h-11 px-3 rounded-lg font-bold text-[15px] inline-flex items-center gap-2" style={{ background: C.bg, color: C.ink }}>
                        <span className="w-5 h-5 rounded-md" style={{ background: accentCheck.suggestion }} />
                        {T.useSuggested}
                      </button>
                    )}
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === 'volume' && (
            <>
              <Section title={T.volume}>
                <div className="flex items-center gap-4">
                  <input type="range" min={0} max={100} step={5} value={volume} disabled={!canCustomize}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    aria-label={T.volume}
                    className="flex-1 h-12"
                    style={{ accentColor: C.green }} />
                  <span className="w-16 text-right text-[22px] font-extrabold tabular-nums">{volume}%</span>
                </div>
              </Section>
              <Section title={T.urgentAfter}>
                <div className="grid grid-cols-4 gap-2">
                  {URGENT_CHOICES.map((s) => (
                    <button key={s} type="button" disabled={!canCustomize || saving}
                      onClick={() => void run({ urgentAfterSeconds: s })}
                      className="h-14 rounded-xl font-extrabold text-[18px] tabular-nums"
                      style={settings.urgentAfterSeconds === s ? { background: C.black, color: C.onBlack } : { background: C.surface, color: C.ink }}>
                      {T.seconds(s)}
                    </button>
                  ))}
                </div>
              </Section>
              {isOwner && (
                <label className="flex items-center justify-between gap-4 rounded-2xl px-4 py-4 cursor-pointer" style={{ background: C.surface }}>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-bold">{T.staffCanCustomize}</span>
                    <span className="block text-[14px] mt-0.5" style={{ color: C.sub }}>{T.staffCanCustomizeHelp}</span>
                  </span>
                  <input type="checkbox" checked={settings.staffCanCustomize} disabled={saving}
                    onChange={(e) => void run({ staffCanCustomize: e.target.checked })}
                    style={{ accentColor: C.greenDeep, width: 24, height: 24 }} />
                </label>
              )}
            </>
          )}

          {isOwner && onStartDemo && (
            <div className="rounded-2xl px-4 py-4 flex flex-col gap-3" style={{ background: C.surface }}>
              <p className="flex items-center gap-2 text-[16px] font-extrabold"><Sparkles className="w-5 h-5" /> {T.demoMode}</p>
              <p className="text-[14px] -mt-1" style={{ color: C.sub }}>{T.demoModeHelp}</p>
              <button type="button" onClick={onStartDemo} className="h-12 rounded-xl font-bold text-[16px]" style={{ background: C.bg, color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line}` }}>
                {T.startDemo}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="flex-none mx-5 mb-2 rounded-xl px-4 py-3 text-[15px] font-semibold" style={{ background: C.redSoft, color: C.red }}>{error}</p>
        )}

        {((tab === 'sound' && soundDirty) || (tab === 'colors' && colorsDirty)) && (
          <div className="flex-none px-5 pt-3 border-t" style={{ borderColor: C.line, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button type="button"
              disabled={!canCustomize || saving || (tab === 'colors' && accentBlocked)}
              onClick={() => void (tab === 'sound'
                ? run({ soundTheme: sound })
                : run({ screenTheme: theme, customAccent: accent }))}
              className="w-full h-16 rounded-2xl font-extrabold text-[20px] disabled:opacity-50"
              style={{ background: C.black, color: C.onBlack }}>
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
      <h3 className="text-[15px] font-bold" style={{ color: C.sub }}>{title}</h3>
      {children}
    </section>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'accent' | 'dark' }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[13px] font-extrabold whitespace-nowrap"
      style={tone === 'accent' ? { background: C.greenSoft, color: C.greenDeep } : { background: C.black, color: C.onBlack }}>
      {children}
    </span>
  );
}

function SoundCard({ theme, T, selected, inUse, featured = false, onPick }: {
  theme: SoundTheme; T: CounterText; selected: boolean; inUse: boolean; featured?: boolean; onPick: () => void;
}) {
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={`w-full text-left rounded-2xl flex items-center gap-3.5 transition-shadow ${featured ? 'px-4 py-4' : 'px-3.5 py-3'}`}
      style={{ background: selected ? C.greenSoft : C.surface, boxShadow: selected ? `inset 0 0 0 2px ${C.greenDeep}` : undefined }}>
      <span className={`flex-none rounded-xl inline-flex items-center justify-center ${featured ? 'w-14 h-14' : 'w-11 h-11'}`}
        style={{ background: selected ? C.greenDeep : C.bg, color: selected ? C.bg : C.ink }} aria-label={T.listen}>
        <Play className={featured ? 'w-6 h-6' : 'w-5 h-5'} fill="currentColor" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className={`font-extrabold ${featured ? 'text-[19px]' : 'text-[16px]'}`}>
            {/* El badge ya dice "Oficial": sin el "(oficial)" del catálogo. */}
            {featured ? theme.name.replace(/\s*\(oficial\)\s*$/i, '') : theme.name}
          </span>
          {featured && <Badge tone="dark">{T.official}</Badge>}
          {inUse && <Badge tone="accent"><Check className="w-3.5 h-3.5" />{T.inUse}</Badge>}
        </span>
        <span className="block text-[14px] leading-snug mt-0.5" style={{ color: C.sub }}>{theme.description}</span>
      </span>
    </button>
  );
}

function ThemeCard({ theme, lang, T, selected, inUse, featured = false, onPick }: {
  theme: ScreenTheme; lang: 'es' | 'en'; T: CounterText; selected: boolean; inUse: boolean; featured?: boolean; onPick: () => void;
}) {
  const k = theme.tokens;
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={`w-full text-left rounded-2xl p-2 flex ${featured ? 'flex-row items-center gap-4' : 'flex-col gap-2'}`}
      style={{ background: C.surface, boxShadow: selected ? `inset 0 0 0 3px ${C.greenDeep}` : undefined }}>
      {/* Miniatura con los colores del tema: fondo, tarjeta nueva, botón principal. */}
      <span aria-hidden className={`block rounded-xl p-2 flex-none ${featured ? 'w-40' : 'w-full'}`} style={{ background: k.bg, boxShadow: `inset 0 0 0 1px ${k.line}` }}>
        <span className="flex items-center gap-1 mb-1.5">
          <span className="h-2 w-8 rounded-full" style={{ background: k.greenSoft }} />
          <span className="h-2 w-2 rounded-full" style={{ background: k.green }} />
        </span>
        <span className="block rounded-lg p-1.5 mb-1" style={{ background: k.greenSoft, boxShadow: `inset 0 0 0 1.5px ${k.green}` }}>
          <span className="block h-1.5 w-3/4 rounded-full mb-1" style={{ background: k.ink }} />
          <span className="block h-1.5 w-1/2 rounded-full mb-1.5" style={{ background: k.sub }} />
          <span className="block h-3.5 rounded-md" style={{ background: k.green }} />
        </span>
        <span className="flex gap-1">
          <span className="flex-1 h-5 rounded-md" style={{ background: k.surface }} />
          <span className="flex-1 h-5 rounded-md" style={{ background: k.black }} />
        </span>
      </span>
      <span className="min-w-0 px-1 pb-1">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="font-extrabold text-[16px]">{theme.name[lang]}</span>
          {featured && <Badge tone="dark">{T.official}</Badge>}
          {inUse && <Badge tone="accent"><Check className="w-3.5 h-3.5" />{T.inUse}</Badge>}
        </span>
        <span className="block text-[13px] leading-snug mt-0.5" style={{ color: C.sub }}>{theme.tagline[lang]}</span>
      </span>
    </button>
  );
}
