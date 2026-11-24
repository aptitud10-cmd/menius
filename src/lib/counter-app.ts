/**
 * Versiones de la app Android del Counter (apps/menius-counter-android).
 *
 * La app agrega "MeniusCounterApp/<versionName>" al User-Agent del WebView
 * (AppConfig.UA_MARKER), así el servidor sabe qué versión tiene cada tablet sin
 * que la app mande nada extra — también las viejas.
 */

/**
 * versionCode mínimo que la web necesita. La app 1.0.8+ lo recibe
 * (MeniusAndroid.setMinAppVersion) y, si la suya es menor, se actualiza sola en
 * modo obligatorio (pantalla de Play "Actualizando…"). Subirlo SOLO para arreglos
 * que no pueden esperar, y solo cuando esa versión ya esté publicada en Play.
 * 9 = 1.0.8, la primera que sabe actualizarse sola.
 */
export const COUNTER_APP_MIN_VERSION_CODE = 9;

/** Última versión publicada en Play: el admin marca las tablets que están por debajo. */
export const COUNTER_APP_LATEST = '1.0.8';

const UA_RE = /MeniusCounterApp\/(\d{1,3}(?:\.\d{1,3}){1,3})(?![\w.])/;

/** versionName de la app del Counter según el User-Agent, o null (navegador común). */
export function counterAppVersionFromUA(ua: string | null | undefined): string | null {
  const m = UA_RE.exec(ua ?? '');
  return m ? m[1] : null;
}

/** true si `a` es una versión anterior a `b` ("1.0.5" < "1.0.10"). */
export function isOlderAppVersion(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
