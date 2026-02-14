'use client'

import { MenuItem } from '@/types/menu'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Flame, Leaf, Star } from 'lucide-react'

interface ProductCardProps {
  product: MenuItem
  onClick: () => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const getSpicyIcon = (level: number) => {
    if (level === 0) return null
    return (
      <span className="flex items-center text-orange-500">
        {Array.from({ length: level }).map((_, i) => (
          <Flame key={i} className="h-3 w-3" />
        ))}
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={!product.is_available}
      className="w-full text-left p-4 rounded-xl border bg-card hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex gap-4">
        {/* Product image placeholder */}
        {product.image_url ? (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
        )}

        {/* Product info */}
        <div className="flex-1 min-w-0">
          {/* Name and badges row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base line-clamp-1">
              {product.name}
            </h3>
            
            {/* Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {product.is_popular && (
                <Badge variant="secondary" className="px-1.5 py-0">
                  <Star className="h-3 w-3 fill-current" />
                </Badge>
              )}
              {product.spicy_level && product.spicy_level > 0 && (
                <Badge variant="outline" className="px-1.5 py-0 border-orange-200">
                  {getSpicyIcon(product.spicy_level)}
                </Badge>
              )}
              {product.dietary_tags?.includes('vegetarian') && (
                <Badge variant="outline" className="px-1.5 py-0 border-green-200">
                  <Leaf className="h-3 w-3 text-green-600" />
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {product.description}
          </p>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-primary">
              {formatCurrency(product.price)}
            </span>
            
            {!product.is_available && (
              <span className="text-sm text-red-500 font-medium">
                No disponible
              </span>
            )}
          </div>

          {/* Dietary tags text (optional) */}
          {product.dietary_tags && product.dietary_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.dietary_tags.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs"
                >
                  {tag === 'vegetarian' && '🌱 Vegetariano'}
                  {tag === 'vegan' && '🌿 Vegano'}
                  {tag === 'gluten-free' && '🌾 Sin gluten'}
                  {tag === 'dairy-free' && '🥛 Sin lácteos'}
                  {tag === 'nut-free' && '🥜 Sin nueces'}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
