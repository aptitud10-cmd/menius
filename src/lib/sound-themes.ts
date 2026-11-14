// MENIUS — catálogo de temas de sonido para la tablet de órdenes (Counter).
// Archivos en /public/sounds/<id>/{alert,urgent,accepted-1,accepted-2,accepted-3}.mp3
// Los ids viven también en el CHECK de counter_settings.sound_theme
// (migración 20261113g): agregar un tema = migración nueva + entrada aquí.

export type SoundThemeId =
  | 'firma' | 'aurora' | 'cristal' | 'lounge' | 'reloj' | 'arpa' | 'handpan'
  | 'mozart' | 'beethoven' | 'bach' | 'oda-alegria' | 'chonta' | 'diner'
  | 'entertainer' | 'marcha-turca' | 'guillermo-tell' | 'rey-montana' | 'danubio' | 'cucaracha';

export interface SoundTheme {
  id: SoundThemeId;
  name: string;
  description: string;
  category: 'signature' | 'premium' | 'classical' | 'cultural' | 'famous';
}

export const SOUND_THEMES: SoundTheme[] = [
  { id: 'firma',       name: 'Firma MENIUS (oficial)', category: 'signature', description: 'El sonido oficial de MENIUS: celesta y arpa en Sol lidio, con swing.' },
  { id: 'aurora',      name: 'Aurora',                category: 'premium',   description: 'Arpegio FM brillante que resuelve a mayor.' },
  { id: 'cristal',     name: 'Cristal',               category: 'premium',   description: 'Cuenco tibetano y copa de cristal. Estilo spa.' },
  { id: 'lounge',      name: 'Lounge',                category: 'premium',   description: 'Vibráfono y piano eléctrico. Bar de jazz.' },
  { id: 'reloj',       name: 'Reloj antiguo',         category: 'premium',   description: 'Carillón con tic-tac de reloj clásico.' },
  { id: 'arpa',        name: 'Arpa celestial',        category: 'premium',   description: 'Glissando de arpa y celesta.' },
  { id: 'handpan',     name: 'Handpan',               category: 'premium',   description: 'Tambor metálico cálido, orgánico.' },
  { id: 'mozart',      name: 'Mozart',                category: 'classical', description: 'Eine kleine Nachtmusik: pregunta y respuesta.' },
  { id: 'beethoven',   name: 'Für Elise',             category: 'classical', description: 'Beethoven, con final sorpresa en mayor.' },
  { id: 'bach',        name: 'Bach',                  category: 'classical', description: 'Preludio en Do. Elegante y fluido.' },
  { id: 'oda-alegria', name: 'Himno a la Alegría',    category: 'classical', description: 'Beethoven. Música de celebración.' },
  { id: 'chonta',      name: 'Marimba de chonta',     category: 'cultural',  description: 'Currulao del Pacífico colombiano.' },
  { id: 'diner',       name: 'Classic Diner',         category: 'cultural',  description: 'Campana de servicio y doo-wop de rocola.' },
  { id: 'entertainer',    name: 'The Entertainer',   category: 'famous', description: 'Ragtime de Scott Joplin. Perfecto para diners.' },
  { id: 'marcha-turca',   name: 'Marcha turca',      category: 'famous', description: 'Mozart, rápida y alegre.' },
  { id: 'guillermo-tell', name: 'Guillermo Tell',    category: 'famous', description: 'El galope de Rossini. Energía pura.' },
  { id: 'rey-montana',    name: 'Rey de la montaña', category: 'famous', description: 'Grieg. Suspenso que crece.' },
  { id: 'danubio',        name: 'Danubio azul',      category: 'famous', description: 'Vals de Strauss. Elegante.' },
  { id: 'cucaracha',      name: 'La cucaracha',      category: 'famous', description: 'Folclor latino con marimba y guasá.' },
];

// Bonus: sonido especial de cumpleaños (no es tema de alerta)
export const BIRTHDAY_SOUND = '/sounds/bonus/feliz-cumpleanos.mp3';

export const DEFAULT_SOUND_THEME: SoundThemeId = 'firma';

export const SOUND_THEME_IDS = SOUND_THEMES.map((t) => t.id) as [SoundThemeId, ...SoundThemeId[]];

/** Fila "Recomendados" del selector (Firma va aparte, destacada). */
export const RECOMMENDED_SOUND_THEMES: SoundThemeId[] = ['aurora', 'diner', 'entertainer', 'chonta'];

export const SOUND_CATEGORY_LABEL: Record<SoundTheme['category'], { es: string; en: string }> = {
  signature: { es: 'Oficial', en: 'Official' },
  premium:   { es: 'Premium', en: 'Premium' },
  classical: { es: 'Clásicos', en: 'Classical' },
  cultural:  { es: 'Culturales', en: 'Cultural' },
  famous:    { es: 'Famosos', en: 'Famous' },
};

/** Respaldo si el tema no carga (los MP3 de siempre). */
export const FALLBACK_SOUNDS = {
  alert: '/sounds/new-order.mp3',
  accepted: '/sounds/order-accepted.mp3',
} as const;

export const soundUrls = (id: SoundThemeId) => ({
  alert: `/sounds/${id}/alert.mp3`,
  urgent: `/sounds/${id}/urgent.mp3`,
  accepted: [1, 2, 3].map((n) => `/sounds/${id}/accepted-${n}.mp3`),
});
