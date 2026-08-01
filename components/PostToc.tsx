"use client";
import { useEffect, useState } from "react";
import { faDigits } from "@/lib/fa";

export type TocItem = { id: string; text: string };

/**
 * Table of contents for a long article, with the current section highlighted.
 *
 * Only rendered when a post has enough sections to be worth navigating — a
 * two-heading contents list is noise, not a shortcut.
 */
export default function PostToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === "undefined") return;

    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Several headings can be on screen at once; the one nearest the top
        // of the viewport is the section the reader is actually in.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Top-heavy margin: a heading counts as "current" from the moment it
      // reaches the upper third, not when it is about to leave the screen.
      { rootMargin: "-80px 0px -66% 0px", threshold: 0 }
    );

    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="wb-toc" aria-labelledby="wb-toc-title">
      <h2 className="wb-toc__title" id="wb-toc-title">
        در این نوشته
      </h2>
      <ol className="wb-toc__list">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={active === item.id ? "is-active" : ""}
              aria-current={active === item.id ? "true" : undefined}
            >
              <span className="wb-toc__num" aria-hidden="true">
                {faDigits(i + 1)}
              </span>
              <span>{item.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
