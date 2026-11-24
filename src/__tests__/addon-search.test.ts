import { describe, it, expect } from 'vitest';
import { matchScore, normalize, searchAddons, searchTerms, type SearchableOption } from '@/lib/addon-search';

const opt = (id: string, name: string, es?: string): SearchableOption => ({
  id,
  name,
  translations: es ? { es: { name: es } } : null,
});

// Agregados del buscador de una Beef Burger (catálogo POS) y sus preguntas reales.
const search = {
  id: 'g-search',
  options: [
    opt('s-ham', 'Ham', 'Jamón'),
    opt('s-turkey-bacon', 'Turkey Bacon', 'Tocino de pavo'),
    opt('s-avocado', 'Avocado', 'Aguacate'),
    opt('s-jalapenos', 'Jalapeños', 'Jalapeños'),
    opt('s-peppers', 'Peppers', 'Pimientos'),
    opt('s-mushrooms', 'Mushrooms', 'Champiñones'),
    opt('s-pepper-jack', 'Pepper Jack', 'Pepper jack'),
    opt('s-egg', 'Egg', 'Huevo'),
  ],
};
const meatGroup = {
  id: 'g-meat',
  options: [opt('m-bacon', 'Bacon'), opt('m-canadian', 'Canadian Bacon'), opt('m-ham', 'Ham')],
};
const cheeseGroup = {
  id: 'g-cheese',
  options: [opt('c-american', 'American'), opt('c-cheddar', 'Cheddar'), opt('c-swiss', 'Swiss')],
};

describe('normalize', () => {
  it('saca tildes, mayúsculas y signos', () => {
    expect(normalize('  Jalapeños! ')).toBe('jalapenos');
    expect(normalize('Champiñones')).toBe('champinones');
    expect(normalize('Lettuce & Tomato')).toBe('lettuce & tomato');
  });
});

describe('searchTerms', () => {
  it('incluye español y sinónimos', () => {
    const terms = searchTerms(opt('a', 'Avocado', 'Aguacate'));
    expect(terms).toContain('aguacate');
    expect(terms).toContain('palta');
  });
  it('el queso Pepper Jack no hereda los sinónimos de pimiento', () => {
    expect(searchTerms(opt('p', 'Pepper Jack'))).not.toContain('pimiento');
    expect(searchTerms(opt('p', 'Peppers'))).toContain('pimiento');
  });
  it('"Ham" no se activa con palabras que solo la contienen', () => {
    expect(searchTerms(opt('h', 'Graham Crackers'))).not.toContain('jamon');
  });
});

describe('matchScore', () => {
  it('encuentra en inglés, en español y con sinónimos', () => {
    expect(matchScore('avocado', opt('a', 'Avocado'))).toBeGreaterThan(0);
    expect(matchScore('aguacate', opt('a', 'Avocado'))).toBeGreaterThan(0);
    expect(matchScore('palta', opt('a', 'Avocado'))).toBeGreaterThan(0);
    expect(matchScore('tocino', opt('b', 'Bacon'))).toBeGreaterThan(0);
    expect(matchScore('hongos', opt('m', 'Mushrooms'))).toBeGreaterThan(0);
  });
  it('tolera errores de tipeo y palabras a medio escribir', () => {
    expect(matchScore('avocad', opt('a', 'Avocado'))).toBeGreaterThan(0);
    expect(matchScore('avocaod', opt('a', 'Avocado'))).toBeGreaterThan(0);
    expect(matchScore('bacn', opt('b', 'Bacon'))).toBeGreaterThan(0);
    expect(matchScore('jalapeno', opt('j', 'Jalapeños'))).toBeGreaterThan(0);
    expect(matchScore('turk bac', opt('t', 'Turkey Bacon'))).toBeGreaterThan(0);
  });
  it('singular y plural son lo mismo', () => {
    expect(matchScore('tomato', opt('t', 'Tomatoes'))).toBe(100);
    expect(matchScore('mushroom', opt('m', 'Mushrooms'))).toBe(100);
  });
  it('no inventa coincidencias', () => {
    expect(matchScore('a', opt('a', 'Avocado'))).toBe(0);
    expect(matchScore('salmon', opt('a', 'Avocado'))).toBe(0);
    expect(matchScore('pimiento', opt('p', 'Pepper Jack'))).toBe(0);
    expect(matchScore('egg', opt('b', 'Bacon'))).toBe(0);
  });
  it('lo exacto pesa más que lo aproximado', () => {
    expect(matchScore('bacon', opt('b', 'Bacon'))).toBeGreaterThan(matchScore('bacon', opt('t', 'Turkey Bacon')));
  });
});

describe('searchAddons', () => {
  it('ofrece los agregados del buscador', () => {
    const r = searchAddons('aguacate', search, [meatGroup, cheeseGroup]);
    expect(r[0]).toMatchObject({ groupId: 'g-search', inSearchGroup: true });
    expect(r[0].option.id).toBe('s-avocado');
  });

  it('si el plato ya lo pregunta, manda a esa pregunta y no lo duplica', () => {
    const r = searchAddons('bacon', search, [meatGroup, cheeseGroup]);
    expect(r[0]).toMatchObject({ groupId: 'g-meat', inSearchGroup: false });
    // La pregunta de carnes aparece una sola vez aunque encajen Bacon y Canadian Bacon.
    expect(r.filter((m) => m.groupId === 'g-meat')).toHaveLength(1);
    // Turkey Bacon no está en la pregunta: sigue saliendo como agregado.
    expect(r.some((m) => m.option.id === 's-turkey-bacon')).toBe(true);
  });

  it('una opción del buscador con el mismo nombre que una pregunta no se repite', () => {
    const r = searchAddons('ham', search, [meatGroup]);
    expect(r.some((m) => m.option.id === 's-ham')).toBe(false);
    expect(r[0].groupId).toBe('g-meat');
  });

  it('"queso" encuentra la pregunta de quesos una vez, contando cuántas encajan', () => {
    const r = searchAddons('queso', search, [meatGroup, cheeseGroup]);
    const cheese = r.filter((m) => m.groupId === 'g-cheese');
    expect(cheese).toHaveLength(1);
    expect(cheese[0].groupMatches).toBe(3);
  });

  it('sin coincidencias o con una sola letra devuelve vacío', () => {
    expect(searchAddons('x', search, [meatGroup])).toEqual([]);
    expect(searchAddons('lobster', search, [meatGroup])).toEqual([]);
  });

  it('respeta el límite', () => {
    expect(searchAddons('e', search, []).length).toBe(0);
    expect(searchAddons('pe', search, [], 1).length).toBeLessThanOrEqual(1);
  });
});
