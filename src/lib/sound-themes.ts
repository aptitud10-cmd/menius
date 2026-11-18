// MENIUS — catálogo de temas de sonido para la tablet de órdenes (Counter).
// Archivos en /public/sounds/<id>/{alert,urgent,accepted-1,accepted-2,accepted-3}.mp3
// Los ids viven también en el CHECK de counter_settings.sound_theme
// (migración 20261113g): agregar un tema = migración nueva + entrada aquí.

// 2026-11-14: de 19 temas quedan 4, uno por tipo de local (Pedro). Un id viejo
// guardado en la base cae a 'firma' (rowToSettings); el CHECK de la base sigue
// aceptando los 19, así que no hace falta migración.
export type SoundThemeId = 'firma' | 'aurora' | 'diner' | 'cristal';

export interface SoundTheme {
  id: SoundThemeId;
  name: { es: string; en: string };
  description: { es: string; en: string };
}

export const SOUND_THEMES: SoundTheme[] = [
  { id: 'firma',   name: { es: 'Firma MENIUS', en: 'MENIUS Signature' },
    description: { es: 'El sonido oficial: celesta y arpa. Sirve para casi todo.', en: 'The official sound: celesta and harp. Works almost anywhere.' } },
  { id: 'aurora',  name: { es: 'Aurora', en: 'Aurora' },
    description: { es: 'Brillante y agudo: se oye por encima de la campana y la plancha.', en: 'Bright and high: cuts through hood fans and the grill.' } },
  { id: 'diner',   name: { es: 'Classic Diner', en: 'Classic Diner' },
    description: { es: 'Campana de servicio. Para diners y cafeterías.', en: 'Service bell. For diners and coffee shops.' } },
  { id: 'cristal', name: { es: 'Cristal', en: 'Crystal' },
    description: { es: 'Suave: para cafés y lugares tranquilos.', en: 'Soft: for cafés and quiet places.' } },
];

// Bonus: sonido especial de cumpleaños (no es tema de alerta)
export const BIRTHDAY_SOUND = '/sounds/bonus/feliz-cumpleanos.mp3';

export const DEFAULT_SOUND_THEME: SoundThemeId = 'firma';

export const SOUND_THEME_IDS = SOUND_THEMES.map((t) => t.id) as [SoundThemeId, ...SoundThemeId[]];

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
