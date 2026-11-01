"use client";

import { useEffect, useState } from "react";

/*
  The painted colour field. Soft blobs of the brand colours, a fine grain on
  top, and a bundle of thin lines drifting across. It shifts with the time of
  day, so morning feels different from night.
*/

type Part = "morning" | "day" | "evening" | "night";

const daypart = (h = new Date().getHours()): Part => (h < 5 ? "night" : h < 11 ? "morning" : h < 17 ? "day" : h < 21 ? "evening" : "night");

// Each field: a base, then blobs as [color, x%, y%, size%].
const FIELDS: Record<Part | "finish" | "focus", { base: string; blobs: [string, number, number, number][] }> = {
  morning: {
    base: "#1a5fd9",
    blobs: [
      ["#bdeb7a", 12, 92, 70],
      ["#ffb27a", 88, 96, 55],
      ["#14d6d6", 70, 30, 60],
      ["#f79be8", 100, 0, 40],
    ],
  },
  day: {
    base: "#1a4fe0",
    blobs: [
      ["#14d6d6", 85, 18, 65],
      ["#bdeb7a", 0, 100, 65],
      ["#c686ff", 100, 100, 45],
      ["#0033a8", 10, 0, 60],
    ],
  },
  evening: {
    base: "#0033a8",
    blobs: [
      ["#ffb27a", 10, 100, 70],
      ["#f79be8", 70, 90, 60],
      ["#c686ff", 95, 20, 55],
      ["#1a5fd9", 0, 0, 55],
    ],
  },
  night: {
    base: "#000b2e",
    blobs: [
      ["#0033a8", 80, 10, 75],
      ["#c686ff", 0, 100, 50],
      ["#14d6d6", 100, 100, 40],
      ["#1a5fd9", 20, 20, 50],
    ],
  },
  focus: {
    base: "#000b2e",
    blobs: [
      ["#0033a8", 100, 0, 70],
      ["#c686ff", -10, 30, 35],
      ["#14d6d6", 50, 120, 45],
    ],
  },
  finish: {
    base: "#1a4fe0",
    blobs: [
      ["#0033a8", 50, 115, 75],
      ["#f79be8", 20, 10, 55],
      ["#ffb27a", 90, 70, 60],
      ["#bdeb7a", 0, 100, 55],
      ["#14d6d6", 100, 0, 50],
    ],
  },
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function useDaypart(): Part {
  const [p, setP] = useState<Part>("day");
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("part") as Part | null;
    setP(q && q in FIELDS ? q : daypart());
  }, []);
  return p;
}

export function Aurora({
  field,
  className = "",
  lines = true,
  grain = 0.5,
  children,
}: {
  field: Part | "focus" | "finish";
  className?: string;
  lines?: boolean;
  grain?: number;
  children?: React.ReactNode;
}) {
  const f = FIELDS[field];
  const bg = f.blobs.map(([c, x, y, s]) => `radial-gradient(${s}% ${s * 1.1}% at ${x}% ${y}%, ${c} 0%, ${c}00 100%)`).join(",");
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ backgroundColor: f.base }}>
      <div aria-hidden className="aurora-drift absolute -inset-[15%] -z-10" style={{ backgroundImage: bg, filter: "saturate(1.1)" }} />
      {lines && <LineBundle className="pointer-events-none absolute inset-x-0 top-[18%] -z-10 h-[70%] w-full opacity-70" />}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 mix-blend-overlay" style={{ backgroundImage: GRAIN, opacity: grain }} />
      {children}
    </div>
  );
}

/** A loose bundle of thin lines that sweeps across the field. */
export function LineBundle({ className, color = "#fff", count = 18 }: { className?: string; color?: string; count?: number }) {
  const paths = Array.from({ length: count }, (_, i) => {
    const o = i * 2.2;
    const a = 30 + i * 1.4;
    return `M-20 ${120 - o} C 80 ${120 - a - o}, 160 ${40 + a - o}, 240 ${70 - o} S 380 ${150 - a * 0.6 - o}, 440 ${60 - o}`;
  });
  return (
    <svg viewBox="0 0 420 180" preserveAspectRatio="none" className={className} aria-hidden fill="none">
      {paths.map((d, i) => (
        <path key={i} d={d} stroke={color} strokeOpacity={0.08 + (i / count) * 0.32} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
