# Menius Restaurant Menu API Documentation

## Overview

The `/api/public/restaurant-menu` endpoint provides comprehensive restaurant data including menu items, reviews, delivery information, payment methods, and 30+ additional data categories. This endpoint is designed for mobile apps, web applications, and external integrations.

**Base URL:** `https://menius.app`

**Endpoint:** `GET /api/public/restaurant-menu`

## Quick Start

### Basic Request

```bash
curl "https://menius.app/api/public/restaurant-menu?slug=tamales"
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The restaurant's unique slug identifier (e.g., `tamales`, `los-paisas`) |

### Response Format

```json
{
  "success": true,
  "data": {
    "restaurant": { /* Restaurant info */ },
    "categories": [ /* Menu categories */ ],
    "products": [ /* Menu items */ ],
    "reviews": [ /* Customer reviews */ ],
    "statistics": { /* Restaurant stats */ },
    "timestamp": "2026-03-25T03:50:00.000Z",
    "version": "2.0.0"
  }
}
```

## Response Data Structure

### 1. Restaurant Information

**Key:** `restaurant`

Core restaurant details including name, description, contact info, and configuration.

```json
{
  "id": "071be5c3-1273-45d8-a30f-2bf63e63d7f9",
  "name": "tamales",
  "slug": "tamales",
  "currency": "USD",
  "description": "Traditional Mexican tamales...",
  "image_url": "https://...",
  "phone": "+1-555-0123",
  "email": "contact@tamales.com",
  "address": "123 Main St, City, State",
  "website": "https://tamales.com",
  "instagram": "@tamales",
  "facebook": "tamales.official",
  "tiktok": "@tamales",
  "operating_hours": { /* JSON object */ },
  "is_active": true,
  "rating": 4.5,
  "review_count": 127,
  "min_order_value": 15.00,
  "delivery_fee": 3.50,
  "delivery_time_minutes": 30,
  "timezone": "America/Chicago"
}
```

### 2. Menu Structure

**Keys:** `categories`, `products`, `variants`, `extras`, `modifierGroups`, `modifierOptions`

Complete menu hierarchy with products and customization options.

```json
{
  "categories": [
    {
      "id": "cat-123",
      "name": "Tamales",
      "description": "Traditional tamales",
      "icon": "🌮",
      "sort_order": 1,
      "is_active": true
    }
  ],
  "products": [
    {
      "id": "prod-456",
      "name": "Tamales Verdes",
      "description": "Green sauce tamales",
      "price": 12.99,
      "category_id": "cat-123",
      "image_url": "https://...",
      "is_active": true,
      "in_stock": true,
      "dietary_tags": ["vegetarian"],
      "calories": 250,
      "protein": 8,
      "fat": 10,
      "carbs": 35
    }
  ],
  "variants": [
    {
      "id": "var-789",
      "product_id": "prod-456",
      "name": "Large",
      "price_delta": 2.00,
      "is_default": false
    }
  ],
  "extras": [
    {
      "id": "extra-101",
      "product_id": "prod-456",
      "name": "Extra Cheese",
      "price": 1.50
    }
  ],
  "modifierGroups": [
    {
      "id": "mod-group-202",
      "product_id": "prod-456",
      "name": "Sauce",
      "is_required": true,
      "allow_multiple": false
    }
  ],
  "modifierOptions": [
    {
      "id": "mod-opt-303",
      "modifier_group_id": "mod-group-202",
      "name": "Green Sauce",
      "price_delta": 0
    }
  ]
}
```

### 3. Reviews & Ratings

**Keys:** `reviews`, `statistics`, `bestsellers`

Customer feedback and performance metrics.

```json
{
  "reviews": [
    {
      "id": "rev-404",
      "customer_name": "John Doe",
      "rating": 5,
      "comment": "Amazing tamales!",
      "created_at": "2026-03-24T10:30:00Z",
      "is_approved": true
    }
  ],
  "statistics": {
    "totalOrders": 1250,
    "averageRating": 4.6,
    "totalReviews": 127,
    "totalRevenue": 15750.00,
    "responseRate": 95,
    "averagePreparationTime": 30
  },
  "bestsellers": [
    {
      "id": "prod-456",
      "name": "Tamales Verdes",
      "price": 12.99,
      "orders": 342
    }
  ]
}
```

### 4. Delivery & Logistics

**Keys:** `deliveryZones`, `specialHours`, `deliveryRestrictions`

Delivery coverage and operational constraints.

```json
{
  "deliveryZones": [
    {
      "id": "zone-505",
      "name": "Downtown",
      "polygon": { /* GeoJSON */ },
      "delivery_fee": 3.50,
      "estimated_time_minutes": 25
    }
  ],
  "specialHours": [
    {
      "id": "sh-606",
      "date": "2026-03-25",
      "opening_time": "10:00",
      "closing_time": "22:00",
      "reason": "Holiday"
    }
  ],
  "deliveryRestrictions": {
    "id": "dr-707",
    "min_order_value": 15.00,
    "max_orders_per_hour": 50,
    "delivery_hours_start": "11:00",
    "delivery_hours_end": "23:00"
  }
}
```

### 5. Bundles & Offers

**Keys:** `bundles`, `promoCodes`

Special deals and promotional offers.

```json
{
  "bundles": [
    {
      "id": "bundle-808",
      "name": "Family Pack",
      "description": "6 tamales + sides",
      "price": 45.99,
      "original_price": 59.99,
      "discount_percentage": 23,
      "is_active": true
    }
  ],
  "promoCodes": [
    {
      "id": "promo-909",
      "code": "WELCOME10",
      "discount_type": "percentage",
      "discount_value": 10,
      "valid_until": "2026-12-31",
      "is_active": true
    }
  ]
}
```

### 6. Payment & Financial

**Keys:** `paymentMethods`, `taxInfo`

Accepted payment methods and tax configuration.

```json
{
  "paymentMethods": [
    {
      "id": "pm-1010",
      "type": "credit_card",
      "provider": "stripe",
      "is_enabled": true,
      "display_name": "Credit Card"
    },
    {
      "id": "pm-1111",
      "type": "cash",
      "is_enabled": true,
      "display_name": "Cash on Delivery"
    }
  ],
  "taxInfo": [
    {
      "id": "tax-1212",
      "name": "Sales Tax",
      "rate": 8.5,
      "type": "percentage",
      "is_active": true
    }
  ]
}
```

### 7. Location & Contact

**Keys:** `location`, `contactMethods`

Geographic and communication information.

```json
{
  "location": {
    "id": "loc-1313",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Main St, City, State",
    "zip_code": "10001",
    "country": "USA",
    "map_url": "https://maps.google.com/..."
  },
  "contactMethods": [
    {
      "id": "cm-1414",
      "type": "phone",
      "value": "+1-555-0123",
      "is_active": true,
      "response_hours": "11:00-23:00"
    },
    {
      "id": "cm-1515",
      "type": "whatsapp",
      "value": "+1-555-0123",
      "is_active": true
    },
    {
      "id": "cm-1616",
      "type": "email",
      "value": "contact@tamales.com",
      "is_active": true
    }
  ]
}
```

### 8. Policies & Compliance

**Keys:** `policies`, `certifications`, `allergens`, `dietaryOptions`

Legal information and dietary/health details.

```json
{
  "policies": {
    "id": "pol-1717",
    "terms_of_service": "...",
    "privacy_policy": "...",
    "refund_policy": "...",
    "cancellation_policy": "..."
  },
  "certifications": [
    {
      "id": "cert-1818",
      "name": "Health Department Certified",
      "issuer": "City Health Dept",
      "issue_date": "2025-01-15",
      "expiry_date": "2026-01-15",
      "is_active": true
    }
  ],
  "allergens": [
    {
      "id": "allergen-1919",
      "name": "Peanuts",
      "products": ["prod-456"]
    }
  ],
  "dietaryOptions": [
    {
      "id": "diet-2020",
      "name": "Vegetarian",
      "products": ["prod-456", "prod-789"]
    }
  ]
}
```

### 9. AI & Automation

**Keys:** `aiSettings`, `whatsappSettings`

AI-powered features and messaging integration.

```json
{
  "aiSettings": {
    "id": "ai-2121",
    "ai_enabled": true,
    "ai_model": "gpt-4",
    "auto_responses_enabled": true,
    "chatbot_enabled": true
  },
  "whatsappSettings": {
    "id": "wa-2222",
    "whatsapp_enabled": true,
    "whatsapp_number": "+1-555-0123",
    "auto_reply_enabled": true,
    "business_account": true
  }
}
```

### 10. Community & Engagement

**Keys:** `socialMedia`, `loyaltyProgram`, `team`, `events`

Social presence and customer engagement features.

```json
{
  "socialMedia": [
    {
      "id": "sm-2323",
      "platform": "instagram",
      "handle": "@tamales",
      "followers": 5000,
      "url": "https://instagram.com/tamales"
    }
  ],
  "loyaltyProgram": {
    "id": "lp-2424",
    "name": "Tamales Rewards",
    "is_enabled": true,
    "points_per_dollar": 1,
    "redemption_rate": 100
  },
  "team": [
    {
      "id": "team-2525",
      "name": "Chef Maria",
      "role": "Head Chef",
      "bio": "20 years of experience",
      "image_url": "https://...",
      "is_featured": true
    }
  ],
  "events": [
    {
      "id": "event-2626",
      "name": "Tamale Festival",
      "date": "2026-04-15",
      "description": "Annual celebration",
      "is_active": true
    }
  ]
}
```

### 11. Gallery & Media

**Key:** `gallery`

Restaurant photos and media assets.

```json
{
  "gallery": [
    {
      "id": "img-2727",
      "url": "https://...",
      "caption": "Our kitchen",
      "sort_order": 1
    }
  ]
}
```

### 12. Integrations & Analytics

**Keys:** `integrations`, `priceHistory`, `customization`

Third-party integrations and historical data.

```json
{
  "integrations": [
    {
      "id": "int-2828",
      "type": "google_analytics",
      "is_enabled": true,
      "config": { /* Integration config */ }
    }
  ],
  "priceHistory": [
    {
      "id": "ph-2929",
      "product_id": "prod-456",
      "old_price": 11.99,
      "new_price": 12.99,
      "changed_at": "2026-03-20T10:00:00Z"
    }
  ],
  "customization": {
    "id": "custom-3030",
    "theme_color": "#FF6B35",
    "logo_url": "https://...",
    "banner_url": "https://..."
  }
}
```

## Error Responses

### 404 - Restaurant Not Found

```json
{
  "error": "Restaurant not found",
  "slug": "invalid-slug"
}
```

### 400 - Missing Required Parameter

```json
{
  "error": "slug required"
}
```

### 429 - Rate Limited

```json
{
  "error": "Too many requests"
}
```

### 500 - Server Error

```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

## Rate Limiting

- **Limit:** 120 requests per minute per IP address
- **Header:** Rate limit information included in response headers

## Caching Recommendations

- **Cache Duration:** 5-10 minutes for optimal performance
- **Stale Time:** 5 minutes before re-fetching
- **Garbage Collection:** 10 minutes

## Usage Examples

### JavaScript/TypeScript

```typescript
import { useQuery } from '@tanstack/react-query';

interface RestaurantMenuData {
  success: boolean;
  data: {
    restaurant: any;
    categories: any[];
    products: any[];
    reviews: any[];
    statistics: any;
    // ... 30+ more categories
  };
}

function useRestaurantMenu(slug: string | null) {
  return useQuery<RestaurantMenuData>({
    queryKey: ['restaurant-menu', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Restaurant slug is required');

      const response = await fetch(
        `https://menius.app/api/public/restaurant-menu?slug=${encodeURIComponent(slug)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Usage in component
const { data, isLoading, error } = useRestaurantMenu('tamales');
```

### Python

```python
import requests
from typing import TypedDict

def get_restaurant_menu(slug: str) -> dict:
    """Fetch complete restaurant menu data"""
    response = requests.get(
        f"https://menius.app/api/public/restaurant-menu",
        params={"slug": slug},
        timeout=10
    )
    response.raise_for_status()
    return response.json()

# Usage
data = get_restaurant_menu('tamales')
restaurant = data['data']['restaurant']
products = data['data']['products']
```

### cURL

```bash
# Basic request
curl "https://menius.app/api/public/restaurant-menu?slug=tamales"

# Pretty-printed JSON
curl "https://menius.app/api/public/restaurant-menu?slug=tamales" | jq '.'

# Save to file
curl "https://menius.app/api/public/restaurant-menu?slug=tamales" > restaurant.json
```

## Data Categories Summary

The endpoint returns **30+ data categories**:

1. **Core Data** (5): restaurant, categories, products, variants, extras
2. **Customization** (2): modifierGroups, modifierOptions
3. **Reviews & Ratings** (3): reviews, statistics, bestsellers
4. **Delivery & Logistics** (3): deliveryZones, specialHours, deliveryRestrictions
5. **Bundles & Offers** (2): bundles, promoCodes
6. **Payment & Financial** (2): paymentMethods, taxInfo
7. **Location & Contact** (2): location, contactMethods
8. **Policies & Compliance** (4): policies, certifications, allergens, dietaryOptions
9. **AI & Automation** (2): aiSettings, whatsappSettings
10. **Community & Engagement** (4): socialMedia, loyaltyProgram, team, events
11. **Gallery & Media** (1): gallery
12. **Integrations & Analytics** (3): integrations, priceHistory, customization
13. **Metadata** (2): timestamp, version

## Best Practices

1. **Always include error handling** for network failures and invalid responses
2. **Implement caching** to reduce API calls and improve performance
3. **Use pagination** if implementing search or filtering
4. **Validate data** before displaying to users
5. **Handle null values** gracefully in your UI
6. **Monitor rate limits** and implement backoff strategies
7. **Use HTTPS** for all requests
8. **Include user-agent** headers in requests

## Support

For issues or questions about the API:
- Check the error response for detailed error messages
- Verify the restaurant slug is correct
- Ensure you're using the correct endpoint URL
- Contact support if problems persist

## Version History

### v2.0.0 (Current)
- Added 30+ data categories
- Improved error handling
- Enhanced caching support
- Added comprehensive documentation

### v1.0.0
- Initial release
- Basic restaurant and menu data
