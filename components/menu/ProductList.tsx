'use client'

import { useRef, useEffect } from 'react'
import { MenuCategory, MenuItem } from '@/types/menu'
import { ProductCard } from './ProductCard'

interface ProductListProps {
  categories: MenuCategory[]
  products: MenuItem[]
  onProductClick: (product: MenuItem) => void
  onCategoryInView: (categoryId: string) => void
}

export function ProductList({
  categories,
  products,
  onProductClick,
  onCategoryInView
}: ProductListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Setup Intersection Observer to detect which category is in view
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryId = entry.target.getAttribute('data-category-id')
            if (categoryId) {
              onCategoryInView(categoryId)
            }
          }
        })
      },
      {
        rootMargin: '-180px 0px -50% 0px',
        threshold: 0
      }
    )

    // Observe all category sections
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [onCategoryInView])

  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {categories.map((category) => {
        const categoryProducts = products.filter(
          (p) => p.category_id === category.id && p.is_available
        )

        if (categoryProducts.length === 0) return null

        return (
          <section
            key={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el
            }}
            data-category-id={category.id}
            id={`category-${category.id}`}
            className="mb-8 scroll-mt-[180px]"
          >
            {/* Category header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{category.name}</h2>
              {category.description && (
                <p className="text-muted-foreground mt-1">
                  {category.description}
                </p>
              )}
            </div>

            {/* Products grid */}
            <div className="grid gap-3">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => onProductClick(product)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
