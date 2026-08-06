import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/write", "/settings", "/welcome", "/login"],
      },
    ],
    sitemap: "https://backtick.blog/sitemap.xml",
  };
}
