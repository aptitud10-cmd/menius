"use client"

import { MenuCategory, MenuItem } from '@/types/menu'
import { ProductCard } from './ProductCard'
import { useRef, useEffect } from 'react'

interface ProductListProps {
  categories: MenuCategory[]
  items: MenuItem[]
  onProductClick: (item: MenuItem) => void
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function ProductList({ 
  categories, 
  items, 
  onProductClick,
  activeCategory,
  onCategoryChange 
}: ProductListProps) {
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryId = entry.target.getAttribute('data-category-id')
            if (categoryId) {
              onCategoryChange(categoryId)
            }
          }
        })
      },
      { threshold: 0.5, rootMargin: '-100px 0px -50% 0px' }
    )

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [onCategoryChange])

  return (
    <div className="pb-32">
      {categories.map((category) => {
        const categoryItems = items.filter(item => item.categoryId === category.id)
        if (categoryItems.length === 0) return null

        return (
          <div
            key={category.id}
            ref={(el) => {
              if (el) {
                categoryRefs.current[category.id] = el as HTMLDivElement
              }
            }}
            data-category-id={category.id}
            id={`category-${category.id}`}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 px-4">{category.name}</h2>
            {category.description && (
              <p className="text-gray-600 mb-4 px-4">{category.description}</p>
            )}
            <div className="grid grid-cols-1 gap-4 px-4">
              {categoryItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onClick={() => onProductClick(item)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
