"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

/*
  The NudgeMe signature. A loose thought is a tangled line.
  `pull` goes from 0 (tangled) to 1 (straight). Steps pull it straighter.
  When `done`, the dot at the end lights up.
*/

// The tangle, as cubic segments. A straight line uses the same x values with y = MID.
const MID = 24;
const W = 220;
const SEGS: [number, number, number, number, number, number][] = [
  // c1x c1y c2x c2y x y
  [22, 4, 38, 46, 52, 22],
  [62, 4, 42, 2, 46, 26],
  [50, 48, 82, 44, 94, 22],
  [104, 4, 128, 6, 124, 28],
  [120, 46, 150, 42, 160, 20],
  [170, 2, 186, 30, W - 14, MID],
];

const STRANDS = 7;

function pathFor(p: number, i = 0) {
  // Each strand sits a little lower and swings a little wider. Straightening gathers them into one line.
  const k = 1 - p;
  const off = (i - (STRANDS - 1) / 2) * 1.5 * k;
  const amp = 1 + (i - 3) * 0.06;
  const y = (v: number) => (MID + off + (v - MID) * k * amp).toFixed(2);
  let d = `M8 ${(MID + off).toFixed(2)}`;
  for (const [c1x, c1y, c2x, c2y, x, yy] of SEGS) d += ` C${c1x} ${y(c1y)} ${c2x} ${y(c2y)} ${x} ${y(yy)}`;
  return d;
}

export function Thread({
  pull,
  done = false,
  tone = "paper",
  className,
  label,
}: {
  pull: number;
  done?: boolean;
  tone?: "paper" | "night" | "signal";
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(pull);
  const d0 = useTransform(mv, (v) => pathFor(v, 0));
  const d1 = useTransform(mv, (v) => pathFor(v, 1));
  const d2 = useTransform(mv, (v) => pathFor(v, 2));
  const d3 = useTransform(mv, (v) => pathFor(v, 3));
  const d4 = useTransform(mv, (v) => pathFor(v, 4));
  const d5 = useTransform(mv, (v) => pathFor(v, 5));
  const d6 = useTransform(mv, (v) => pathFor(v, 6));
  const ds = [d0, d1, d2, d3, d4, d5, d6];

  useEffect(() => {
    if (reduce) {
      mv.set(pull);
      return;
    }
    const c = animate(mv, pull, { type: "spring", stiffness: 120, damping: 18, mass: 1 });
    return () => c.stop();
  }, [pull, reduce, mv]);

  const stroke = tone === "paper" ? "var(--signal)" : "#fff";
  const dotIdle = tone === "paper" ? "var(--line)" : "rgb(255 255 255 / 0.3)";

  return (
    <svg
      viewBox={`0 0 ${W} 48`}
      preserveAspectRatio="xMinYMid meet"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
    >
      {ds.map((d, i) => (
        <motion.path key={i} d={d} stroke={stroke} strokeOpacity={i === 3 ? 1 : 0.35} strokeWidth={i === 3 ? 2.4 : 1} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <motion.circle
        cx={W - 8}
        cy={MID}
        initial={false}
        animate={{ r: done ? 7 : 5, fill: done ? "var(--coral)" : dotIdle }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 16, delay: done ? 0.25 : 0 }}
      />
    </svg>
  );
}

/** How straight a task's thread is, from its finished steps. Never quite straight until finished. */
export const pullFor = (steps: number) => Math.min(0.8, 1 - 1 / (1 + steps * 0.6));

/** The small logo mark: a short tangle that ends in a dot. */
export function Mark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 40 24" className={className} fill="none" aria-hidden>
      <path
        d="M3 14 C7 2, 14 2, 13 12 C12 21, 4 19, 9 11 C13 5, 20 12, 30 12"
        stroke={light ? "#fff" : "var(--signal)"}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={34.5} cy={12} r={3.5} fill="var(--coral)" />
    </svg>
  );
}
