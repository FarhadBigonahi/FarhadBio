"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  {
    href: "/admin",
    label: "Overview",
    icon: (
      <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />
    ),
  },
  {
    href: "/admin/posts",
    label: "Posts",
    icon: (
      <path d="M4 4h16v4H4V4Zm0 6h16v2H4v-2Zm0 4h10v2H4v-2Zm0 4h10v2H4v-2Z" />
    ),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <div className="ad-brand">
          <div className="ad-brand__dot">F</div>
          <div>
            <div className="ad-brand__name">Farhad.bio</div>
            <div className="ad-brand__sub">Control panel</div>
          </div>
        </div>

        <nav className="ad-nav">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={isActive(pathname, n.href) ? "active" : ""}
            >
              <svg
                viewBox="0 0 24 24"
                fill={n.href === "/admin/analytics" ? "none" : "currentColor"}
                stroke={n.href === "/admin/analytics" ? "currentColor" : "none"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {n.icon}
              </svg>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ad-side__foot">
          <Link href="/" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
            </svg>
            <span>View site</span>
          </Link>
          <button className="ad-logout" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="ad-main">
        <div className="ad-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="ad-actions">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
