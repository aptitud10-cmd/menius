# Restaurant Menu API - Integration Guide

## Overview

The `/api/public/restaurant-menu` endpoint returns a restaurant's menu, reviews, and active promotions for mobile apps, web applications, and external integrations. It is read-only and public.

**Endpoint:** `https://menius.app/api/public/restaurant-menu?slug=RESTAURANT_SLUG`

## Quick Start

### Basic Request

```bash
curl "https://menius.app/api/public/restaurant-menu?slug=tamales"
```

### Response Structure

```json
{
  "success": true,
  "data": {
    "restaurant": { /* Restaurant info */ },
    "categories": [ /* Menu categories */ ],
    "products": [ /* Menu items */ ],
    "variants": [ /* Product size/type variations */ ],
    "extras": [ /* Extra add-ons */ ],
    "modifierGroups": [ /* Customization groups */ ],
    "modifierOptions": [ /* Options within each group */ ],
    "reviews": [ /* Customer reviews */ ],
    "statistics": { /* Rating summary */ },
    "bestsellers": [ /* Featured products */ ],
    "promotions": [ /* Active promotions */ ],
    "timestamp": "2026-08-06T03:50:00.000Z",
    "version": "2.2.0"
  }
}
```

## Data Keys

### Core Menu Data
1. **restaurant** — Restaurant info (name, description, contact, delivery settings)
2. **categories** — Menu categories
3. **products** — Menu items with prices and descriptions
4. **variants** — Product size/type variations
5. **extras** — Additional items (toppings, sides)
6. **modifierGroups** — Customization groups
7. **modifierOptions** — Individual customization options

### Reviews & Ratings
8. **reviews** — Approved customer reviews (max 30, most recent first)
9. **statistics** — `averageRating`, `totalReviews`, `averagePreparationTime` — computed from reviews only, no order data
10. **bestsellers** — Products marked `is_featured` by the owner (max 10). Not computed from actual order volume.

### Offers
11. **promotions** — Active promotions/discount codes

### Metadata
12. **timestamp** — Response generation time
13. **version** — API version

There is no payment methods, tax settings object, delivery zones, gallery, loyalty, team, events, or AI/WhatsApp settings key in this response. Do not build integrations that assume those exist.

## Implementation Examples

### JavaScript/TypeScript (React Native)

```typescript
import { useQuery } from '@tanstack/react-query';

function useRestaurantMenu(slug: string | null) {
  return useQuery({
    queryKey: ['restaurant-menu', slug],
    queryFn: async () => {
      const response = await fetch(
        `https://menius.app/api/public/restaurant-menu?slug=${slug}`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// Usage
const { data, isLoading, error } = useRestaurantMenu('tamales');

if (isLoading) return <ActivityIndicator />;
if (error) return <Text>Error: {error.message}</Text>;

const { restaurant, products, statistics } = data.data;
```

### Python

```python
import requests

def get_restaurant_menu(slug: str) -> dict:
    response = requests.get(
        "https://menius.app/api/public/restaurant-menu",
        params={"slug": slug}
    )
    response.raise_for_status()
    return response.json()

# Usage
data = get_restaurant_menu('tamales')
restaurant = data['data']['restaurant']
products = data['data']['products']
```

### JavaScript (Web)

```javascript
async function fetchRestaurantMenu(slug) {
  const response = await fetch(
    `https://menius.app/api/public/restaurant-menu?slug=${slug}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Usage
fetchRestaurantMenu('tamales')
  .then(data => {
    console.log('Restaurant:', data.data.restaurant);
    console.log('Products:', data.data.products);
  })
  .catch(error => console.error('Error:', error));
```

## Data Access Examples

### Get Restaurant Info

```javascript
const { restaurant } = data.data;

console.log(restaurant.name);                        // "tamales"
console.log(restaurant.phone);                        // "+1-555-0123"
console.log(restaurant.delivery_fee);                 // 3.50
console.log(restaurant.estimated_delivery_minutes);   // 30
```

### Get Menu Structure

```javascript
const { categories, products } = data.data;

const category = categories[0];
const categoryProducts = products.filter(
  p => p.category_id === category.id
);

categoryProducts.forEach(product => {
  console.log(`${product.name}: $${product.price}`);
});
```

### Get Ratings

```javascript
const { statistics, reviews } = data.data;

console.log(`Average Rating: ${statistics.averageRating}⭐`);
console.log(`${statistics.totalReviews} reviews`);

reviews.slice(0, 5).forEach(review => {
  console.log(`${review.customer_name}: ${review.rating}⭐`);
  console.log(`"${review.comment}"\n`);
});
```

### Get Promotions

```javascript
const { promotions } = data.data;

promotions.forEach(promo => {
  console.log(`${promo.code}: ${promo.discount_value}${promo.discount_type === 'percentage' ? '%' : ''} off`);
});
```

## Configuration

### Environment Variables

```bash
# Optional: Override API base URL
EXPO_PUBLIC_API_URL=https://menius.app
```

### Caching

- CDN caches for 60s (`s-maxage=60`), serves stale up to 5 min while revalidating.
- Client-side: cache 1-5 minutes is safe on top of that.

### Rate Limiting

- **Limit:** 120 requests per minute per IP
- **Status Code on excess:** 429

## Error Handling

```javascript
try {
  const data = await fetchRestaurantMenu('tamales');
} catch (error) {
  if (error.message.includes('404')) {
    console.log('Restaurant not found');
  } else if (error.message.includes('429')) {
    console.log('Rate limited - try again later');
  } else if (error.message.includes('400')) {
    console.log('Missing required parameters');
  } else {
    console.log('Server error:', error.message);
  }
}
```

### Error Response Shape

```json
{
  "error": "Restaurant not found",
  "slug": "invalid-slug"
}
```

## Mobile App Integration

### React Native Component

```typescript
import { useRestaurantMenu } from '@/hooks/use-restaurant-menu';
import { ScrollView, View, Text, FlatList } from 'react-native';

export function RestaurantScreen({ slug }: { slug: string }) {
  const { data, isLoading, error } = useRestaurantMenu(slug);

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error loading restaurant</Text>;

  const { restaurant, categories, products, reviews, statistics } = data.data;

  return (
    <ScrollView>
      <View>
        <Text className="text-3xl font-bold">{restaurant.name}</Text>
        <Text className="text-muted">{restaurant.description}</Text>

        <View className="flex-row gap-2">
          <Text>⭐ {statistics.averageRating}</Text>
          <Text>⏱️ {statistics.averagePreparationTime}min</Text>
        </View>
      </View>

      <FlatList
        scrollEnabled={false}
        data={categories}
        keyExtractor={item => item.id}
        renderItem={({ item: category }) => (
          <View>
            <Text className="text-xl font-bold">{category.name}</Text>

            <FlatList
              scrollEnabled={false}
              data={products.filter(p => p.category_id === category.id)}
              keyExtractor={item => item.id}
              renderItem={({ item: product }) => (
                <View className="p-3 bg-surface rounded">
                  <Text className="font-bold">{product.name}</Text>
                  <Text className="text-muted">${product.price}</Text>
                </View>
              )}
            />
          </View>
        )}
      />

      <View>
        <Text className="text-xl font-bold">Reviews ({reviews.length})</Text>
        <FlatList
          scrollEnabled={false}
          data={reviews.slice(0, 5)}
          keyExtractor={item => item.id}
          renderItem={({ item: review }) => (
            <View className="p-3 bg-surface rounded">
              <Text className="font-bold">{review.customer_name}</Text>
              <Text className="text-sm">{review.rating}⭐ - {review.comment}</Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}
```

## Best Practices

1. **Always handle errors** — network requests can fail
2. **Implement caching** — reduce API calls with React Query or similar
3. **Validate data** — check for null/undefined values, especially on empty menus
4. **Use `FlatList`** instead of `ScrollView` + `.map()` for large lists
5. **Use HTTPS** always

## Additional Resources

- **Full API Documentation:** See `API_DOCUMENTATION.md`
- **API Endpoint:** `https://menius.app/api/public/restaurant-menu`

## Troubleshooting

### Data Not Loading
- Verify the restaurant slug is correct
- Check network connectivity
- Check browser/app console for errors

### Stale Data
- The CDN caches for 60s; client-side hooks may cache longer depending on config
- Force-refetch if you need up-to-the-second data

## Support

For issues or questions:
1. Check the error messages in console
2. Review this documentation
3. Verify your implementation matches examples
4. Contact support if problems persist

---

**Last Updated:** August 6, 2026
**API Version:** 2.2.0
