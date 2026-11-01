"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bird } from "./bird";

export type Daypart = "morning" | "day" | "evening" | "night";

const PALETTES: Record<Daypart, { sky: [string, string]; cloud: string; far: string; farLit: string; mid: string; mid2: string; near: string; near2: string; bush: string; path: string; pathHi: string }> = {
  morning: { sky: ["#ffb98a", "#ffe9c4"], cloud: "#fff4dc", far: "#4aa79a", farLit: "#f2c58c", mid: "#55b84c", mid2: "#3c9f43", near: "#8fd03f", near2: "#59b23a", bush: "#2a7a33", path: "#f7b52c", pathHi: "#ffd866" },
  day: { sky: ["#45cde8", "#bff0ef"], cloud: "#fff6dd", far: "#2aa58f", farLit: "#ecc98e", mid: "#46b84a", mid2: "#2f9c3d", near: "#86cc39", near2: "#4fae37", bush: "#22702d", path: "#f8bd2e", pathHi: "#ffdc63" },
  evening: { sky: ["#f58e6b", "#ffd6a0"], cloud: "#ffe1c2", far: "#3d8f87", farLit: "#f0a874", mid: "#4aa34a", mid2: "#33893f", near: "#7fbb3b", near2: "#4f9c38", bush: "#225f2c", path: "#f4a92b", pathHi: "#ffcf5a" },
  night: { sky: ["#1d2f57", "#3d5a8e"], cloud: "#5a729e", far: "#22506a", farLit: "#3f6d86", mid: "#24634a", mid2: "#1b523d", near: "#2f7a45", near2: "#236438", bush: "#123b25", path: "#d9a640", pathHi: "#f3cb6a" },
};

export const daypart = (h = new Date().getHours()): Daypart => {
  // ?part=day lets you preview any time of day.
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("part");
    if (q === "morning" || q === "day" || q === "evening" || q === "night") return q;
  }
  return h < 5 ? "night" : h < 11 ? "morning" : h < 17 ? "day" : h < 21 ? "evening" : "night";
};

// The path's centreline, from your feet to the far hills.
const cubic = (p0: number[], p1: number[], p2: number[], p3: number[], t: number) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
};
const SEGS: number[][][] = [
  [[205, 320], [150, 280], [118, 250], [175, 228]],
  [[175, 228], [232, 206], [262, 196], [214, 182]],
  [[214, 182], [180, 172], [190, 160], [214, 154]],
];
const at = (t: number) => {
  const n = SEGS.length;
  const k = Math.min(n - 1, Math.floor(t * n));
  return cubic(SEGS[k][0], SEGS[k][1], SEGS[k][2], SEGS[k][3], t * n - k);
};
const width = (t: number) => 130 * Math.pow(1 - t, 1.6) + 5;

function pathShape() {
  const N = 90;
  const left: number[][] = [];
  const right: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.002));
    let dx = x2 - x, dy = y2 - y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Squash the sideways offset vertically for perspective.
    const w = width(t) / 2;
    left.push([x - dy * w, y + dx * w * 0.35]);
    right.push([x + dy * w, y - dx * w * 0.35]);
  }
  const pts = [...left, ...right.reverse()];
  return "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L") + "Z";
}
function centre(scale = 1) {
  const N = 60;
  return "M" + Array.from({ length: N + 1 }, (_, i) => at((i / N) * scale)).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
}

const STONES = [0.2, 0.32, 0.43, 0.53, 0.62, 0.71, 0.8];

/**
 * The world behind your one thing: a golden path of stepping stones through green hills.
 * Every finished thing lights one stone. Nudge waits at the next one.
 */
export function Landscape({ lit = 0, part = "day", className, celebrate = 0 }: { lit?: number; part?: Daypart; className?: string; celebrate?: number }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const P = PALETTES[part];
  const shape = useMemo(pathShape, []);
  const line = useMemo(() => centre(), []);
  const litCount = Math.min(lit, STONES.length);
  const birdT = STONES[Math.min(litCount, STONES.length - 1)];
  const [bx, by] = at(birdT);
  const bw = Math.max(30, width(birdT) * 0.6);

  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label={`Your path. ${litCount} of ${STONES.length} stones lit this week.`}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.sky[0]} />
          <stop offset="1" stopColor={P.sky[1]} />
        </linearGradient>
        <filter id={`grain${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <radialGradient id={`glow${id}`}>
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#sky${id})`} />
      {part === "night" &&
        [[40, 30], [90, 60], [150, 22], [230, 48], [300, 18], [350, 66], [370, 30], [120, 90], [270, 92]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.6} fill="#fff" opacity="0.85" />)}

      {/* Clouds: puffy, with a soft shaded underside */}
      {[
        [-14, 156, 1.15],
        [252, 152, 1.25],
        [128, 160, 0.75],
      ].map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
          <path d="M0 0 C 2 -18, 22 -24, 32 -12 C 38 -30, 66 -32, 74 -14 C 84 -24, 104 -20, 106 -4 C 116 -6, 124 -2, 124 0 Z" fill={P.cloud} />
          <path d="M6 0 C 20 -6, 50 -7, 70 -3 C 90 -6, 110 -4, 122 0 Z" fill="#000" opacity="0.05" />
        </g>
      ))}

      {/* Far mountains: faceted, with a sunlit face and a shadow face */}
      <g>
        <path d="M-24 192 L 70 92 L 156 192 Z" fill={P.far} />
        <path d="M70 92 L 156 192 L 116 192 L 98 150 L 84 132 Z" fill={P.farLit} opacity="0.9" />
        <path d="M70 92 L 40 192 L 12 192 Z" fill="#000" opacity="0.08" />
        <path d="M84 132 L 92 160 L 76 192 L 66 192 L 80 150 Z" fill="#000" opacity="0.06" />
        <path d="M214 192 L 318 84 L 424 192 Z" fill={P.far} />
        <path d="M318 84 L 424 192 L 372 192 L 350 146 L 334 118 Z" fill={P.farLit} opacity="0.9" />
        <path d="M318 84 L 284 192 L 250 192 Z" fill="#000" opacity="0.08" />
        <path d="M334 118 L 344 150 L 326 192 L 314 192 L 330 146 Z" fill="#000" opacity="0.06" />
        <path d="M116 192 L 200 126 L 296 192 Z" fill={P.far} opacity="0.7" />
      </g>

      {/* Rolling hills, layered back to front */}
      <path d="M-20 200 C 60 160, 140 178, 200 172 C 270 166, 340 150, 420 176 L 420 300 L -20 300 Z" fill={P.mid2} />
      <path d="M-20 214 C 70 186, 130 204, 210 196 C 290 188, 350 186, 420 200 L 420 300 L -20 300 Z" fill={P.mid} />
      <path d="M-20 246 C 60 214, 120 230, 180 236 C 250 242, 330 214, 420 226 L 420 300 L -20 300 Z" fill={P.near2} />
      <path d="M-20 270 C 50 246, 110 256, 160 270 C 230 288, 330 252, 420 262 L 420 300 L -20 300 Z" fill={P.near} />
      {/* Light catching the hill tops */}
      <path d="M-20 214 C 70 186, 130 204, 210 196 C 140 206, 60 196, -20 222 Z" fill="#fff" opacity="0.1" />
      <path d="M180 236 C 250 242, 330 214, 420 226 C 340 222, 260 248, 180 240 Z" fill="#fff" opacity="0.1" />

      {/* Wildflowers scattered in the grass */}
      <g fill={part === "night" ? "#c9d98a" : "#ffe36b"} opacity={part === "night" ? 0.45 : 0.85}>
        {[[30, 232], [58, 240], [84, 228], [112, 246], [256, 236], [282, 228], [330, 238], [356, 224], [20, 284], [70, 290], [300, 284], [340, 292], [380, 280], [140, 284], [150, 214], [262, 206], [44, 212]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={i % 3 ? 2.2 : 3} ry={i % 3 ? 1.4 : 1.8} />
        ))}
      </g>

      {/* The golden path */}
      <path d={shape} fill={P.path} stroke="#000" strokeOpacity="0.08" strokeWidth="2" />
      <path d={line} fill="none" stroke={P.pathHi} strokeWidth="3" strokeLinecap="round" opacity="0.65" />

      {/* Stepping stones. Lit ones glow. */}
      {STONES.map((t, i) => {
        const [x, y] = at(t);
        const s = width(t) / 130;
        const on = i < litCount;
        return (
          <g key={i}>
            {on && <circle cx={x} cy={y} r={30 * s + 6} fill={`url(#glow${id})`} />}
            <motion.ellipse
              cx={x}
              cy={y}
              rx={18 * s + 3}
              ry={(18 * s + 3) * 0.42}
              fill={on ? "#fff6c9" : "#fff8e6"}
              opacity={on ? 1 : 0.55}
              initial={false}
              animate={on && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 0.6, delay: i === litCount - 1 ? 0.2 : 0 }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            />
          </g>
        );
      })}

      {/* Trees and bushes: clustered crowns, darker underneath */}
      {[
        [18, 262, 1.25],
        [372, 246, 1.35],
        [96, 214, 0.45],
        [306, 206, 0.5],
        [330, 212, 0.32],
        [62, 222, 0.3],
      ].map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
          <rect x="-3" y="4" width="6" height="22" rx="2" fill="#5a3a22" opacity={part === "night" ? 0.6 : 1} />
          <circle cx="-12" cy="2" r="14" fill={P.bush} />
          <circle cx="12" cy="0" r="15" fill={P.bush} />
          <circle cx="0" cy="-12" r="16" fill={P.bush} />
          <circle cx="-4" cy="-16" r="8" fill="#fff" opacity="0.1" />
          <path d="M-26 6 C -14 16, 14 16, 27 4 C 14 10, -12 12, -26 6 Z" fill="#000" opacity="0.12" />
        </g>
      ))}

      {/* Nudge, hovering at the next stone */}
      <motion.g
        key={celebrate}
        initial={reduce ? false : { x: bx - 40, y: by - bw - 30, opacity: 0 }}
        animate={reduce ? { x: bx - bw / 2, y: by - bw * 0.95 } : { x: bx - bw / 2, y: [by - bw * 0.95, by - bw * 1.08, by - bw * 0.95], opacity: 1 }}
        transition={reduce ? { duration: 0 } : { x: { type: "spring", bounce: 0.3, duration: 0.9 }, opacity: { duration: 0.3 }, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
      >
        <svg width={bw} height={bw} viewBox="0 0 100 100" overflow="visible">
          <Bird color={part === "night" ? "#fff6dd" : "#16391f"} flap={!reduce} />
        </svg>
      </motion.g>

      <rect width="400" height="300" filter={`url(#grain${id})`} opacity="0.5" />
    </svg>
  );
}
