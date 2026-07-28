import { createAdminClient } from "@/lib/supabase/admin";
import { blogPosts } from "@/lib/blog-data";
import { url } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: url(), lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: url("signup"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: url("blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: url("faq"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: url("setup-profesional"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: url("privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: url("terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: url("cookies"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: url("demo"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: url("la-casa-del-sabor"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: url("the-grill-house"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: url("start"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: url("changelog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: url("status"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: url(`blog/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  try {
    const db = createAdminClient();
    const { data: restaurants } = await db
      .from("restaurants")
      .select("slug, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5000);

    const restaurantPages: MetadataRoute.Sitemap = (restaurants ?? []).map(
      (r) => ({
        url: url(r.slug),
        lastModified: new Date(r.created_at),
        changeFrequency: "daily" as const,
        priority: 0.9,
      }),
    );

    return [...staticPages, ...blogPages, ...restaurantPages];
  } catch {
    return [...staticPages, ...blogPages];
  }
}
