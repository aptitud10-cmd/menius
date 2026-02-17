import type { Restaurant, Category, Product } from '@/types';

// ============================================================
// MENIUS — Buccaneer Diner Demo (English)
// Structure only — products will be added when menu is provided
// ============================================================

const RESTAURANT_ID = 'demo-buccaneer-id';
const now = new Date().toISOString();

// Category IDs
const CAT_APPETIZERS = 'buc-cat-appetizers';
const CAT_MAINS = 'buc-cat-mains';
const CAT_GREEK = 'buc-cat-greek';
const CAT_BURGERS = 'buc-cat-burgers';
const CAT_DESSERTS = 'buc-cat-desserts';
const CAT_DRINKS = 'buc-cat-drinks';

export const buccaneerRestaurant: Restaurant = {
  id: RESTAURANT_ID,
  name: 'Buccaneer Diner',
  slug: 'buccaneer-diner',
  owner_user_id: 'demo-owner-en',
  timezone: 'America/New_York',
  currency: 'USD',
  logo_url: null,
  cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop&q=80',
  description: 'Where Greek tradition meets American comfort. Fresh ingredients, bold flavors, and a warm atmosphere since 1987.',
  address: '742 Harbor Blvd, Oceanside, CA 92054',
  phone: '+1 (760) 555-0147',
  email: 'hello@buccaneerdiner.com',
  website: 'https://menius.app',
  is_active: true,
  operating_hours: {
    monday: { open: '07:00', close: '22:00' },
    tuesday: { open: '07:00', close: '22:00' },
    wednesday: { open: '07:00', close: '22:00' },
    thursday: { open: '07:00', close: '23:00' },
    friday: { open: '07:00', close: '23:30' },
    saturday: { open: '08:00', close: '23:30' },
    sunday: { open: '08:00', close: '21:00' },
  },
  created_at: now,
};

export const buccaneerCategories: Category[] = [
  { id: CAT_APPETIZERS, restaurant_id: RESTAURANT_ID, name: 'Appetizers', sort_order: 1, is_active: true, created_at: now },
  { id: CAT_MAINS, restaurant_id: RESTAURANT_ID, name: 'Main Courses', sort_order: 2, is_active: true, created_at: now },
  { id: CAT_GREEK, restaurant_id: RESTAURANT_ID, name: 'Greek Specialties', sort_order: 3, is_active: true, created_at: now },
  { id: CAT_BURGERS, restaurant_id: RESTAURANT_ID, name: 'Burgers & Sandwiches', sort_order: 4, is_active: true, created_at: now },
  { id: CAT_DESSERTS, restaurant_id: RESTAURANT_ID, name: 'Desserts', sort_order: 5, is_active: true, created_at: now },
  { id: CAT_DRINKS, restaurant_id: RESTAURANT_ID, name: 'Drinks', sort_order: 6, is_active: true, created_at: now },
];

// Products will be populated when the user provides the menu photo
export const buccaneerProducts: Product[] = [];
