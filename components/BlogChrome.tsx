import Link from "next/link";

export function BlogNav() {
  return (
    <nav className="wb-nav" dir="ltr" aria-label="Primary">
      <Link className="wb-nav__brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/apple-touch-icon.png" alt="" width={28} height={28} />{" "}
        Farhad Bigonahi
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
      © <span dir="ltr">2026 Farhad Bigonahi</span> — ساخته‌شده با ❤️ ·{" "}
      <Link href="/blog">همه مطالب</Link>
    </footer>
  );
}
