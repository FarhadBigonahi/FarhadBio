"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, ElementType, Ref } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** stagger delay in ms */
  delay?: number;
  /**
   * Opacity-only reveal that never sets `transform`/`filter`, so it can be
   * applied to elements that carry their own baseline transform (e.g. the
   * footer wordmark's translateY crop) without clobbering it.
   */
  fade?: boolean;
  as?:
    | "div"
    | "section"
    | "li"
    | "article"
    | "figure"
    | "p"
    | "header"
    | "h1"
    | "h2"
    | "h3"
    | "ul";
  style?: CSSProperties;
  id?: string;
  /** hide decorative wrappers (e.g. the footer wordmark) from assistive tech */
  ariaHidden?: boolean;
};

/**
 * Scroll-reveal wrapper. Mirrors the existing site's `.reveal` behaviour:
 * hidden (opacity 0, translateY) until it enters the viewport, then eases in.
 * Uses IntersectionObserver + CSS transition (same technique the current
 * fx-/wb- layers use) so it degrades gracefully without JS.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  fade = false,
  as = "div",
  style,
  id,
  ariaHidden,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as ElementType;
  const mergedStyle = {
    ...style,
    "--reveal-delay": `${delay}ms`,
  } as CSSProperties;
  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      id={id}
      aria-hidden={ariaHidden || undefined}
      className={`reveal ${fade ? "reveal--fade" : ""} ${className} ${
        inView ? "is-in" : ""
      }`.trim()}
      style={mergedStyle}
    >
      {children}
    </Tag>
  );
}
