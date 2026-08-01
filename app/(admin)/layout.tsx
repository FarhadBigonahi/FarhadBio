import type { Metadata, Viewport } from "next";
import "../globals.css";
import { fontVars } from "../fonts";

// Root layout for the dashboard. Persian and RTL like the blog, but kept in its
// own route group so it never pulls in the blog stylesheet — and so its
// noindex applies to the whole subtree.

export const metadata: Metadata = {
  title: "پنل مدیریت — فرهاد بیگناهی",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
