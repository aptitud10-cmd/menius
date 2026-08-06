# Menius Restaurant Menu API Documentation

## Overview

The `/api/public/restaurant-menu` endpoint returns a restaurant's menu, reviews, and active promotions. It is public, rate-limited, and designed for read-only integrations (mobile apps, external sites).

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

## Response Data Structure

### 1. Restaurant

**Key:** `restaurant`

Only public-safe columns are returned. Internal fields (owner id, Stripe ids, fiscal data) are excluded.

```json
{
  "id": "071be5c3-1273-45d8-a30f-2bf63e63d7f9",
  "name": "tamales",
  "slug": "tamales",
  "description": "Traditional Mexican tamales...",
  "logo_url": "https://...",
  "cover_image_url": "https://...",
  "address": "123 Main St, City, State",
  "phone": "+1-555-0123",
  "email": "contact@tamales.com",
  "currency": "USD",
  "timezone": "America/Chicago",
  "is_active": true,
  "estimated_delivery_minutes": 30,
  "delivery_fee": 3.50,
  "order_types_enabled": ["delivery", "pickup"],
  "custom_domain": null,
  "locale": "es",
  "country_code": "MX",
  "tax_rate": 8.5,
  "tax_included": false,
  "tax_label": "IVA",
  "instagram_url": "https://instagram.com/tamales",
  "notification_whatsapp": "+1-555-0123",
  "orders_paused_until": null,
  "created_at": "2025-01-15T10:00:00Z"
}
```

### 2. Menu Structure

**Keys:** `categories`, `products`, `variants`, `extras`, `modifierGroups`, `modifierOptions`

```json
{
  "categories": [
    {
      "id": "cat-123",
      "restaurant_id": "071be5c3-1273-45d8-a30f-2bf63e63d7f9",
      "name": "Tamales",
      "name_en": "Tamales",
      "description": "Traditional tamales",
      "description_en": "Traditional tamales",
      "image_url": "https://...",
      "sort_order": 1,
      "is_active": true,
      "available_from": null,
      "available_to": null
    }
  ],
  "products": [
    {
      "id": "prod-456",
      "restaurant_id": "071be5c3-1273-45d8-a30f-2bf63e63d7f9",
      "category_id": "cat-123",
      "name": "Tamales Verdes",
      "name_en": "Green Tamales",
      "description": "Green sauce tamales",
      "description_en": "Green sauce tamales",
      "price": 12.99,
      "image_url": "https://...",
      "sort_order": 1,
      "is_active": true,
      "in_stock": true,
      "is_featured": true,
      "dietary_tags": ["vegetarian"],
      "calories": 250,
      "preparation_time_minutes": 15,
      "allergens": ["gluten"]
    }
  ],
  "variants": [
    {
      "id": "var-789",
      "product_id": "prod-456",
      "name": "Large",
      "name_en": "Large",
      "price": 14.99,
      "is_active": true,
      "sort_order": 1
    }
  ],
  "extras": [
    {
      "id": "extra-101",
      "product_id": "prod-456",
      "name": "Extra Cheese",
      "name_en": "Extra Cheese",
      "price": 1.50,
      "is_active": true,
      "sort_order": 1
    }
  ],
  "modifierGroups": [
    {
      "id": "mod-group-202",
      "product_id": "prod-456",
      "name": "Sauce",
      "selection_type": "single",
      "is_required": true,
      "min_select": 1,
      "max_select": 1,
      "sort_order": 1,
      "display_type": "radio"
    }
  ],
  "modifierOptions": [
    {
      "id": "mod-opt-303",
      "group_id": "mod-group-202",
      "name": "Green Sauce",
      "price_delta": 0,
      "is_default": true,
      "sort_order": 1
    }
  ]
}
```

### 3. Reviews & Ratings

**Keys:** `reviews`, `statistics`, `bestsellers`

`statistics` is calculated only from approved reviews — no order/revenue data is exposed publicly.

```json
{
  "reviews": [
    {
      "id": "rev-404",
      "rating": 5,
      "comment": "Amazing tamales!",
      "customer_name": "John Doe",
      "created_at": "2026-03-24T10:30:00Z",
      "is_approved": true
    }
  ],
  "statistics": {
    "averageRating": 4.6,
    "totalReviews": 127,
    "averagePreparationTime": 30
  },
  "bestsellers": [
    {
      "id": "prod-456",
      "name": "Tamales Verdes",
      "price": 12.99,
      "is_featured": true
    }
  ]
}
```

`bestsellers` is simply the list of products with `is_featured: true` (set manually by the restaurant owner in the dashboard), capped at 10. It is not computed from order volume.

### 4. Promotions

**Key:** `promotions`

```json
{
  "promotions": [
    {
      "id": "promo-909",
      "restaurant_id": "071be5c3-1273-45d8-a30f-2bf63e63d7f9",
      "title": "10% off your first order",
      "title_en": "10% off your first order",
      "description": "...",
      "description_en": "...",
      "discount_type": "percentage",
      "discount_value": 10,
      "code": "WELCOME10",
      "is_active": true,
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "min_order_amount": 15.00,
      "image_url": "https://..."
    }
  ]
}
```

### 5. Metadata

**Keys:** `timestamp`, `version`

```json
{
  "timestamp": "2026-08-06T03:50:00.000Z",
  "version": "2.2.0"
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
  "error": "Internal server error"
}
```

Note: the error message is intentionally generic — the raw error is never returned to the client, only logged server-side.

## Rate Limiting

- **Limit:** 120 requests per minute per IP address

## Caching

- **CDN:** `s-maxage=60, stale-while-revalidate=300` (set via the `Cache-Control` response header)
- Recommend client-side caching of 1-5 minutes on top of that.

## Usage Examples

### JavaScript/TypeScript

```typescript
interface RestaurantMenuData {
  success: boolean;
  data: {
    restaurant: Record<string, unknown>;
    categories: Record<string, unknown>[];
    products: Record<string, unknown>[];
    variants: Record<string, unknown>[];
    extras: Record<string, unknown>[];
    modifierGroups: Record<string, unknown>[];
    modifierOptions: Record<string, unknown>[];
    reviews: Record<string, unknown>[];
    statistics: { averageRating: number; totalReviews: number; averagePreparationTime: number };
    bestsellers: Record<string, unknown>[];
    promotions: Record<string, unknown>[];
    timestamp: string;
    version: string;
  };
}

async function getRestaurantMenu(slug: string): Promise<RestaurantMenuData> {
  const response = await fetch(
    `https://menius.app/api/public/restaurant-menu?slug=${encodeURIComponent(slug)}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response.json();
}
```

### Python

```python
import requests

def get_restaurant_menu(slug: str) -> dict:
    """Fetch restaurant menu data"""
    response = requests.get(
        "https://menius.app/api/public/restaurant-menu",
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
```

## Data Categories Summary

The endpoint returns **12 data keys** under `data`:

1. **Core menu** (7): `restaurant`, `categories`, `products`, `variants`, `extras`, `modifierGroups`, `modifierOptions`
2. **Reviews & analytics** (3): `reviews`, `statistics`, `bestsellers`
3. **Offers** (1): `promotions`
4. **Metadata** (2): `timestamp`, `version`

Fields **not** returned by this endpoint (do not build against them): payment methods, tax settings as a separate object, delivery zones/polygons, special hours, loyalty program config, team/staff, events, gallery, price history, AI/WhatsApp settings, bundles, promo-code objects beyond `promotions`, location/coordinates.

## Best Practices

1. Always include error handling for network failures and non-200 responses.
2. Cache responses client-side for at least a minute — the endpoint is already CDN-cached at 60s.
3. Handle null/empty arrays gracefully (a new restaurant may have zero categories, reviews, or promotions).
4. Use HTTPS for all requests.

## Support

For issues or questions about the API:
- Check the error response for details
- Verify the restaurant slug is correct
- Contact support if problems persist

## Version History

### v2.2.0 (Current)
- Restaurant query trimmed to columns that actually exist in production (removed 14 non-existent columns that caused 500s).
- Response documented to match exactly what the route returns.

### v2.0.0
- Initial public release with core menu, reviews, and promotions.
