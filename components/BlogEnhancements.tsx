"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for the blog pages (mirrors the original blog.js):
 *  - reveals `.wb-reveal` elements as they scroll into view
 *  - wires up the `.wb-copy` "copy code" buttons
 */
export default function BlogEnhancements() {
  useEffect(() => {
    const reveals = Array.from(
      document.querySelectorAll<HTMLElement>(".wb-reveal")
    );
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && reveals.length) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      reveals.forEach((el) => io!.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("is-in"));
    }

    const cleanups: Array<() => void> = [];
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".wb-copy")
    );
    buttons.forEach((btn) => {
      const handler = async () => {
        const code = btn.closest(".wb-code")?.querySelector("code");
        const text = code?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard unavailable — ignore */
        }
        const original = btn.textContent;
        btn.classList.add("is-done");
        btn.textContent = "کپی شد";
        window.setTimeout(() => {
          btn.classList.remove("is-done");
          btn.textContent = original;
        }, 1600);
      };
      btn.addEventListener("click", handler);
      cleanups.push(() => btn.removeEventListener("click", handler));
    });

    return () => {
      io?.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
