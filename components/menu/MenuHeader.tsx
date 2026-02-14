'use client'

import { Search, ShoppingCart, Info } from 'lucide-react'
import { Restaurant } from '@/types/menu'
import { useCart } from '@/lib/stores/cartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface MenuHeaderProps {
  restaurant: Restaurant
  onCartClick: () => void
  onInfoClick: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function MenuHeader({
  restaurant,
  onCartClick,
  onInfoClick,
  searchQuery,
  onSearchChange
}: MenuHeaderProps) {
  const itemCount = useCart(state => state.getItemCount())

  return (
    <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        {/* Main header */}
        <div className="flex items-center justify-between h-16">
          {/* Restaurant name */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">
              {restaurant.name}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {/* Info button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onInfoClick}
              className="relative"
            >
              <Info className="h-5 w-5" />
            </Button>

            {/* Cart button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar platillos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
