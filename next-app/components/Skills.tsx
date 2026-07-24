"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const SKILLS: { name: string; pct: number }[] = [
  { name: "C#", pct: 97 },
  { name: "ASP.NET Core", pct: 93 },
  { name: "Web API / REST", pct: 91 },
  { name: "SQL Server & EF Core", pct: 88 },
  { name: "JavaScript / TypeScript", pct: 86 },
  { name: "React & Next.js", pct: 83 },
  { name: "HTML & CSS", pct: 89 },
  { name: "Git & CI/CD", pct: 85 },
];

export default function Skills() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".fx-skill"));
    const reveal = () => items.forEach((el) => el.classList.add("is-in"));
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section className="fx-section fx-skills" id="skills">
      <div className="fx-container">
        <h2 className="fx-title">Skills</h2>
        <p className="fx-sub">Core stack &amp; day-to-day tools</p>
        <div className="fx-skillgrid" ref={gridRef}>
          {SKILLS.map((s) => (
            <div
              className="fx-skill fx-reveal"
              key={s.name}
              style={{ "--pct": `${s.pct}%` } as CSSProperties}
            >
              <div className="fx-skill-head">
                <span className="fx-skill-name">{s.name}</span>
                <span className="fx-skill-pct">{s.pct}%</span>
              </div>
              <div className="fx-track">
                <span className="fx-fill" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
