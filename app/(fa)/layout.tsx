import type { Metadata, Viewport } from "next";
import "../globals.css";
import "../blog.css";
import Beacon from "@/components/Beacon";
import { fontVars } from "../fonts";
import { site } from "@/lib/content";
import { DESCRIPTION_FA, identity, sharedMetadata } from "@/lib/seo";

// Root layout for the Persian side of the site.
//
// This exists so the blog can declare <html lang="fa" dir="rtl"> for real. It
// used to render inside the English root layout, which told every crawler that
// a body of Persian writing was English — the single worst signal the site was
// sending. A nested layout cannot change <html>, hence the route group.

export const metadata: Metadata = {
  ...sharedMetadata,
  title: {
    default: `بلاگ | ${identity.nameFa}`,
    template: `%s | ${identity.nameFa}`,
  },
  description: DESCRIPTION_FA,
  applicationName: identity.nameFa,
  authors: [{ name: identity.nameFa, url: `${site.baseUrl}/` }],
  creator: identity.nameFa,
  publisher: identity.nameFa,
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function FaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={fontVars}>
      <body>
        {children}
        <Beacon />
      </body>
    </html>
  );
}
