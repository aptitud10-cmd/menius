'use client'

import { useRef, useEffect } from 'react'
import { MenuCategory } from '@/types/menu'
import { cn } from '@/lib/utils'

interface CategoryNavProps {
  categories: MenuCategory[]
  activeCategory: string | null
  onCategoryClick: (categoryId: string) => void
}

export function CategoryNav({
  categories,
  activeCategory,
  onCategoryClick
}: CategoryNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll to active category
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      const button = activeButtonRef.current
      const container = scrollContainerRef.current
      
      const buttonLeft = button.offsetLeft
      const buttonWidth = button.offsetWidth
      const containerWidth = container.offsetWidth
      const scrollLeft = container.scrollLeft

      // Center the active button if it's not fully visible
      if (buttonLeft < scrollLeft || buttonLeft + buttonWidth > scrollLeft + containerWidth) {
        container.scrollTo({
          left: buttonLeft - (containerWidth / 2) + (buttonWidth / 2),
          behavior: 'smooth'
        })
      }
    }
  }, [activeCategory])

  return (
    <div className="sticky top-[140px] z-30 bg-white border-b">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
      >
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {categories.map((category) => (
            <button
              key={category.id}
              ref={activeCategory === category.id ? activeButtonRef : null}
              onClick={() => onCategoryClick(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
