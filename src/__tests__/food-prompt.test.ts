import { describe, it, expect } from 'vitest';
import { buildFoodPrompt } from '@/lib/ai/food-prompt';

const prompt = (
  productName: string,
  opts: { description?: string; category?: string; cuisine?: string } = {},
) =>
  buildFoodPrompt({
    productName,
    description: opts.description ?? '',
    category: opts.category ?? null,
    cuisine: opts.cuisine ?? null,
    style: null,
  });

/** Just the PLATING IDENTITY line. Asserting against the whole prompt gives
 *  false failures: the BRAND SYSTEM names Talavera and terracotta too, as
 *  things the image must NEVER contain. */
const plating = (...args: Parameters<typeof prompt>) =>
  prompt(...args).match(/PLATING IDENTITY:[^\n]*/)?.[0] ?? '';

/** The plating line with its NO/NEVER clauses stripped, so a test asking "is
 *  this plated as Mexican?" isn't satisfied by the words "NO Talavera pottery".
 *  Forbidding a thing and instructing it read identically to a bare regex. */
const platingInstructions = (...args: Parameters<typeof prompt>) =>
  plating(...args).replace(/\b(NO|NEVER)\b[^.,]*/gi, '');

// Every case here was a real image the pipeline would have produced for
// Buccaneer Diner. Unanchored regexes match the middle of words, and the drink
// checks run before the food ones, so one substring decided the whole plate.
describe('container matching is word-anchored', () => {
  it('does not serve a steak in a teacup', () => {
    // /tea/ matches s-TEA-k. Twelve steak dishes were being plated as tea.
    const p = prompt('Ribeye Steak', { description: '14 oz ribeye grilled to order' });
    expect(p).not.toMatch(/tea color|ceramic mug/);
    expect(p).toMatch(/matte black or dark ceramic plate|slate serving stone/);
  });

  it('does not serve a bagel as bottled water', () => {
    // /water/ matches "Hand Rolled Water Bagels" — a whole category.
    const p = prompt('Hand-Rolled Water Bagel', { description: 'Fresh hand-rolled bagel' });
    expect(p).not.toMatch(/glass bottle of water|crushed ice/);
  });

  it('still serves actual water as water', () => {
    expect(prompt('Seltzer Water')).toMatch(/glass bottle of water/);
  });

  it('still serves actual tea as tea', () => {
    expect(prompt('Assorted Herbal Teas')).toMatch(/tea color|ceramic mug/);
  });

  it('does not serve sour cream in a whiskey glass', () => {
    const p = prompt('Potato Skins', { description: 'Bacon, cheddar and sour cream' });
    expect(p).not.toMatch(/whiskey rocks glass/);
  });

  it('still serves a whiskey sour in a rocks glass', () => {
    expect(prompt('Whiskey Sour')).toMatch(/whiskey rocks glass/);
  });
});

describe('declared cuisine wins over name sniffing', () => {
  it('keeps a diner quesadilla out of Mexican pottery', () => {
    // The word "quesadilla" triggered the Mexican map: Talavera plate, cilantro
    // and lime — food from a different restaurant than the one selling it.
    const line = platingInstructions('Steak Quesadillas', {
      description: 'Grilled steak with melted cheese in a flour tortilla',
      category: 'Appetizers',
      cuisine: 'Diner',
    });
    expect(line).not.toMatch(/Talavera|terracotta|Cilantro, lime wedge/);
    expect(line).toMatch(/Classic American diner presentation/);
  });

  it('keeps a diner burrito out of Mexican pottery', () => {
    const line = platingInstructions('Southwestern Burrito', {
      description: 'Flour tortilla, eggs, cheese, peppers',
      cuisine: 'Diner',
    });
    expect(line).not.toMatch(/Talavera|hand-painted/);
    expect(line).toMatch(/Classic American diner presentation/);
  });

  it('still plates a real Mexican restaurant as Mexican', () => {
    expect(plating('Tacos al Pastor', { cuisine: 'Mexican' })).toMatch(/Talavera|clay/);
  });

  it('falls back to name sniffing when no cuisine is declared', () => {
    expect(plating('Tacos al Pastor')).toMatch(/Talavera|clay/);
  });
});

describe('diner plating instructions do not contradict the brand system', () => {
  it('leaves plate colour to the brand system', () => {
    // PLATING IDENTITY naming a plate colour fought the BRAND SYSTEM line that
    // owns surface and plating, sending the model two different plates.
    const line = plating('Mozzarella Sticks', { cuisine: 'Diner' });
    expect(line).not.toMatch(/white ceramic plate/);
    expect(line).toMatch(/no fine-dining tweezer plating/);
  });
});
