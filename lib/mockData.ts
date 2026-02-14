import { MenuCategory, MenuItem } from '@/types/menu'

const categories: MenuCategory[] = [
  {
    id: 'tacos',
    name: 'Tacos',
    description: 'Auténticos tacos mexicanos',
    order: 0
  },
  {
    id: 'burritos',
    name: 'Burritos',
    description: 'Burritos estilo californiano',
    order: 1
  },
  {
    id: 'quesadillas',
    name: 'Quesadillas',
    description: 'Quesadillas con queso fundido',
    order: 2
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    description: 'Bebidas refrescantes',
    order: 3
  }
]

const items: MenuItem[] = [
  // Tacos
  {
    id: 'taco-pastor',
    name: 'Taco al Pastor',
    description: 'Carne de cerdo marinada con piña, cilantro y cebolla',
    price: 3.50,
    categoryId: 'tacos',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    available: true,
    popular: true,
    spicy: true,
    vegetarian: false
  },
  {
    id: 'taco-asada',
    name: 'Taco de Asada',
    description: 'Carne de res a la parrilla con cilantro y cebolla',
    price: 3.50,
    categoryId: 'tacos',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
    available: true,
    popular: true,
    spicy: false,
    vegetarian: false
  },
  {
    id: 'taco-pollo',
    name: 'Taco de Pollo',
    description: 'Pollo marinado con especias mexicanas',
    price: 3.00,
    categoryId: 'tacos',
    image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: false
  },
  {
    id: 'taco-veggie',
    name: 'Taco Vegetariano',
    description: 'Vegetales asados con frijoles negros y aguacate',
    price: 2.75,
    categoryId: 'tacos',
    image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: true
  },

  // Burritos
  {
    id: 'burrito-carne',
    name: 'Burrito de Carne Asada',
    description: 'Tortilla de harina rellena con carne asada, arroz, frijoles, queso y guacamole',
    price: 8.50,
    categoryId: 'burritos',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
    available: true,
    popular: true,
    spicy: false,
    vegetarian: false
  },
  {
    id: 'burrito-pollo',
    name: 'Burrito de Pollo',
    description: 'Pollo a la parrilla con arroz, frijoles y pico de gallo',
    price: 7.50,
    categoryId: 'burritos',
    image: 'https://images.unsplash.com/photo-1574343635105-3ce8c81e48a7?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: false
  },
  {
    id: 'burrito-veggie',
    name: 'Burrito Vegetariano',
    description: 'Vegetales asados, arroz integral, frijoles negros y salsa verde',
    price: 7.00,
    categoryId: 'burritos',
    image: 'https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: true
  },

  // Quesadillas
  {
    id: 'quesadilla-queso',
    name: 'Quesadilla de Queso',
    description: 'Tortilla de harina con mezcla de quesos fundidos',
    price: 5.50,
    categoryId: 'quesadillas',
    image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400',
    available: true,
    popular: true,
    spicy: false,
    vegetarian: true
  },
  {
    id: 'quesadilla-pollo',
    name: 'Quesadilla de Pollo',
    description: 'Pollo marinado con queso fundido y vegetales',
    price: 7.00,
    categoryId: 'quesadillas',
    image: 'https://images.unsplash.com/photo-1593759608979-65d7be3a5d3d?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: false
  },
  {
    id: 'quesadilla-champiñones',
    name: 'Quesadilla de Champiñones',
    description: 'Champiñones salteados con queso oaxaca',
    price: 6.50,
    categoryId: 'quesadillas',
    image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: true
  },

  // Bebidas
  {
    id: 'horchata',
    name: 'Horchata',
    description: 'Bebida tradicional de arroz con canela',
    price: 2.50,
    categoryId: 'bebidas',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400',
    available: true,
    popular: true,
    spicy: false,
    vegetarian: true
  },
  {
    id: 'jamaica',
    name: 'Agua de Jamaica',
    description: 'Refrescante bebida de flor de jamaica',
    price: 2.50,
    categoryId: 'bebidas',
    image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400',
    available: true,
    popular: true,
    spicy: false,
    vegetarian: true
  },
  {
    id: 'tamarindo',
    name: 'Agua de Tamarindo',
    description: 'Dulce y refrescante agua de tamarindo',
    price: 2.50,
    categoryId: 'bebidas',
    image: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: true
  },
  {
    id: 'coca-cola',
    name: 'Coca-Cola Mexicana',
    description: 'Coca-Cola de botella de vidrio',
    price: 2.00,
    categoryId: 'bebidas',
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
    available: true,
    popular: false,
    spicy: false,
    vegetarian: true
  }
]

export const mockCategories = categories
export const mockItems = items
