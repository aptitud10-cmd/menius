/**
 * Render de un ticket a PNG 1-bit para impresoras térmicas (CloudPRNT, SPEC §5).
 *
 *   satori (JSX → SVG) → resvg (SVG → píxeles RGBA) → sharp (umbral → PNG 1-bit)
 *
 * Solo corre en runtime nodejs: resvg es un binario nativo. Los fonts se leen
 * del disco (next.config.js los incluye en el trace de /api/printing y /api/cloudprnt).
 */
import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReactNode } from 'react';

/** 80 mm a 203 dpi = 576 puntos de ancho. */
export const TICKET_WIDTH = 576;

type SatoriFont = { name: string; data: Buffer; weight: 700 | 900; style: 'normal' };

let fontsPromise: Promise<SatoriFont[]> | null = null;

function loadFonts(): Promise<SatoriFont[]> {
  if (!fontsPromise) {
    const dir = path.join(process.cwd(), 'src', 'lib', 'printing', 'fonts');
    fontsPromise = Promise.all([
      readFile(path.join(dir, 'Inter-Bold.ttf')),
      readFile(path.join(dir, 'Inter-Black.ttf')),
    ]).then(([bold, black]) => [
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
      { name: 'Inter', data: black, weight: 900, style: 'normal' },
    ]);
    // Si falla una vez (deploy sin fonts), que el próximo intento vuelva a leer.
    fontsPromise.catch(() => { fontsPromise = null; });
  }
  return fontsPromise;
}

/**
 * Renderiza `node` a un PNG blanco y negro puro de `width` px de ancho. El alto
 * lo decide el contenido. Umbral 50 %: lo gris (antialiasing) va a blanco o negro.
 */
export async function renderToPng(node: ReactNode, width: number = TICKET_WIDTH): Promise<Buffer> {
  const [{ default: satori }, { Resvg }, { default: sharp }, fonts] = await Promise.all([
    import('satori'),
    import('@resvg/resvg-js'),
    import('sharp'),
    loadFonts(),
  ]);

  const svg = await satori(node, { width, fonts });
  const rendered = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: '#ffffff',
    font: { loadSystemFonts: false },
  }).render();

  return sharp(rendered.pixels, {
    raw: { width: rendered.width, height: rendered.height, channels: 4 },
  })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(128)
    .png({ palette: true, colours: 2, compressionLevel: 9 })
    .toBuffer();
}
