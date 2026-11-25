import { describe, it, expect } from 'vitest';
import { csvCell, csvRow } from '@/lib/csv';

describe('csvCell', () => {
  it('neutraliza textos que Excel ejecutaría como fórmula', () => {
    expect(csvCell('=HYPERLINK("http://x","clic")')).toBe(`"'=HYPERLINK(""http://x"",""clic"")"`);
    expect(csvCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(csvCell('+cmd|calc')).toBe(`'+cmd|calc`);
    expect(csvCell('-2+3+cmd')).toBe(`'-2+3+cmd`);
    expect(csvCell('\tAna')).toBe(`'\tAna`);
  });

  it('deja tal cual teléfonos, montos y textos normales', () => {
    expect(csvCell('+1 (718) 555-0123')).toBe('+1 (718) 555-0123');
    expect(csvCell('-12.50')).toBe('-12.50');
    expect(csvCell(-12.5)).toBe('-12.5');
    expect(csvCell('Ana López')).toBe('Ana López');
    expect(csvCell(null)).toBe('');
  });

  it('entrecomilla comas, comillas y saltos de línea', () => {
    expect(csvCell('sin cebolla, bien cocido')).toBe('"sin cebolla, bien cocido"');
    expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(csvCell('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(csvRow(['a', 1, '=1+1'])).toBe("a,1,'=1+1");
  });
});
