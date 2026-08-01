import type { MetadataRoute } from "next";
import { identity } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${identity.name} — ${identity.jobTitle}`,
    short_name: identity.name,
    description:
      "Portfolio and Persian engineering blog of Farhad Bigonahi, full-stack developer and AI builder.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080d17",
    theme_color: "#0b1220",
    lang: "en",
    dir: "ltr",
    categories: ["portfolio", "technology", "developer"],
    icons: [
      { src: "/images/logo.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/images/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
