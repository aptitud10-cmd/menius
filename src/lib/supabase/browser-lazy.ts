import type { getSupabaseBrowser } from './browser';

export type BrowserSupabase = ReturnType<typeof getSupabaseBrowser>;

let loading: Promise<BrowserSupabase> | null = null;

/**
 * El cliente de Supabase del navegador, cargado al primer uso.
 *
 * El menú público lo usa para cosas que no hacen falta en el primer segundo
 * (avisos en vivo, sugerencias, saber si hay sesión). Importarlo fijo metía
 * ~44 KB comprimidos en el JS que el celular baja antes de pintar la portada.
 * El panel, el Counter y el KDS siguen usando getSupabaseBrowser() directo.
 */
export function loadSupabaseBrowser(): Promise<BrowserSupabase> {
  if (!loading) {
    loading = import('./browser').then((m) => m.getSupabaseBrowser());
    loading.catch(() => { loading = null; }); // sin red: el próximo uso reintenta
  }
  return loading;
}
