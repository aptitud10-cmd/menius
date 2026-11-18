import { describe, it, expect } from 'vitest';
import { Coffee, CupSoda, Martini, Fish, Sandwich, CakeSlice, EggFried, Salad, UtensilsCrossed, Beer, Wine, Soup, Croissant, Drumstick } from 'lucide-react';
import { productGlyph, Roll, Bagel, BreadSlice, Muffin, EnglishMuffin } from '@/components/public/ProductGlyph';

describe('productGlyph', () => {
  it.each([
    ['Orange Juice', CupSoda],
    ['Fruit Fusion Smoothie', CupSoda],
    ['Chocolate Milkshake', CupSoda],
    ['Iced Tea', Coffee],
    ['Coffee', Coffee],
    ['Café con leche', Coffee],
    ['Butter Croissant', Croissant],
    ['Sex on the Beach', Martini],
    ['Corona', Beer],
    ["Fisherman's Platter", Fish],
    ['Cheeseburger Deluxe', Sandwich],
    ['Bacon, Egg & Cheese on a Roll', EggFried],
    ['Chocolate Layer Cake', CakeSlice],
    ['Two Eggs, Any Style', EggFried],
    ['Buffalo Wings', Drumstick],
    ['Something Else', UtensilsCrossed],
  ])('%s', (name, icon) => {
    expect(productGlyph(name)).toBe(icon);
  });
});

// Every Buccaneer product without a photo (2026-11-18). The icon has to look
// like what's sold; when nothing honest fits it's the fork and knife.
describe('productGlyph · Buccaneer products without photos', () => {
  it.each([
    ['Buttered Roll', Roll],
    ['Homemade Muffin', Muffin],
    ['Jumbo English Muffin', EnglishMuffin],
    ['Multigrain Bread', BreadSlice],
    ['Hand-Rolled Water Bagel', Bagel],
    ['Monte Cristo', Sandwich],
    ['Guacamole Dip', UtensilsCrossed],
    ['Spinach Pie Deluxe', UtensilsCrossed],
    ['Grilled Breast of Chicken', UtensilsCrossed],
    ['Chicken Francaise', UtensilsCrossed],
    ['Chicken Cordon Bleu', UtensilsCrossed],
    ['Chicken Breast Saute', UtensilsCrossed],
    ['Chicken Marsala', UtensilsCrossed],
    ['Chicken Piccata', UtensilsCrossed],
    ['Buccaneer Combination', UtensilsCrossed],
    ['Soup of the Day', Soup],
    ['Chili', Soup],
    ['Tuna Salad Platter', Salad],
    ['Chicken Salad Platter', Salad],
    ['Shrimp Salad Platter', Salad],
    ['Stuffed California Avocado with Chicken Salad', Salad],
    ['Stuffed California Avocado with Tuna Salad', Salad],
    ['Stuffed California Avocado with Shrimp', Salad],
    ['Sea Breeze', Martini],
    ['Toasted Almond', Martini],
    ['Smoothie Colada', CupSoda],
    ['L.I. Iced Tea', Martini],
    ["Planter's Punch", Martini],
    ['Pina Colada', Martini],
    ['Whiskey Sour', Martini],
    ['White Russian', Martini],
    ['Mimosa', Martini],
    ['Merlot', Wine],
    ['Ruffino Chianti', Wine],
    ['Pinot Grigio', Wine],
    ['Bud Light', Beer],
    ["Beck's", Beer],
    ['Miller Lite', Beer],
    ['Presidente', Beer],
  ])('%s', (name, icon) => {
    expect(productGlyph(name)).toBe(icon);
  });
});
