import { describe, it, expect } from 'vitest';
import { isAllergyText } from '@/components/orders/counter/ui';
import { sanitizeMultiline, sanitizeText, stripControlChars } from '@/lib/sanitize';

describe('isAllergyText (Counter / KDS)', () => {
  it('marca alergias reales', () => {
    for (const note of [
      'Allergy: peanuts', 'nut allergy', 'soy alérgico al maní', 'sin gluten por favor',
      'celiac', 'lactose-free milk', 'no dairy', 'shellfish allergy', 'sin nueces', 'Alergia a mariscos',
    ]) expect(isAllergyText(note), note).toBe(true);
  });

  it('no marca palabras que solo contienen el pedazo', () => {
    for (const note of [
      'ready in 10 minutes', 'add a donut', 'coconut water', 'many napkins please',
      'mango smoothie', 'manual card', 'extra butter',
    ]) expect(isAllergyText(note), note).toBe(false);
  });
});

describe('caracteres de control en textos del cliente', () => {
  const ESC = String.fromCharCode(27);
  const GS = String.fromCharCode(29);
  const NUL = String.fromCharCode(0);

  it('se quitan los comandos de impresora y quedan saltos de línea y tabs', () => {
    expect(stripControlChars(`hola${ESC}p${NUL}${GS}V\nchau\tok`)).toBe('holapV\nchau\tok');
  });

  it('sanitizeMultiline y sanitizeText los quitan', () => {
    expect(sanitizeMultiline(`sin cebolla${ESC}@\nbien cocido`)).toBe('sin cebolla@\nbien cocido');
    expect(sanitizeText(`Ana${GS}V${NUL}`)).toBe('AnaV');
  });
});
