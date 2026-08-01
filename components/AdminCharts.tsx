import type { ReactNode } from "react";
import type { DayPoint, Ranked } from "@/lib/api-types";
import { faCompact, faDigits } from "@/lib/admin-i18n";

/** Persian compact number — kept named `fmt` for the pages that already call it. */
export function fmt(n: number): string {
  return faCompact(n);
}

export function Trend({ value }: { value: number }) {
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "—";
  return (
    <span className={`ad-trend ad-trend--${dir}`}>
      {arrow} {faDigits(Math.abs(value))}٪
    </span>
  );
}

export function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string;
  trend?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="ad-card">
      <div className="ad-stat__label">
        {icon}
        {label}
      </div>
      <div className="ad-stat__value">{value}</div>
      {typeof trend === "number" && <Trend value={trend} />}
    </div>
  );
}

/** Smooth-ish area chart drawn as a raw SVG path — zero dependencies. */
export function AreaChart({ data }: { data: DayPoint[] }) {
  const W = 720;
  const H = 240;
  const pad = { t: 16, r: 12, b: 22, l: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.views));
  const n = data.length;

  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const line = data.map((d, i) => `${x(i)},${y(d.views)}`).join(" ");
  const area =
    `M ${pad.l},${pad.t + ih} ` +
    data.map((d, i) => `L ${x(i)},${y(d.views)}`).join(" ") +
    ` L ${pad.l + iw},${pad.t + ih} Z`;

  const gridVals = [0, 0.5, 1];
  const labelEvery = Math.ceil(n / 6);

  return (
    <svg className="ad-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0099ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0099ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map((g, i) => (
        <g key={i}>
          <line
            className="grid"
            x1={pad.l}
            x2={pad.l + iw}
            y1={pad.t + ih - g * ih}
            y2={pad.t + ih - g * ih}
          />
          <text className="ad-axis" x={0} y={pad.t + ih - g * ih + 3}>
            {fmt(Math.round(g * max))}
          </text>
        </g>
      ))}
      <path className="area" d={area} />
      <polyline className="line" points={line} />
      {n <= 31 &&
        data.map((d, i) => <circle key={i} className="dot" cx={x(i)} cy={y(d.views)} r={n > 20 ? 1.6 : 2.6} />)}
      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={i} className="ad-axis" x={x(i)} y={H - 6} textAnchor="middle">
            {faDigits(d.day.slice(5))}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function BarList({
  items,
  empty = "No data yet",
  format = (v: number) => fmt(v),
}: {
  items: Ranked[];
  empty?: string;
  format?: (v: number) => string;
}) {
  if (!items.length) return <div className="ad-empty">{empty}</div>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="ad-bars">
      {items.map((it, i) => (
        <div className="ad-bar" key={i}>
          <span className="ad-bar__fill" style={{ width: `${(it.value / max) * 100}%` }} />
          <span className="ad-bar__label" dir="auto">{it.extra || it.label}</span>
          <span className="ad-bar__val ad-num">{format(it.value)}</span>
        </div>
      ))}
    </div>
  );
}
