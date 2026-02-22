import { DIETARY_TAGS } from '@/lib/dietary-tags';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export function JsonLdScript({
  restaurant, slug, categories, products, reviewStats,
}: {
  restaurant: any;
  slug: string;
  categories?: any[];
  products?: any[];
  reviewStats?: { average: number; total: number } | null;
}) {
  const url = `${APP_URL}/r/${slug}`;
  const currency = restaurant.currency ?? 'MXN';

  const paymentMap: Record<string, string> = {
    cash: 'Cash', online: 'Credit Card', oxxo: 'OXXO', spei: 'Bank Transfer',
  };
  const paymentAccepted = (restaurant.payment_methods_enabled as string[] | undefined)
    ?.map((m: string) => paymentMap[m])
    .filter(Boolean);

  let priceRange: string | undefined;
  if (products && products.length > 0) {
    const prices = products.map((p: any) => p.price).filter((p: number) => p > 0);
    if (prices.length > 0) {
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      if (avg <= 80) priceRange = '$';
      else if (avg <= 200) priceRange = '$$';
      else if (avg <= 500) priceRange = '$$$';
      else priceRange = '$$$$';
    }
  }

  const restaurantLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    description: restaurant.description || undefined,
    url,
    ...(restaurant.address && {
      address: { '@type': 'PostalAddress', streetAddress: restaurant.address },
    }),
    ...(restaurant.latitude && restaurant.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      },
    }),
    ...(restaurant.phone && { telephone: restaurant.phone }),
    ...(restaurant.cover_image_url && { image: restaurant.cover_image_url }),
    ...(restaurant.logo_url && { logo: restaurant.logo_url }),
    ...(paymentAccepted && paymentAccepted.length > 0 && { paymentAccepted }),
    ...(priceRange && { priceRange }),
    acceptsReservations: false,
  };

  if (reviewStats && reviewStats.total >= 1) {
    restaurantLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewStats.average,
      bestRating: 5,
      worstRating: 1,
      ratingCount: reviewStats.total,
    };
  }

  if (restaurant.operating_hours) {
    const fullDayNames: Record<string, string> = {
      monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
      thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
    };
    const specs = Object.entries(restaurant.operating_hours)
      .filter(([, v]: any) => v && !v.closed)
      .map(([day, v]: any) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${fullDayNames[day] ?? day}`,
        opens: v.open,
        closes: v.close,
      }));
    if (specs.length > 0) restaurantLd.openingHoursSpecification = specs;
  }

  if (products && products.length > 0 && categories && categories.length > 0) {
    const catMap = new Map(categories.map((c: any) => [c.id, c.name]));
    const grouped = new Map<string, any[]>();

    for (const p of products) {
      const catName = catMap.get(p.category_id) ?? 'General';
      if (!grouped.has(catName)) grouped.set(catName, []);
      grouped.get(catName)!.push(p);
    }

    const sections = Array.from(grouped.entries()).map(([name, items]) => ({
      '@type': 'MenuSection',
      name,
      hasMenuItem: items.slice(0, 30).map((p: any) => {
        const diets = (p.dietary_tags as string[] | undefined)
          ?.map((t: string) => DIETARY_TAGS.find((dt) => dt.id === t)?.schemaDiet)
          .filter(Boolean);
        return {
          '@type': 'MenuItem',
          name: p.name,
          ...(p.description && { description: p.description }),
          ...(p.image_url && { image: p.image_url }),
          ...(diets && diets.length > 0 && { suitableForDiet: diets }),
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: currency,
            availability: 'https://schema.org/InStock',
          },
        };
      }),
    }));

    restaurantLd.hasMenu = {
      '@type': 'Menu',
      name: `${restaurant.name} Menu`,
      hasMenuSection: sections,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantLd) }}
    />
  );
}
