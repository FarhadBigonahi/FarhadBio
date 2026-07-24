import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./skills-certs.css";

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
});

const iranSansX = localFont({
  variable: "--font-iransansx",
  display: "swap",
  src: [
    { path: "../fonts/IRANSansX-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IRANSansX-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IRANSansX-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IRANSansX-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/IRANSansX-Black.woff2", weight: "900", style: "normal" },
  ],
});

const DESCRIPTION =
  "Farhad Bigonahi — full-stack developer and AI-driven builder. I design and ship clean, high-impact web products end to end, from database to interface.";

export const metadata: Metadata = {
  metadataBase: new URL("https://farhad.bio"),
  title: "Farhad Bigonahi — Full-Stack Developer & AI Builder",
  description: DESCRIPTION,
  keywords: [
    "Farhad Bigonahi",
    "full-stack developer",
    "AI builder",
    "C#",
    ".NET",
    "web developer",
    "software engineer",
    "Dubai",
    "portfolio",
  ],
  authors: [{ name: "Farhad Bigonahi", url: "https://farhad.bio/" }],
  creator: "Farhad Bigonahi",
  alternates: {
    canonical: "/",
    languages: { en: "/", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "Farhad Bigonahi",
    locale: "en_US",
    title: "Farhad Bigonahi — Full-Stack Developer & AI Builder",
    description:
      "Farhad Bigonahi — full-stack developer and AI-driven builder. I design and ship clean, high-impact web products end to end.",
    url: "https://farhad.bio/",
    images: [
      {
        url: "/images/kATPE4tr4ORiZnqG9UALE75bfoc.png",
        width: 1600,
        height: 1000,
        alt: "Farhad Bigonahi — Full-Stack Developer & AI Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farhad Bigonahi — Full-Stack Developer & AI Builder",
    description:
      "Farhad Bigonahi — full-stack developer and AI-driven builder. I design and ship clean, high-impact web products end to end.",
    images: ["/images/kATPE4tr4ORiZnqG9UALE75bfoc.png"],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  icons: {
    icon: [
      {
        url: "/images/logo.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/logo-white.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/images/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${satoshi.variable} ${iranSansX.variable}`}>
      <body>{children}</body>
    </html>
  );
}
