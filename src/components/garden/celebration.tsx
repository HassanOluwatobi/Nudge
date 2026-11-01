"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BellRing } from "lucide-react";
import { daypart, Landscape } from "./landscape";

const EASE = [0.23, 1, 0.32, 1] as const;

/** The finish. Forest green rises from your thumb, a stone lights up on your path, Nudge flies to the next one. */
export function Celebration({
  title,
  weekWins,
  canPick,
  askReminders,
  onMore,
  onRest,
  onReminders,
  onUndo,
}: {
  title: string;
  weekWins: number;
  plants?: number;
  canPick: boolean;
  askReminders: boolean;
  onMore: () => void;
  onRest: () => void;
  onReminders: () => void;
  onUndo?: () => void;
}) {
  const reduce = useReducedMotion();
  // Light the new stone a beat after the screen opens, so you see it happen.
  const [lit, setLit] = useState(Math.max(0, weekWins - 1));
  useEffect(() => {
    const t = setTimeout(() => setLit(weekWins), reduce ? 0 : 900);
    return () => clearTimeout(t);
  }, [weekWins, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onRest();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRest]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Your one thing is done" className="fixed inset-0 z-[70] overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[var(--forest)]"
        initial={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 50% 86%)" }}
        animate={reduce ? { opacity: 1 } : { clipPath: "circle(150% at 50% 86%)" }}
        transition={{ duration: 0.65, ease: EASE }}
      />
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--cream)]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.7, delay: 0.2 }}
          className="relative h-[clamp(220px,42dvh,360px)] overflow-hidden rounded-[30px]"
        >
          <Landscape lit={lit} celebrate={lit} part={daypart()} className="absolute inset-0 size-full" />
          {onUndo && (
            <button type="button" onClick={onUndo} className="btn absolute top-3 right-3 h-10 bg-[var(--cream)]/85 px-3.5 text-[14px] text-[var(--forest)] backdrop-blur">
              Undo
            </button>
          )}
        </motion.div>

        <div className="flex flex-1 flex-col justify-center px-3">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
            className="text-[64px] leading-[0.95] font-semibold tracking-[-0.045em]"
          >
            Done<span className="text-[var(--gold)]">.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.55 }} className="mt-3 line-clamp-2 text-[18px] font-medium text-[var(--cream)]/80 [overflow-wrap:anywhere]">
            {title}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.1 }} className="mt-4 text-[15px] text-[var(--gold-hi)]">
            {Math.min(weekWins, 7) >= 7 ? "Every stone is lit this week. Look how far you came." : "A new stone is lit on your path."}
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.75 }} className="space-y-2.5 px-3">
          <button type="button" onClick={canPick ? onMore : onRest} className="btn btn-gold h-[60px] w-full text-[17px]">
            {canPick ? "Do one more" : "Back to my path"}
          </button>
          {askReminders && (
            <button type="button" onClick={onReminders} className="btn h-[52px] w-full bg-[var(--cream)]/10 text-[15px] text-[var(--cream)]">
              <BellRing className="size-4" /> Remind me every day
            </button>
          )}
          {canPick && (
            <button type="button" onClick={onRest} className="btn h-11 w-full text-[15px] font-medium text-[var(--cream)]/75">
              I&apos;m done for now
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
