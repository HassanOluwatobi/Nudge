"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/* A small burst of petals when something gets done. Fired from anywhere with burst(x, y). */

const COLORS = ["#1d4df5", "#1236c2", "#3d68ff", "#547cff", "#6f97ff", "#0f2a9c", "#1d4df5"];

type Petal = { id: number; x: number; y: number; dx: number; dy: number; r: number; c: string; s: number; d: number };

export function burst(x: number, y: number, count = 16) {
  window.dispatchEvent(new CustomEvent("nudge:petals", { detail: { x, y, count } }));
}

export function burstFrom(el: Element | null, count?: number) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count);
}

let seq = 0;

export function Petals() {
  const [petals, setPetals] = useState<Petal[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const on = (e: Event) => {
      if (reduce) return;
      const { x, y, count } = (e as CustomEvent<{ x: number; y: number; count: number }>).detail;
      const made: Petal[] = Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 110;
        return {
          id: ++seq,
          x,
          y,
          dx: Math.cos(a) * v,
          dy: Math.sin(a) * v - 40,
          r: (Math.random() - 0.5) * 540,
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
          s: 0.7 + Math.random() * 0.7,
          d: 0.9 + Math.random() * 0.5,
        };
      });
      setPetals((p) => [...p, ...made]);
      setTimeout(() => setPetals((p) => p.filter((q) => !made.includes(q))), 1700);
    };
    window.addEventListener("nudge:petals", on);
    return () => window.removeEventListener("nudge:petals", on);
  }, [reduce]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {petals.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block h-[11px] w-[7px] rounded-[60%_60%_60%_60%/80%_80%_40%_40%]"
            style={{ left: p.x, top: p.y, background: p.c }}
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{ x: p.dx, y: [0, p.dy, p.dy + 140], scale: p.s, rotate: p.r, opacity: [1, 1, 0] }}
            transition={{ duration: p.d + 0.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
