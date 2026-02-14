'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MenuHeader } from '@/components/menu/MenuHeader'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { ProductList } from '@/components/menu/ProductList'
import { ProductModal } from '@/components/menu/ProductModal'
import { CartBottomBar } from '@/components/menu/CartBottomBar'
import { CartDrawer } from '@/components/menu/CartDrawer'
import { useCart } from '@/lib/stores/cartStore'
import { MenuItem } from '@/types/menu'
import { mockRestaurant, mockCategories, mockMenuItems } from '@/lib/mockData'
import toast from 'react-hot-toast'

export default function RestaurantMenuPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  const setRestaurant = useCart(state => state.setRestaurant)

  // Set restaurant in cart store
  useEffect(() => {
    setRestaurant(mockRestaurant.id)
  }, [setRestaurant])

  // Check if restaurant exists (in real app, this would fetch from DB)
  useEffect(() => {
    if (slug !== mockRestaurant.slug) {
      // In production, this would fetch from Supabase
      // For now, we just show the mock restaurant regardless of slug
      console.log('Restaurant slug:', slug)
    }
  }, [slug])

  // Filter products by search query
  const filteredProducts = searchQuery
    ? mockMenuItems.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockMenuItems

  // Set initial active category
  useEffect(() => {
    if (!activeCategory && mockCategories.length > 0) {
      setActiveCategory(mockCategories[0].id)
    }
  }, [activeCategory])

  const handleProductClick = (product: MenuItem) => {
    if (!product.is_available) {
      toast.error('Este producto no está disponible actualmente')
      return
    }
    
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId)
    
    // Smooth scroll to category
    const element = document.getElementById(`category-${categoryId}`)
    if (element) {
      const yOffset = -180 // Offset for sticky headers
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  const handleCheckout = () => {
    setIsCartOpen(false)
    // Navigate to checkout page
    router.push(`/r/${slug}/checkout`)
  }

  const handleInfoClick = () => {
    setIsInfoModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <MenuHeader
        restaurant={mockRestaurant}
        onCartClick={() => setIsCartOpen(true)}
        onInfoClick={handleInfoClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Category Navigation */}
      {!searchQuery && (
        <CategoryNav
          categories={mockCategories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {/* Product List */}
      <ProductList
        categories={mockCategories}
        products={filteredProducts}
        onProductClick={handleProductClick}
        onCategoryInView={setActiveCategory}
      />

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          setSelectedProduct(null)
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        restaurant={mockRestaurant}
        onCheckout={handleCheckout}
      />

      {/* Bottom Cart Bar */}
      <CartBottomBar
        onViewCart={() => setIsCartOpen(true)}
        minOrderAmount={mockRestaurant.min_order_amount}
      />

      {/* Info Modal (TODO: implement) */}
      {/* This would show restaurant info, hours, address, etc */}
    </div>
  )
}
