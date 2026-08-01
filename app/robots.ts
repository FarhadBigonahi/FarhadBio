import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The dashboard and the BFF routes have no business in an index. The
        // middleware already bounces anonymous visitors to /admin/login, so
        // without this a crawler's only reward for the trip is a login form.
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${site.baseUrl}/sitemap.xml`,
    host: site.baseUrl,
  };
}
