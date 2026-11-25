import { describe, expect, it } from 'vitest';
import { tHint } from '@/lib/i18n';

describe('tHint — note shown when a modifier option is picked', () => {
  const bacon = {
    translations: {
      en: { hint: 'Tip: the Bacon Burger already comes with bacon for $12.95.' },
      es: { name: 'Bacon', hint: 'Consejo: la Bacon Burger ya trae bacon por $12.95.' },
    },
  };

  it("uses the diner's locale", () => {
    expect(tHint(bacon, 'es', 'en')).toBe('Consejo: la Bacon Burger ya trae bacon por $12.95.');
    expect(tHint(bacon, 'en', 'en')).toBe('Tip: the Bacon Burger already comes with bacon for $12.95.');
  });

  it("falls back to the restaurant's default locale", () => {
    const onlyEn = { translations: { en: { hint: 'Tip in English' } } };
    expect(tHint(onlyEn, 'es', 'en')).toBe('Tip in English');
  });

  it('is null when the option has no hint (or a blank one)', () => {
    expect(tHint({ translations: null }, 'en', 'en')).toBeNull();
    expect(tHint({ translations: { es: { name: 'Jamón' } } }, 'es', 'en')).toBeNull();
    expect(tHint({ translations: { en: { hint: '   ' } } }, 'en', 'en')).toBeNull();
  });
});
