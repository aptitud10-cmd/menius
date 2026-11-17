import { describe, it, expect } from 'vitest';
import { shortName } from '@/lib/pwa-short-name';

describe('shortName', () => {
  it('keeps short names', () => expect(shortName('Totto')).toBe('Totto'));
  it('whole words, never "Buccaneer Di"', () => expect(shortName('Buccaneer Diner')).toBe('Buccaneer'));
  it('drops a dangling connector', () => expect(shortName('La Casa de Pepe')).toBe('La Casa'));
  it('slices only a single over-long word', () => expect(shortName('Supercalifragilistic')).toBe('Supercalifra'));
});
