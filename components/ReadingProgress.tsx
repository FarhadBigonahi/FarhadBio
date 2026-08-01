"use client";
import { useEffect, useRef } from "react";

/**
 * The thin bar across the top of an article showing how far down it you are.
 *
 * Written straight to the element's transform rather than through React state:
 * this fires on every scroll frame, and re-rendering a component 60 times a
 * second to move one bar would be the most expensive thing on the page.
 */
export default function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      el.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    };

    const onScroll = () => {
      // Coalesce bursts of scroll events into one write per painted frame.
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="wb-progress" aria-hidden="true">
      <div className="wb-progress__bar" ref={bar} />
    </div>
  );
}
