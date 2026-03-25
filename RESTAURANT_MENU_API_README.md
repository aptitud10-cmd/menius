# Restaurant Menu API - Complete Integration Guide

## 📋 Overview

The `/api/public/restaurant-menu` endpoint provides comprehensive restaurant data with **30+ data categories** for mobile apps, web applications, and external integrations.

**Endpoint:** `https://menius.app/api/public/restaurant-menu?slug=RESTAURANT_SLUG`

## 🚀 Quick Start

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
    "reviews": [ /* Customer reviews */ ],
    "statistics": { /* Performance metrics */ },
    "deliveryZones": [ /* Delivery coverage */ ],
    "paymentMethods": [ /* Accepted payments */ ],
    "timestamp": "2026-03-25T03:50:00.000Z",
    "version": "2.0.0"
    // ... 20+ more data categories
  }
}
```

## 📦 30+ Data Categories

### Core Menu Data
1. **restaurant** - Restaurant information (name, description, contact, hours)
2. **categories** - Menu categories
3. **products** - Menu items with prices and descriptions
4. **variants** - Product size/type variations
5. **extras** - Additional items (toppings, sides)
6. **modifierGroups** - Customization groups
7. **modifierOptions** - Individual customization options

### Reviews & Analytics
8. **reviews** - Customer reviews and ratings
9. **statistics** - Performance metrics (orders, revenue, ratings)
10. **bestsellers** - Top-selling items

### Delivery & Logistics
11. **deliveryZones** - Coverage areas with fees and times
12. **specialHours** - Holiday hours and closures
13. **deliveryRestrictions** - Order minimums and time windows

### Offers & Promotions
14. **bundles** - Special meal packages
15. **promoCodes** - Discount codes and offers

### Payment & Financial
16. **paymentMethods** - Accepted payment types
17. **taxInfo** - Tax rates and calculations

### Location & Contact
18. **location** - Address, coordinates, map links
19. **contactMethods** - Phone, email, WhatsApp, chat

### Media & Gallery
20. **gallery** - Restaurant photos

### Policies & Compliance
21. **policies** - Terms, privacy, refund policies
22. **certifications** - Health, quality certifications
23. **allergens** - Allergen information
24. **dietaryOptions** - Vegetarian, vegan, etc.

### AI & Automation
25. **aiSettings** - AI chatbot configuration
26. **whatsappSettings** - WhatsApp integration

### Community & Engagement
27. **socialMedia** - Instagram, Facebook, TikTok links
28. **loyaltyProgram** - Rewards program details
29. **team** - Featured staff members
30. **events** - Upcoming events and promotions

### Integrations & Analytics
31. **integrations** - Third-party service connections
32. **priceHistory** - Recent price changes
33. **customization** - Theme colors, branding

### Metadata
34. **timestamp** - Response generation time
35. **version** - API version

## 🔧 Implementation Examples

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
        f"https://menius.app/api/public/restaurant-menu",
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

## 📊 Data Access Examples

### Get Restaurant Info

```javascript
const { restaurant } = data.data;

console.log(restaurant.name);           // "tamales"
console.log(restaurant.rating);         // 4.5
console.log(restaurant.phone);          // "+1-555-0123"
console.log(restaurant.delivery_fee);   // 3.50
```

### Get Menu Structure

```javascript
const { categories, products } = data.data;

// Get all products in a category
const category = categories[0];
const categoryProducts = products.filter(
  p => p.category_id === category.id
);

categoryProducts.forEach(product => {
  console.log(`${product.name}: $${product.price}`);
});
```

### Get Performance Stats

```javascript
const { statistics } = data.data;

console.log(`Average Rating: ${statistics.averageRating}⭐`);
console.log(`Total Orders: ${statistics.totalOrders}`);
console.log(`Total Revenue: $${statistics.totalRevenue}`);
console.log(`Avg Prep Time: ${statistics.averagePreparationTime} min`);
```

### Get Reviews

```javascript
const { reviews, statistics } = data.data;

console.log(`${statistics.totalReviews} reviews`);

reviews.slice(0, 5).forEach(review => {
  console.log(`${review.customer_name}: ${review.rating}⭐`);
  console.log(`"${review.comment}"\n`);
});
```

### Get Delivery Info

```javascript
const { deliveryZones, deliveryRestrictions } = data.data;

console.log(`Min Order: $${deliveryRestrictions.min_order_value}`);
console.log(`Delivery Zones: ${deliveryZones.length}`);

deliveryZones.forEach(zone => {
  console.log(`${zone.name}: $${zone.delivery_fee}, ~${zone.estimated_time_minutes}min`);
});
```

### Get Payment Methods

```javascript
const { paymentMethods } = data.data;

const acceptsCreditCard = paymentMethods.some(m => m.type === 'credit_card');
const acceptsCash = paymentMethods.some(m => m.type === 'cash');

console.log(`Credit Card: ${acceptsCreditCard ? '✓' : '✗'}`);
console.log(`Cash: ${acceptsCash ? '✓' : '✗'}`);
```

## ⚙️ Configuration

### Environment Variables

```bash
# Optional: Override API base URL
EXPO_PUBLIC_API_URL=https://menius.app
```

### Caching Strategy

- **Cache Duration:** 5 minutes
- **Stale Time:** 5 minutes before re-fetching
- **Garbage Collection:** 10 minutes

### Rate Limiting

- **Limit:** 120 requests per minute per IP
- **Status Code:** 429 (Too Many Requests)

## 🛠️ Error Handling

### Common Errors

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

### Error Responses

```json
{
  "error": "Restaurant not found",
  "slug": "invalid-slug"
}
```

## 📱 Mobile App Integration

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
      {/* Restaurant Header */}
      <View>
        <Text className="text-3xl font-bold">{restaurant.name}</Text>
        <Text className="text-muted">{restaurant.description}</Text>
        
        {/* Stats */}
        <View className="flex-row gap-2">
          <Text>⭐ {statistics.averageRating}</Text>
          <Text>📦 {statistics.totalOrders}</Text>
          <Text>⏱️ {statistics.averagePreparationTime}min</Text>
        </View>
      </View>

      {/* Menu */}
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

      {/* Reviews */}
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

## 🎯 Best Practices

1. **Always handle errors** - Network requests can fail
2. **Implement caching** - Reduce API calls with React Query
3. **Validate data** - Check for null/undefined values
4. **Use memoization** - Optimize expensive computations
5. **Implement pagination** - For large product lists
6. **Monitor rate limits** - Implement backoff strategies
7. **Use HTTPS** - Always use secure connections
8. **Cache aggressively** - 5-10 minute cache is safe

## 📚 Additional Resources

- **Full API Documentation:** See `API_DOCUMENTATION.md`
- **Mobile App Integration:** See `../menius-mobile-app/INTEGRATION_GUIDE.md`
- **API Endpoint:** `https://menius.app/api/public/restaurant-menu`

## 🆘 Troubleshooting

### Data Not Loading
- Verify the restaurant slug is correct
- Check network connectivity
- Verify API URL is accessible
- Check browser/app console for errors

### Stale Data
- The hook caches for 5 minutes
- Call `refetch()` to force a refresh
- Clear browser cache if needed

### Performance Issues
- Use `useMemo` for expensive operations
- Use `FlatList` instead of `ScrollView` with `.map()`
- Implement pagination for large lists
- Monitor bundle size

## 📞 Support

For issues or questions:
1. Check the error messages in console
2. Review this documentation
3. Verify your implementation matches examples
4. Contact support if problems persist

---

**Last Updated:** March 25, 2026
**API Version:** 2.0.0
**Status:** ✅ Production Ready
