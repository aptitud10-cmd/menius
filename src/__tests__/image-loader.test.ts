import { describe, it, expect } from 'vitest';
import { supabaseLoader, getBlurUrl, getOptimizedImageProps } from '@/lib/image-loader';

/**
 * Este archivo existe por un bug concreto.
 *
 * El loader excluía del transform a todo lo que estuviera bajo /ai- o
 * /admin-regen/, con dos justificaciones escritas en un comentario: que esas
 * imágenes ya venían optimizadas, y que /render/image/ devolvía 400 para ellas.
 * Medido contra prod el 2026-09-29 las dos eran falsas — 68 imágenes de
 * Buccaneer pesaban 51.9 MB, promediando 763 KB contra los 41 KB de las que sí
 * se transformaban. 20 de 20 transformaron sin error, la más pesada incluida.
 *
 * No había un solo test sobre el loader, así que la regla equivocada nunca
 * tuvo nada que la contradijera. Estos tests fijan lo que se midió.
 */

const STORAGE = 'https://xyz.supabase.co/storage/v1/object/public/product-images';
const RENDER = 'https://xyz.supabase.co/storage/v1/render/image/public/product-images';

describe('supabaseLoader', () => {
  it('transforma una imagen normal de storage', () => {
    const out = supabaseLoader({ src: `${STORAGE}/foo.jpg`, width: 640 });
    expect(out).toBe(`${RENDER}/foo.jpg?width=640&quality=75&format=webp`);
  });

  it('respeta el quality recibido', () => {
    const out = supabaseLoader({ src: `${STORAGE}/foo.jpg`, width: 640, quality: 50 });
    expect(out).toContain('quality=50');
  });

  // El corazón del fix: estas dos rutas eran la excepción que pesaba 10x.
  it('TRANSFORMA las imágenes bajo /admin-regen/ (antes las servía crudas)', () => {
    const src = `${STORAGE}/admin-regen/rest-id/prod-id-123.webp`;
    const out = supabaseLoader({ src, width: 640 });
    expect(out).toContain('/render/image/public/');
    expect(out).toContain('width=640');
    expect(out).not.toBe(src);
  });

  it('TRANSFORMA las imágenes cuyo nombre empieza con ai-', () => {
    const src = `${STORAGE}/ai-generated-burger.jpg`;
    const out = supabaseLoader({ src, width: 828 });
    expect(out).toContain('/render/image/public/');
    expect(out).not.toBe(src);
  });

  it('deja intacta una URL que no es de Supabase storage', () => {
    const src = 'https://images.unsplash.com/photo-123';
    expect(supabaseLoader({ src, width: 640 })).toBe(src);
  });

  it('devuelve string vacío si no hay src', () => {
    expect(supabaseLoader({ src: '', width: 640 })).toBe('');
  });

  it('usa & cuando la URL ya tiene query string', () => {
    const out = supabaseLoader({ src: `${STORAGE}/foo.jpg?token=abc`, width: 640 });
    expect(out).toContain('?token=abc&width=640');
  });
});

describe('getBlurUrl', () => {
  // Una miniatura real acá gastaba una transformación facturable POR IMAGEN,
  // y fue la mitad del consumo que excedió la cuota (236/100) en agosto 2026.
  it('devuelve un data URI, nunca una URL de red', () => {
    const blur = getBlurUrl(`${STORAGE}/foo.jpg`);
    expect(blur).toMatch(/^data:image\/svg\+xml/);
    expect(blur).not.toContain('supabase.co');
  });

  it('devuelve undefined sin src', () => {
    expect(getBlurUrl(null)).toBeUndefined();
    expect(getBlurUrl(undefined)).toBeUndefined();
    expect(getBlurUrl('')).toBeUndefined();
  });
});

describe('getOptimizedImageProps', () => {
  it('adjunta el loader para URLs de storage, incluidas las admin-regen', () => {
    for (const src of [`${STORAGE}/foo.jpg`, `${STORAGE}/admin-regen/r/p.webp`]) {
      const props = getOptimizedImageProps(src);
      expect(props.loader).toBe(supabaseLoader);
      expect(props.placeholder).toBe('blur');
    }
  });

  it('no adjunta loader para URLs externas', () => {
    const props = getOptimizedImageProps('https://images.unsplash.com/photo-1');
    expect(props.loader).toBeUndefined();
  });
});
