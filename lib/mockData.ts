import { Restaurant, MenuCategory, MenuItem } from '@/types/menu'

export const mockRestaurant: Restaurant = {
  id: 'demo-restaurant-1',
  name: 'Taquería Los Primos',
  slug: 'taqueria-los-primos',
  description: 'Auténtica comida mexicana en el corazón de la ciudad. Tacos, burritos y más, preparados con recetas tradicionales.',
  logo_url: null,
  cover_image_url: null,
  phone: '(555) 123-4567',
  address: '123 Main Street, Austin, TX 78701',
  is_active: true,
  accepts_online_orders: true,
  delivery_enabled: true,
  pickup_enabled: true,
  dine_in_enabled: true,
  min_order_amount: 10,
  delivery_fee: 2.99,
  tax_rate: 0.0825, // 8.25% Texas
  business_hours: {
    monday: { open: '11:00', close: '22:00' },
    tuesday: { open: '11:00', close: '22:00' },
    wednesday: { open: '11:00', close: '22:00' },
    thursday: { open: '11:00', close: '22:00' },
    friday: { open: '11:00', close: '23:00' },
    saturday: { open: '10:00', close: '23:00' },
    sunday: { open: '10:00', close: '21:00' },
  }
}

export const mockCategories: MenuCategory[] = [
  {
    id: 'cat-1',
    restaurant_id: 'demo-restaurant-1',
    name: 'Tacos',
    description: 'Tacos auténticos con tortillas hechas a mano',
    display_order: 0,
    is_active: true
  },
  {
    id: 'cat-2',
    restaurant_id: 'demo-restaurant-1',
    name: 'Burritos',
    description: 'Burritos grandes y deliciosos',
    display_order: 1,
    is_active: true
  },
  {
    id: 'cat-3',
    restaurant_id: 'demo-restaurant-1',
    name: 'Quesadillas',
    description: 'Quesadillas con queso derretido',
    display_order: 2,
    is_active: true
  },
  {
    id: 'cat-4',
    restaurant_id: 'demo-restaurant-1',
    name: 'Entradas',
    description: 'Para empezar',
    display_order: 3,
    is_active: true
  },
  {
    id: 'cat-5',
    restaurant_id: 'demo-restaurant-1',
    name: 'Bebidas',
    description: 'Refrescantes bebidas',
    display_order: 4,
    is_active: true
  },
  {
    id: 'cat-6',
    restaurant_id: 'demo-restaurant-1',
    name: 'Postres',
    description: 'Dulces tradiciones',
    display_order: 5,
    is_active: true
  }
]

export const mockMenuItems: MenuItem[] = [
  // TACOS
  {
    id: 'item-1',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-1',
    name: 'Taco al Pastor',
    description: 'Carne de cerdo marinada con especias, piña, cebolla y cilantro',
    price: 3.50,
    is_available: true,
    is_featured: true,
    is_popular: true,
    spicy_level: 1,
    dietary_tags: [],
    modifiers: [
      {
        id: 'mod-1',
        name: 'Tipo de tortilla',
        required: true,
        options: [
          { id: 'opt-1', name: 'Maíz', price: 0 },
          { id: 'opt-2', name: 'Harina', price: 0.50 }
        ]
      },
      {
        id: 'mod-2',
        name: 'Extras',
        required: false,
        options: [
          { id: 'opt-3', name: 'Aguacate', price: 1.50 },
          { id: 'opt-4', name: 'Queso extra', price: 1.00 },
          { id: 'opt-5', name: 'Crema', price: 0.75 }
        ]
      }
    ]
  },
  {
    id: 'item-2',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-1',
    name: 'Taco de Carne Asada',
    description: 'Carne de res marinada a la parrilla con cebolla, cilantro y limón',
    price: 4.00,
    is_available: true,
    is_featured: false,
    is_popular: true,
    spicy_level: 0,
    dietary_tags: [],
    modifiers: [
      {
        id: 'mod-1',
        name: 'Tipo de tortilla',
        required: true,
        options: [
          { id: 'opt-1', name: 'Maíz', price: 0 },
          { id: 'opt-2', name: 'Harina', price: 0.50 }
        ]
      }
    ]
  },
  {
    id: 'item-3',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-1',
    name: 'Taco de Pollo',
    description: 'Pollo marinado a la parrilla con pico de gallo',
    price: 3.25,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: [],
  },
  {
    id: 'item-4',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-1',
    name: 'Taco Vegetariano',
    description: 'Verduras a la parrilla, frijoles, queso y guacamole',
    price: 3.75,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: ['vegetarian'],
  },

  // BURRITOS
  {
    id: 'item-5',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-2',
    name: 'Burrito California',
    description: 'Carne asada, papas fritas, queso, crema, guacamole y pico de gallo',
    price: 12.99,
    is_available: true,
    is_featured: true,
    is_popular: true,
    spicy_level: 0,
    dietary_tags: [],
    modifiers: [
      {
        id: 'mod-3',
        name: 'Proteína',
        required: true,
        options: [
          { id: 'opt-6', name: 'Carne Asada', price: 0 },
          { id: 'opt-7', name: 'Pollo', price: -1.00 },
          { id: 'opt-8', name: 'Al Pastor', price: 0 },
          { id: 'opt-9', name: 'Vegetariano', price: -2.00 }
        ]
      }
    ]
  },
  {
    id: 'item-6',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-2',
    name: 'Burrito de Pollo',
    description: 'Pollo a la parrilla, arroz, frijoles, lechuga, queso y salsa',
    price: 10.99,
    is_available: true,
    is_featured: false,
    spicy_level: 1,
    dietary_tags: [],
  },
  {
    id: 'item-7',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-2',
    name: 'Burrito Bowl',
    description: 'Todo lo del burrito pero en bowl (sin tortilla)',
    price: 11.49,
    is_available: true,
    is_featured: false,
    spicy_level: 1,
    dietary_tags: ['gluten-free'],
  },

  // QUESADILLAS
  {
    id: 'item-8',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-3',
    name: 'Quesadilla de Queso',
    description: 'Tortilla de harina con queso derretido',
    price: 7.99,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: ['vegetarian'],
    modifiers: [
      {
        id: 'mod-4',
        name: 'Agregar proteína',
        required: false,
        options: [
          { id: 'opt-10', name: 'Pollo', price: 3.00 },
          { id: 'opt-11', name: 'Carne Asada', price: 4.00 },
          { id: 'opt-12', name: 'Al Pastor', price: 3.50 }
        ]
      }
    ]
  },
  {
    id: 'item-9',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-3',
    name: 'Quesadilla Suprema',
    description: 'Carne asada, queso, guacamole, crema y pico de gallo',
    price: 12.99,
    is_available: true,
    is_featured: true,
    spicy_level: 0,
    dietary_tags: [],
  },

  // ENTRADAS
  {
    id: 'item-10',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-4',
    name: 'Guacamole Fresco',
    description: 'Aguacate, cilantro, cebolla, tomate, limón y chips',
    price: 8.99,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: ['vegan', 'gluten-free'],
  },
  {
    id: 'item-11',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-4',
    name: 'Nachos Supreme',
    description: 'Chips de tortilla, queso derretido, frijoles, jalapeños, crema y guacamole',
    price: 11.99,
    is_available: true,
    is_featured: true,
    is_popular: true,
    spicy_level: 2,
    dietary_tags: ['vegetarian'],
  },
  {
    id: 'item-12',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-4',
    name: 'Elote',
    description: 'Mazorca de maíz con mayonesa, queso cotija, chile y limón',
    price: 5.99,
    is_available: true,
    is_featured: false,
    spicy_level: 1,
    dietary_tags: ['vegetarian'],
  },

  // BEBIDAS
  {
    id: 'item-13',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-5',
    name: 'Horchata',
    description: 'Bebida de arroz con canela',
    price: 3.50,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: ['vegetarian'],
    modifiers: [
      {
        id: 'mod-5',
        name: 'Tamaño',
        required: true,
        options: [
          { id: 'opt-13', name: 'Chico', price: 0 },
          { id: 'opt-14', name: 'Grande', price: 1.50 }
        ]
      }
    ]
  },
  {
    id: 'item-14',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-5',
    name: 'Jamaica',
    description: 'Agua de flor de jamaica',
    price: 3.50,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: ['vegan'],
  },
  {
    id: 'item-15',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-5',
    name: 'Coca-Cola',
    description: 'Refresco',
    price: 2.50,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: [],
  },

  // POSTRES
  {
    id: 'item-16',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-6',
    name: 'Churros',
    description: 'Churros crujientes con azúcar y canela, servidos con chocolate',
    price: 6.99,
    is_available: true,
    is_featured: true,
    is_popular: true,
    spicy_level: 0,
    dietary_tags: ['vegetarian'],
  },
  {
    id: 'item-17',
    restaurant_id: 'demo-restaurant-1',
    category_id: 'cat-6',
    name: 'Flan',
    description: 'Flan casero de vainilla',
    price: 5.99,
    is_available: true,
    is_featured: false,
    spicy_level: 0,
    dietary_tags: ['vegetarian'],
  },
]
