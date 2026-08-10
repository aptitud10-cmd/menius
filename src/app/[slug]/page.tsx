import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MenuShell } from "@/components/public/MenuShell";
import { HighConversionLayout } from "@/components/public/high-conversion/HighConversionLayout"; // Nuevo import
import { fetchMenuData, fetchRestaurantMeta, fetchAllSlugs } from "./menu-data";
import { demoRestaurant, demoCategories, demoProducts } from "@/lib/demo-data";
import {
  grillHouseRestaurant,
  grillHouseCategories,
  grillHouseProducts,
} from "@/lib/demo-data-en";
import { JsonLdScript } from "@/components/public/JsonLdScript";
import { getStoreOverrides } from "@/lib/store-overrides"; // Nuevo import
import { Product } from "@/types";

export const revalidate = 300;
export const dynamicParams = true;

/**
 * Pre-generate all restaurant menu pages at build time.
 * Vercel serves these as static files (< 100 ms) instead of running server code on each request.
 * When a restaurant edits their menu, revalidatePath() triggers background regeneration.
 */
export async function generateStaticParams() {
  const slugs = await fetchAllSlugs();
  // Also include the demo slugs so they are always pre-built
  const demoSlugs = [
    "la-casa-del-sabor",
    "the-grill-house",
    "adri",
    "buccaneer",
  ];
  const all = Array.from(new Set([...demoSlugs, ...slugs]));
  return all.map((slug) => ({ slug }));
}

// Reserved paths that must NOT be matched by this catch-all slug route
const RESERVED_PATHS = new Set([
  "app",
  "api",
  "auth",
  "admin",
  "blog",
  "changelog",
  "cookies",
  "demo",
  "faq",
  "offline",
  "onboarding",
  "privacy",
  "r",
  "setup-profesional",
  "start",
  "status",
  "terms",
  "login",
  "signup",
  "kds",
  "counter",
  "monitoring",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

interface PageProps {
  params: { slug: string };
}

const DEMO_SLUGS: Record<
  string,
  {
    restaurant: typeof demoRestaurant;
    categories: typeof demoCategories;
    products: typeof demoProducts;
    locale: "es" | "en";
  }
> = {
  "la-casa-del-sabor": {
    restaurant: demoRestaurant,
    categories: demoCategories,
    products: demoProducts,
    locale: "es",
  },
  "the-grill-house": {
    restaurant: grillHouseRestaurant,
    categories: grillHouseCategories,
    products: grillHouseProducts,
    locale: "en",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  if (RESERVED_PATHS.has(params.slug)) {
    return { title: "MENIUS" };
  }

  const demoConfig = DEMO_SLUGS[params.slug];
  if (demoConfig) {
    const r = demoConfig.restaurant;
    // El layout raíz aplica template '%s | MENIUS', así que el title de la
    // página NO lleva la marca — si la lleva sale "MENIUS | MENIUS".
    // openGraph/twitter ignoran el template, ahí sí va el título completo.
    const title = `${r.name} — Menú Digital`;
    const fullTitle = `${title} | MENIUS`;
    const description = r.description ?? `Pide online en ${r.name}`;
    const url = `${APP_URL}/${params.slug}`;
    const image = r.cover_image_url || `${APP_URL}/icons/icon-512.svg`;
    return {
      title,
      description,
      manifest: `/${params.slug}/manifest.webmanifest`,
      icons: { apple: image },
      appleWebApp: { title: r.name, statusBarStyle: "default", capable: true },
      openGraph: {
        title: fullTitle,
        description,
        url,
        siteName: "MENIUS",
        type: "website",
        images: [{ url: image, width: 1200, height: 630, alt: r.name }],
        locale: demoConfig.locale === "es" ? "es_MX" : "en_US",
      },
      twitter: {
        card: "summary_large_image",
        title: r.name,
        description,
        images: [image],
      },
      alternates: { canonical: url },
    };
  }

  // Use the lightweight fetch so this resolves quickly and streaming can start
  // without waiting for the full categories/products/reviews queries.
  const restaurant = await fetchRestaurantMeta(params.slug);
  if (!restaurant)
    return {
      title: "Menú no encontrado",
      robots: { index: false, follow: false },
    };

  const isEn = (restaurant.locale ?? "es") === "en";
  // Sin la marca: el layout raíz la agrega vía template '%s | MENIUS'.
  // fullTitle es para openGraph/twitter, que no pasan por el template.
  const title = `${restaurant.name} — ${isEn ? "Digital Menu" : "Menú Digital"}`;
  const fullTitle = `${title} | MENIUS`;

  // Build a rich description when the restaurant hasn't set one.
  // Include top category names so Google can show relevant snippets.
  const topCats: string[] = (restaurant as any).topCategoryNames ?? [];
  const autoDescription = isEn
    ? topCats.length > 0
      ? `Order online from ${restaurant.name}. Menu includes: ${topCats.join(", ")}. Fast and easy digital ordering.`
      : `Order online from ${restaurant.name}. Browse the full menu and place your order in seconds.`
    : topCats.length > 0
      ? `Pide en línea en ${restaurant.name}. Menú con: ${topCats.join(", ")}. Ordena fácil y rápido desde tu celular.`
      : `Pide en línea en ${restaurant.name}. Explora el menú completo y ordena en segundos desde tu celular.`;
  const description = restaurant.description || autoDescription;

  const url = `${APP_URL}/${restaurant.slug}`;
  const image =
    restaurant.cover_image_url ||
    restaurant.logo_url ||
    `${APP_URL}/opengraph-image`;
  const logoUrl = restaurant.logo_url ?? undefined;

  const availableLocales: string[] = restaurant.available_locales ?? [
    restaurant.locale ?? "es",
  ];
  const multiLang = availableLocales.length > 1;
  const langAlternates = multiLang
    ? Object.fromEntries([
        ...availableLocales.map((lc: string) => [lc, url]),
        ["x-default", url],
      ])
    : undefined;

  return {
    title,
    description,
    manifest: `/${restaurant.slug}/manifest.webmanifest`,
    icons: { apple: logoUrl || "/icons/icon-192.svg" },
    appleWebApp: {
      title: restaurant.name,
      statusBarStyle: "default",
      capable: true,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "MENIUS",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: restaurant.name }],
      locale: isEn ? "en_US" : "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title: restaurant.name,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
      ...(langAlternates ? { languages: langAlternates } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function SlugMenuPage({ params }: PageProps) {
  // Skip reserved paths — let Next.js handle them via their own routes
  if (RESERVED_PATHS.has(params.slug)) notFound();

  // High-conversion demo slug — Lechonería Donde Adri
  if (params.slug === "adri") {
    const adriRestaurant = {
      ...demoRestaurant,
      name: "Lechonería Donde Adri",
      slug: "adri",
      description: "La mejor lechona de Bogotá para tu evento",
      cover_image_url:
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=1400&q=85",
    };

    const lechonas = [
      {
        id: "adri-l-50",
        name: "50 platos",
        price: 350000,
        description: "Ideal para reuniones pequeñas",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 1,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-60",
        name: "60 platos",
        price: 370000,
        description: "",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 2,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-70",
        name: "70 platos",
        price: 420000,
        description: "",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 3,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-80",
        name: "80 platos",
        price: 450000,
        description: "El más popular",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 4,
        is_featured: true,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-100",
        name: "100 platos",
        price: 500000,
        description: "",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 5,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-120",
        name: "120 platos",
        price: 550000,
        description: "",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 6,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-150",
        name: "150 platos",
        price: 600000,
        description: "Para eventos grandes",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 7,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-l-200",
        name: "200 platos",
        price: 750000,
        description: "Eventos masivos",
        category_id: "lechona",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 8,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
    ] as unknown as Product[];

    const cojines = [
      {
        id: "adri-c-20",
        name: "20 platos",
        price: 230000,
        description: "",
        category_id: "cojin",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 1,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-c-30",
        name: "30 platos",
        price: 250000,
        description: "",
        category_id: "cojin",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 2,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-c-40",
        name: "40 platos",
        price: 290000,
        description: "",
        category_id: "cojin",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 3,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "adri-c-50",
        name: "50 platos",
        price: 330000,
        description: "",
        category_id: "cojin",
        restaurant_id: demoRestaurant.id,
        is_active: true,
        in_stock: true,
        sort_order: 4,
        is_featured: false,
        is_new: false,
        dietary_tags: [],
        prep_time_minutes: null,
        image_url: null,
        translations: null,
        created_at: new Date().toISOString(),
      },
    ] as unknown as Product[];

    return (
      <HighConversionLayout
        restaurant={adriRestaurant}
        productCategories={[
          { id: "lechona", name: "Lechona", emoji: "🐷", packs: lechonas },
          { id: "cojin", name: "Cojín", emoji: "🥔", packs: cojines },
        ]}
        whatsappNumber="573157727799"
        includes="Incluye arepas, tenedores y platos"
        deliveryNote="Domicilio gratis en Bogotá y Soacha"
        heroTitle="La mejor lechona de Bogotá"
        heroSubtitle="Crujiente, jugosa y de fábrica — para tu evento especial"
      />
    );
  }

  // Demo slugs
  const demoConfig = DEMO_SLUGS[params.slug];
  if (demoConfig) {
    return (
      <>
        <JsonLdScript
          restaurant={demoConfig.restaurant}
          slug={params.slug}
          categories={demoConfig.categories}
          products={demoConfig.products}
          reviewStats={{ average: 4.7, total: 128 }}
        />
        <MenuShell
          restaurant={demoConfig.restaurant}
          categories={demoConfig.categories}
          products={demoConfig.products}
          tableName={null}
          locale={demoConfig.locale}
          reviewStats={{ average: 4.7, total: 128 }}
          backUrl="/demo"
        />
      </>
    );
  }

  const data = await fetchMenuData(params.slug);
  if (!data) notFound();

  const storeOverrides = getStoreOverrides(params.slug);

  // Slim products: everything below is serialised into the HTML of a PUBLIC page,
  // so this is an allow-list, not a strip-list. menu-data.ts must `select('*')`
  // (see CLAUDE.md rule 11), which means the row carries columns the menu never
  // renders — including the restaurant's own margins (`cost_price`) and
  // inventory (`stock_qty`, `low_stock_threshold`, `track_inventory`). Those
  // were readable in page source by any visitor, competitors included.
  //
  // Keep this in sync with the Product type: if a card needs a new field, add it
  // here explicitly. variants/extras stay [] and modifier_groups is already []
  // from menu-data.ts — CustomizationSheet lazy-loads them via
  // /api/product-modifiers (product slim pattern, do not undo).
  const slimProducts = data.products.map((p) => ({
    id: p.id,
    restaurant_id: p.restaurant_id,
    category_id: p.category_id,
    name: p.name,
    description: p.description,
    price: p.price,
    compare_at_price: p.compare_at_price ?? null,
    image_url: p.image_url,
    is_active: p.is_active,
    in_stock: p.in_stock,
    is_featured: p.is_featured,
    is_new: p.is_new,
    dine_in_only: p.dine_in_only,
    hide_image: p.hide_image ?? false,
    prep_time_minutes: p.prep_time_minutes ?? null,
    dietary_tags: p.dietary_tags,
    translations: p.translations,
    sort_order: p.sort_order,
    created_at: p.created_at,
    popularity_rank: p.popularity_rank ?? null,
    orders_last_7d: p.orders_last_7d ?? null,
    has_modifiers: p.has_modifiers,
    variants: [],
    extras: [],
    modifier_groups: [],
  }));

  if (storeOverrides.layout_mode === "high_conversion" && data.restaurant) {
    const mainProduct = slimProducts.find(
      (p) => p.id === storeOverrides.heroProductId,
    );
    const packOptions = slimProducts.filter((p) =>
      storeOverrides.packProductIds?.includes(p.id),
    );

    if (mainProduct) {
      return (
        <>
          <JsonLdScript
            restaurant={data.restaurant}
            slug={params.slug}
            categories={data.categories}
            products={slimProducts}
            reviewStats={data.reviewStats}
          />
          <HighConversionLayout
            restaurant={data.restaurant}
            mainProduct={mainProduct}
            packOptions={packOptions || []}
          />
        </>
      );
    }
  }

  return (
    <>
      {/* Server component, but its output IS the page HTML — feed it the same
          slimmed products so private columns don't reach the document twice. */}
      <JsonLdScript
        restaurant={data.restaurant}
        slug={params.slug}
        categories={data.categories}
        products={slimProducts}
        reviewStats={data.reviewStats}
      />
      <MenuShell
        restaurant={data.restaurant}
        categories={data.categories}
        products={slimProducts}
        tableName={null}
        locale={data.locale}
        availableLocales={data.availableLocales}
        reviewStats={data.reviewStats}
        recentReviews={data.recentReviews}
        limitedMode={data.limitedMode ?? null}
        isFreePlan={data.isFreePlan ?? true}
      />
    </>
  );
}
