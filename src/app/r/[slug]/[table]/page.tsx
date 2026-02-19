import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchMenuData } from '../menu-data';
import { MenuShell } from '@/components/public/MenuShell';

export const revalidate = 60;

interface PageProps {
  params: { slug: string; table: string };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchMenuData(params.slug);
  if (!data) return { title: 'Menú no encontrado | MENIUS' };

  const { restaurant } = data;
  const tableName = decodeURIComponent(params.table);
  const isEn = data.locale === 'en';
  const title = `${restaurant.name} — ${tableName} | MENIUS`;
  const description = restaurant.description ?? (isEn ? `Order online from ${restaurant.name}.` : `Pide online en ${restaurant.name}.`);
  const url = `${APP_URL}/r/${params.slug}/${params.table}`;
  const image = restaurant.cover_image_url || restaurant.logo_url || `${APP_URL}/icons/icon-512.svg`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'MENIUS',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: restaurant.name }],
      locale: isEn ? 'en_US' : 'es_MX',
    },
    twitter: { card: 'summary_large_image', title: restaurant.name, description, images: [image] },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function TableMenuPage({ params }: PageProps) {
  const data = await fetchMenuData(params.slug);
  if (!data) notFound();

  const tableName = decodeURIComponent(params.table);

  return (
    <>
      <JsonLdScript restaurant={data.restaurant} slug={params.slug} products={data.products} />
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

function JsonLdScript({ restaurant, slug, products }: { restaurant: any; slug: string; products?: any[] }) {
  const url = `${APP_URL}/r/${slug}`;

  const restaurantLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    description: restaurant.description || undefined,
    url,
    ...(restaurant.address && { address: { '@type': 'PostalAddress', streetAddress: restaurant.address } }),
    ...(restaurant.phone && { telephone: restaurant.phone }),
    ...(restaurant.cover_image_url && { image: restaurant.cover_image_url }),
    ...(restaurant.logo_url && { logo: restaurant.logo_url }),
    servesCuisine: 'Various',
    acceptsReservations: false,
  };

  if (products && products.length > 0) {
    restaurantLd.hasMenu = {
      '@type': 'Menu',
      name: `Menú de ${restaurant.name}`,
      hasMenuSection: [{
        '@type': 'MenuSection',
        name: 'Menú completo',
        hasMenuItem: products.slice(0, 50).map((p: any) => ({
          '@type': 'MenuItem',
          name: p.name,
          description: p.description || undefined,
          ...(p.image_url && { image: p.image_url }),
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: restaurant.currency ?? 'MXN',
          },
        })),
      }],
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantLd) }}
    />
  );
}
