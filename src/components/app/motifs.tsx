"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";

/*
  NudgeMe motifs. Four shapes, reused everywhere, never invented per screen.

  1. Field    A painted midnight or electric colour field with printed stipple and grain.
              Brand moments only: Today hero, Finish, Rest, empty Today.
  2. Ribbon   A broad sculptural band shaped like the thread: it loops once, then runs straight.
              One per field, never on working surfaces.
  3. Contours Fine orbital lines. At most one set per field, low opacity.
  4. Dot      The coral end point. It means finished, and only that.
  (The Thread, a bundle of thin strands, is the small working-surface version of the ribbon.)
*/

export type Part = "morning" | "day" | "evening" | "night";
export type Tone = Part | "finish" | "focus";

const daypart = (h = new Date().getHours()): Part => (h < 5 ? "night" : h < 11 ? "morning" : h < 17 ? "day" : h < 21 ? "evening" : "night");

export function useDaypart(): Part {
  const [p, setP] = useState<Part>("day");
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("part") as Part | null;
    setP(q && ["morning", "day", "evening", "night"].includes(q) ? q : daypart());
  }, []);
  return p;
}

// Base anchor plus a few painterly blobs: [color, x%, y%, w%, h%].
const FIELDS: Record<Tone, { base: string; blobs: [string, number, number, number, number][] }> = {
  morning: {
    base: "#1d4df5",
    blobs: [
      ["#060b2b", -5, -10, 70, 55],
      ["#19d3e6", 105, 95, 45, 40],
      ["#c3ef6e", 70, 120, 35, 25],
    ],
  },
  day: {
    base: "#1d4df5",
    blobs: [
      ["#060b2b", -10, -15, 75, 60],
      ["#5ef0cf", 110, 100, 40, 35],
      ["#b9a2ff", 90, 10, 30, 30],
    ],
  },
  evening: {
    base: "#101a4d",
    blobs: [
      ["#1d4df5", 100, 85, 75, 60],
      ["#ff6b4a", 110, 115, 35, 30],
      ["#ff9bd6", 60, 120, 30, 22],
    ],
  },
  night: {
    base: "#060b2b",
    blobs: [
      ["#1d4df5", 95, 100, 65, 55],
      ["#b9a2ff", -10, 120, 30, 30],
      ["#101a4d", 20, 10, 60, 50],
    ],
  },
  focus: {
    base: "#060b2b",
    blobs: [["#1d4df5", 110, -15, 55, 40]],
  },
  finish: {
    base: "#1d4df5",
    blobs: [
      ["#060b2b", 50, 120, 90, 55],
      ["#19d3e6", -10, -10, 40, 35],
      ["#ff9bd6", 110, 5, 30, 28],
    ],
  },
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Motif 1: the painted field. Texture stays behind content, never over it. */
export function Field({
  tone,
  className = "",
  stipple = true,
  grain = 0.32,
  children,
}: {
  tone: Tone;
  className?: string;
  stipple?: boolean;
  grain?: number;
  children?: React.ReactNode;
}) {
  const f = FIELDS[tone];
  const bg = f.blobs.map(([c, x, y, w, h]) => `radial-gradient(${w}% ${h}% at ${x}% ${y}%, ${c} 0%, ${c}cc 25%, ${c}00 100%)`).join(",");
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ backgroundColor: f.base }}>
      <div aria-hidden className="field-drift absolute -inset-[12%] -z-20" style={{ backgroundImage: bg }} />
      {stipple && <div aria-hidden className="stipple pointer-events-none absolute inset-0 -z-10" />}
      {grain > 0 && <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 mix-blend-soft-light" style={{ backgroundImage: GRAIN, opacity: grain }} />}
      {children}
    </div>
  );
}

const RIBBON_STOPS: Record<Tone, string[]> = {
  morning: ["#5ef0cf", "#19d3e6", "#c3ef6e", "#ffb98a"],
  day: ["#19d3e6", "#5ef0cf", "#b9a2ff", "#ff9bd6"],
  evening: ["#ffb98a", "#ff6b4a", "#ff9bd6", "#b9a2ff"],
  night: ["#b9a2ff", "#19d3e6", "#5ef0cf", "#a9f0f5"],
  focus: ["#19d3e6", "#5ef0cf"],
  finish: ["#19d3e6", "#c3ef6e", "#ffb98a", "#ff6b4a"],
};

// The thread's centreline: enters, loops once, then runs straight out.
const RIBBON_PATH = "M-40 196 C 40 200, 92 76, 176 84 C 262 92, 246 206, 182 198 C 118 190, 150 104, 250 112 C 310 117, 350 122, 452 120";
const RIBBON_PATH_DOT = "M-40 196 C 40 200, 92 76, 176 84 C 262 92, 246 206, 182 198 C 118 190, 150 104, 250 112 C 300 116, 330 120, 352 120";

/** Motif 2: the sculptural ribbon. `dot` ends it on the coral finish point. */
export function Ribbon({ tone, className, draw = false, dot = false }: { tone: Tone; className?: string; draw?: boolean; dot?: boolean }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const stops = RIBBON_STOPS[tone];
  const d = dot ? RIBBON_PATH_DOT : RIBBON_PATH;
  const anim = draw && !reduce;
  const pathMotion = anim
    ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 1.1, ease: [0.65, 0, 0.35, 1] as const } }
    : {};

  return (
    <svg viewBox="0 0 400 260" className={className} aria-hidden fill="none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
          {stops.map((c, i) => (
            <stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <filter id={`b${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={`s${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`h${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        {/* printed grain clipped to the ribbon itself */}
        <filter id={`t${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" result="gm" />
          <feBlend in="SourceGraphic" in2="gm" mode="soft-light" />
        </filter>
      </defs>
      {/* glow */}
      <motion.path d={d} stroke={`url(#g${id})`} strokeWidth={74} strokeLinecap="round" opacity={0.4} filter={`url(#b${id})`} {...pathMotion} />
      {/* cast shade below the band */}
      <motion.path d={d} transform="translate(0 12)" stroke="#060b2b" strokeWidth={36} strokeLinecap="round" opacity={0.28} filter={`url(#s${id})`} {...pathMotion} />
      {/* the band */}
      <motion.path d={d} stroke={`url(#g${id})`} strokeWidth={40} strokeLinecap="round" filter={`url(#t${id})`} {...pathMotion} />
      {/* light catching the top edge */}
      <motion.path d={d} transform="translate(0 -11)" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.5} filter={`url(#h${id})`} {...pathMotion} />
      {dot && (
        <motion.g
          initial={anim ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: anim ? 1.0 : 0, type: "spring", stiffness: 420, damping: 18 }}
          style={{ transformOrigin: "372px 120px" }}
        >
          <circle cx={372} cy={120} r={26} fill="#ff6b4a" opacity={0.35} filter={`url(#s${id})`} />
          <circle cx={372} cy={120} r={13} fill="#ff6b4a" />
          <circle cx={368} cy={115} r={4} fill="#fff" opacity={0.55} />
        </motion.g>
      )}
    </svg>
  );
}

/** Motif 3: fine orbital contours. Sparse and quiet. */
export function Contours({ className, count = 7, opacity = 0.22 }: { className?: string; count?: number; opacity?: number }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden fill="none" preserveAspectRatio="xMidYMid slice">
      <g transform="rotate(-14 260 170)">
        {Array.from({ length: count }, (_, i) => (
          <ellipse
            key={i}
            cx={270}
            cy={170}
            rx={70 + i * 26}
            ry={30 + i * 13}
            stroke="#fff"
            strokeOpacity={opacity * (1 - i / (count + 2))}
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

/** Motif 4: the finish dot, for small places. */
export function Dot({ className, done = true }: { className?: string; done?: boolean }) {
  return <span aria-hidden className={`inline-block size-2.5 rounded-full ${done ? "bg-coral" : "bg-line"} ${className ?? ""}`} />;
}
