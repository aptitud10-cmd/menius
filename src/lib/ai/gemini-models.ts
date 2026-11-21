/**
 * Modelos de Gemini en un solo lugar: cuando Google da de baja uno, se cambia acá.
 * Fuente: https://ai.google.dev/gemini-api/docs/deprecations (revisado 2026-11-21).
 *
 * - gemini-2.0-flash ya responde 404 (apagado en junio de 2026).
 * - gemini-2.5-flash: desde el 1-dic-2026 Google lo redirige solo a 3.5 Flash-Lite,
 *   que RECHAZA `thinkingConfig.thinkingBudget: 0` (400 "invalid argument"). Por eso
 *   no se espera a la redirección.
 */

/**
 * Textos cortos y JSON (descripciones, optimizador, posts, análisis de ingredientes).
 * Mismo precio que 2.5 Flash. Para apagar el razonamiento usar
 * `thinkingConfig: { thinkingLevel: 'minimal' }`, NO `thinkingBudget: 0`.
 */
export const GEMINI_FAST = 'gemini-3.5-flash-lite';

/**
 * Importar el menú desde una foto: leer una carta entera necesita el modelo más capaz.
 * Acepta `thinkingBudget: 0`. Más caro (precio de lanzamiento hasta el 31-dic-2026; se duplica
 * en 2027), pero una importación cuesta centavos y es la función con la que se vende.
 */
export const GEMINI_SMART = 'gemini-3.8-flash';

/** Fotos de platos (calidad alta). Versión estable de Nano Banana Pro: la "-preview" ya pasó su fecha de baja. */
export const GEMINI_IMAGE_PRO = 'gemini-3-pro-image';
