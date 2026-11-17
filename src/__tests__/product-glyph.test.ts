import { describe, it, expect } from 'vitest';
import { Coffee, CupSoda, Croissant, Martini, Fish, Sandwich, CakeSlice, EggFried, Salad, UtensilsCrossed, Beer, Wine, Soup } from 'lucide-react';
import { productGlyph } from '@/components/public/ProductGlyph';

describe('productGlyph', () => {
  it.each([
    ['Orange Juice', CupSoda],
    ['Fruit Fusion Smoothie', CupSoda],
    ['Chocolate Milkshake', CupSoda],
    ['Iced Tea', Coffee],
    ['Coffee', Coffee],
    ['Café con leche', Coffee],
    ['Buttered Roll', Croissant],
    ['Homemade Muffin', Croissant],
    ['Sex on the Beach', Martini],
    ['Corona', Beer],
    ["Fisherman's Platter", Fish],
    ['Cheeseburger Deluxe', Sandwich],
    ['Chocolate Layer Cake', CakeSlice],
    ['Two Eggs, Any Style', EggFried],
    ['Tuna Salad Platter', Salad],
    ['Something Else', UtensilsCrossed],
  ])('%s', (name, icon) => {
    expect(productGlyph(name)).toBe(icon);
  });
});

describe('productGlyph · Buccaneer drinks without photos', () => {
  it.each([
    ['Smoothie Colada', CupSoda],
    ['L.I. Iced Tea', Martini],
    ['Whiskey Sour', Martini],
    ['White Russian', Martini],
    ['Bud Light', Beer],
    ["Beck's", Beer],
    ['Merlot', Wine],
    ['Hand-Rolled Water Bagel', Croissant],
    ['Spinach Pie Deluxe', UtensilsCrossed],
    ['Chicken Salad Platter', Salad],
    ['Soup of the Day', Soup],
  ])('%s', (name, icon) => {
    expect(productGlyph(name)).toBe(icon);
  });
});
