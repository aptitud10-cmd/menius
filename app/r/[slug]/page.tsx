"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MenuHeader } from '@/components/menu/MenuHeader'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { ProductList } from '@/components/menu/ProductList'
import { CartBottomBar } from '@/components/menu/CartBottomBar'
import { CartDrawer } from '@/components/menu/CartDrawer'
import { ProductModal } from '@/components/menu/ProductModal'
import { mockCategories, mockItems } from '@/lib/mockData'
import { MenuItem } from '@/types/menu'
import { useCartStore } from '@/lib/stores/cartStore'

export default function MenuPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState(mockCategories[0]?.id || '')
  const cart = useCartStore()

  const restaurantName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <div className="min-h-screen bg-gray-50">
      <MenuHeader 
        restaurantName={restaurantName}
        itemCount={cart.items.length}
        onCartClick={() => setIsCartOpen(true)}
      />

      <div className="pt-32">
        <CategoryNav 
          categories={mockCategories}
          activeCategory={activeCategory}
          onCategoryClick={setActiveCategory}
        />

        <ProductList 
          categories={mockCategories}
          items={mockItems}
          onProductClick={setSelectedProduct}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      <CartBottomBar 
        itemCount={cart.items.length}
        total={cart.getTotal()}
        onCheckout={() => setIsCartOpen(true)}
      />

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {selectedProduct && (
        <ProductModal
          item={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
