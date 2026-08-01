import Link from "next/link";
import { identity } from "@/lib/seo";

export function BlogNav() {
  return (
    <nav className="wb-nav" dir="ltr" aria-label="Primary">
      {/* The brand is Persian here because every page carrying this nav is
          Persian. It is the most repeated visible string on the blog, so it is
          the single highest-leverage place for the name people search for.
          The container stays dir="ltr" — that only drives the nav's layout. */}
      <Link className="wb-nav__brand" href="/" lang="fa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/apple-touch-icon.png" alt="" width={28} height={28} />{" "}
        فرهاد بیگناهی
      </Link>
      <div className="wb-nav__links">
        <Link href="/">خانه</Link>
        <Link href="/blog">بلاگ</Link>
        <a href="mailto:business@farhad.bio">تماس</a>
      </div>
      <div className="wb-nav__switch" role="group" aria-label="زبان">
        <Link href="/" hrefLang="en" title="English">
          EN
        </Link>
        <span className="is-active" aria-current="true" lang="fa">
          FA
        </span>
      </div>
    </nav>
  );
}

export function BlogFooter() {
  return (
    <footer className="wb-footer">
      {/* Persian name first: this footer is on every Persian page, so it is the
          site's most repeated on-page instance of the name people search for.
          The Latin form stays for the copyright line. */}
      <p className="wb-footer__who">
        نوشته‌های <strong>{identity.nameFa}</strong> — {identity.jobTitleFa}
      </p>
      <p>
        © <span dir="ltr">2026 Farhad Bigonahi</span> — ساخته‌شده با ❤️ ·{" "}
        <Link href="/blog">همه مطالب</Link>
      </p>
    </footer>
  );
}
