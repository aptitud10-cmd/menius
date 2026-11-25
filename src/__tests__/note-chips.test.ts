import { describe, it, expect } from 'vitest';
import { pickNoteChips, noteHasChip, toggleNoteChip, type NoteChipRule } from '@/lib/note-chips';

const RULES: NoteChipRule[] = [
  {
    whenGroup: 'Sugar in it?',
    chips: [
      { en: '1 sugar', es: '1 de azúcar' },
      { en: 'Extra hot', es: 'Bien caliente', hideIfGroups: ['Iced coffee or iced tea'] },
    ],
  },
  { categoryIds: ['burgers'], chips: [{ en: 'Cut in half', es: 'Cortada a la mitad' }, { en: 'Bun well toasted', es: 'Pan bien tostado' }] },
];

describe('pickNoteChips', () => {
  it('matches by group name, regardless of category (coffee lives with the sodas)', () => {
    expect(pickNoteChips(RULES, 'drinks', [{ name: 'Sugar in it? If not, it comes on the side' }], 'en')).toEqual(['1 sugar', 'Extra hot']);
    expect(pickNoteChips(RULES, 'drinks', [{ name: 'Which size?' }], 'en')).toEqual([]);
  });

  it('hides a chip the dish already asks as an option', () => {
    const iced = [{ name: 'Iced coffee or iced tea?' }, { name: 'Sugar in it? If not, it comes on the side' }];
    expect(pickNoteChips(RULES, 'drinks', iced, 'en')).toEqual(['1 sugar']);
  });

  it('matches by category and speaks the diner language', () => {
    expect(pickNoteChips(RULES, 'burgers', [], 'es')).toEqual(['Cortada a la mitad', 'Pan bien tostado']);
  });

  it('skips dishes the rule excludes (pasta that is only oil and garlic)', () => {
    const rules: NoteChipRule[] = [{ categoryIds: ['pastas'], exceptProductIds: ['aglio'], chips: [{ en: 'Light sauce', es: 'Poca salsa' }] }];
    expect(pickNoteChips(rules, 'pastas', [], 'en', 'vodka')).toEqual(['Light sauce']);
    expect(pickNoteChips(rules, 'pastas', [], 'en', 'aglio')).toEqual([]);
  });

  it('returns nothing without rules', () => {
    expect(pickNoteChips(undefined, 'burgers', [], 'en')).toEqual([]);
  });
});

describe('toggleNoteChip', () => {
  it('appends after what the diner typed and removes on a second tap', () => {
    const once = toggleNoteChip('no onions', 'Cut in half');
    expect(once).toBe('no onions, Cut in half');
    expect(noteHasChip(once, 'cut in half')).toBe(true);
    expect(toggleNoteChip(once, 'Cut in half')).toBe('no onions');
    expect(toggleNoteChip('', '1 sugar')).toBe('1 sugar');
  });

  it('does not go past the 200-character limit', () => {
    const long = 'x'.repeat(195);
    expect(toggleNoteChip(long, 'Cut in half')).toBe(long);
  });
});
