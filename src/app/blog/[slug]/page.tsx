import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  getVisibleBlogPosts,
  getLocalizedBlogPost,
  getLocalizedRelatedPosts,
} from "@/lib/blog-data";
import { V2BlogContent } from "@/components/blog/V2BlogContent";
import { V2Page } from "@/components/landing-v2/V2Page";
import { V2Closing } from "@/components/landing-v2/V2Closing";
import { getLandingV2Copy, resolveLandingV2Locale } from "@/lib/landing-v2-copy";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Los posts ocultos (recorte EE.UU.) no se generan y su URL da 404.
export function generateStaticParams() {
  return getVisibleBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
  const post = getLocalizedBlogPost(params.slug, locale);
  if (!post) return { title: "Artículo no encontrado" };

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";
  const url = `/blog/${post.slug}`;
  const ogImage = `${APP_URL}/blog/${post.slug}/opengraph-image`;

  return {
    // El <title> usa la version corta cuando existe (Google corta cerca de los
    // 60 chars). openGraph/twitter siguen con el titular completo: al compartir
    // el enlace no hay ese limite y el titulo largo comunica mejor.
    title: post.seoTitle ?? post.title,
    description: post.description,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

function getUiText(locale: string) {
  if (locale === "en")
    return {
      minRead: "min read",
      related: "Related articles",
    };
  return {
    minRead: "min de lectura",
    related: "Artículos relacionados",
  };
}

export default async function BlogPostPage(props: PageProps) {
  const params = await props.params;
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
  const post = getLocalizedBlogPost(params.slug, locale);
  if (!post) notFound();

  const related = getLocalizedRelatedPosts(params.slug, locale, 3);
  const ui = getUiText(locale);

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: `${APP_URL}/blog/${post.slug}/opengraph-image`,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "MENIUS",
      logo: { "@type": "ImageObject", url: `${APP_URL}/icons/icon-512.svg` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${APP_URL}/blog/${post.slug}`,
    },
  };

  return (
    <V2Page locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content">
        <article className="article">
          <div className="wrap">
            <header className="ph">
              <p className="crumb">
                <Link href="/blog">← Blog</Link>
                <span aria-hidden="true">/</span>
                <span>{post.category}</span>
              </p>
              <h1 className="long">{post.title}</h1>
              <p className="ph-meta">
                <span>{formatDate(post.date, locale)}</span>
                <span>{post.readTime} {ui.minRead}</span>
                <span>{post.author}</span>
              </p>
            </header>
            <V2BlogContent content={post.content} />
          </div>
        </article>

        {related.length > 0 && (
          <section className="related" aria-labelledby="related-h">
            <div className="wrap">
              <h2 id="related-h">{ui.related}</h2>
              <ul className="posts">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/blog/${r.slug}`}>
                      <p className="kicker"><b>{r.category}</b></p>
                      <h3>{r.title}</h3>
                      <span className="meta">{r.readTime} min · {formatDate(r.date, locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* El cierre de la landing ("The next order is yours." + #022) en lugar de la tarjeta vieja. */}
        <V2Closing c={getLandingV2Copy(locale)} />
      </main>
    </V2Page>
  );
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
