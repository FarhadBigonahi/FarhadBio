import type { Metadata, Viewport } from "next";
import "../globals.css";
import "../skills-certs.css";
import Beacon from "@/components/Beacon";
import { fontVars } from "../fonts";
import {
  DESCRIPTION,
  absoluteUrl,
  alternates,
  identity,
  sharedMetadata,
  twitterCreator,
} from "@/lib/seo";

// Root layout for the English marketing site. The Persian blog and the admin
// dashboard declare their own <html lang="fa" dir="rtl"> in sibling route
// groups, which is why there is no shared app/layout.tsx.

const TITLE = "Farhad Bigonahi — Full-Stack Developer & AI Builder";
const OG_IMAGE = "/images/kATPE4tr4ORiZnqG9UALE75bfoc.png";

export const metadata: Metadata = {
  ...sharedMetadata,
  title: {
    default: TITLE,
    template: "%s | Farhad Bigonahi",
  },
  description: DESCRIPTION,
  applicationName: identity.name,
  keywords: [
    "Farhad Bigonahi",
    "فرهاد بیگناهی",
    "full-stack developer",
    "برنامه‌نویس فول‌استک",
    "AI builder",
    "C# developer",
    "ASP.NET Core",
    ".NET developer",
    "React developer",
    "Next.js developer",
    "software engineer Dubai",
    "توسعه‌دهنده وب",
    "portfolio",
  ],
  alternates: alternates("/"),
  openGraph: {
    type: "website",
    siteName: identity.name,
    locale: "en_US",
    alternateLocale: ["fa_IR"],
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/"),
    images: [
      {
        url: OG_IMAGE,
        width: 1600,
        height: 1000,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    ...twitterCreator(),
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={fontVars}>
      <body>
        {children}
        <Beacon />
      </body>
    </html>
  );
}
