import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MenuShell } from '@/components/public/MenuShell';
import { fetchMenuData } from './menu-data';
import { demoRestaurant, demoCategories, demoProducts } from '@/lib/demo-data';
import { grillHouseRestaurant, grillHouseCategories, grillHouseProducts } from '@/lib/demo-data-en';
import { JsonLdScript } from '@/components/public/JsonLdScript';

export const revalidate = 60;

interface PageProps {
  params: { slug: string };
  searchParams: { table?: string; v?: string };
}

const DEMO_SLUGS: Record<string, {
  restaurant: typeof demoRestaurant;
  categories: typeof demoCategories;
  products: typeof demoProducts;
  locale: 'es' | 'en';
}> = {
  demo: {
    restaurant: demoRestaurant,
    categories: demoCategories,
    products: demoProducts,
    locale: 'es',
  },
  'the-grill-house': {
    restaurant: grillHouseRestaurant,
    categories: grillHouseCategories,
    products: grillHouseProducts,
    locale: 'en',
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const demoConfig = DEMO_SLUGS[params.slug];

  if (demoConfig) {
    const r = demoConfig.restaurant;
    const title = `${r.name} — Menú Digital | MENIUS`;
    const description = r.description ?? `Pide online en ${r.name}`;
    const url = `${APP_URL}/r/${params.slug}`;
    const image = (r as any).cover_image_url || `${APP_URL}/icons/icon-512.svg`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'MENIUS',
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: r.name }],
        locale: demoConfig.locale === 'es' ? 'es_MX' : 'en_US',
      },
      twitter: { card: 'summary_large_image', title: r.name, description, images: [image] },
      alternates: { canonical: url },
    };
  }

  const data = await fetchMenuData(params.slug);
  if (!data) return { title: 'Menú no encontrado | MENIUS' };

  const { restaurant } = data;
  const isEn = data.locale === 'en';
  const title = `${restaurant.name} — ${isEn ? 'Digital Menu' : 'Menú Digital'} | MENIUS`;
  const description = restaurant.description ?? (isEn ? `Order online from ${restaurant.name}.` : `Pide online en ${restaurant.name}. Menú digital con MENIUS.`);
  const url = `${APP_URL}/r/${restaurant.slug}`;
  const image = restaurant.cover_image_url || restaurant.logo_url || `${APP_URL}/icons/icon-512.svg`;

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'MENIUS', type: 'website', images: [{ url: image, width: 1200, height: 630, alt: restaurant.name }], locale: isEn ? 'en_US' : 'es_MX' },
    twitter: { card: 'summary_large_image', title: restaurant.name, description, images: [image] },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function PublicMenuPage({ params, searchParams }: PageProps) {
  // Demo slugs — also use new MenuShell
  const demoConfig = DEMO_SLUGS[params.slug];
  if (demoConfig) {
    return (
      <>
        <JsonLdScript restaurant={demoConfig.restaurant} slug={params.slug} categories={demoConfig.categories} products={demoConfig.products} reviewStats={{ average: 4.7, total: 128 }} />
        <MenuShell
          restaurant={demoConfig.restaurant}
          categories={demoConfig.categories}
          products={demoConfig.products}
          tableName={searchParams.table ?? null}
          locale={demoConfig.locale}
          backUrl="/"
        />
      </>
    );
  }

  // Real restaurants — use new MenuShell
  const data = await fetchMenuData(params.slug);
  if (!data) notFound();

  const tableName = searchParams.table ?? null;

  return (
    <>
      <JsonLdScript restaurant={data.restaurant} slug={params.slug} categories={data.categories} products={data.products} reviewStats={data.reviewStats} />
      <MenuShell
        restaurant={data.restaurant}
        categories={data.categories}
        products={data.products}
        tableName={tableName}
        locale={data.locale}
      />
    </>
  );
}

