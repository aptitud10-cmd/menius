/** Words that make a bad last word for a home-screen label ("La Casa de"). */
const CONNECTORS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'the', 'of', 'and', '&', 'a']);

/**
 * The name under a home-screen icon (iOS shows ~12 characters). Whole words
 * only: "Buccaneer Diner" was cut to "Buccaneer Di". Keeps adding words while
 * they fit, drops a dangling connector, and only slices a single word that is
 * itself too long.
 */
export function shortName(name: string, max = 12): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const words = clean.split(' ');
  const kept: string[] = [];
  for (const w of words) {
    const next = [...kept, w].join(' ');
    if (next.length > max) break;
    kept.push(w);
  }
  while (kept.length > 1 && CONNECTORS.has(kept[kept.length - 1].toLowerCase())) kept.pop();
  return kept.length > 0 ? kept.join(' ') : clean.slice(0, max);
}
