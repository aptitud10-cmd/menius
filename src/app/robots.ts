import { url } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/", "/onboarding/", "/auth/", "/admin/"],
      },
    ],
    sitemap: url("sitemap.xml"),
  };
}
