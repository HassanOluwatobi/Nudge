"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BellRing, Check } from "lucide-react";
import { Wins } from "./home";

const EASE = [0.23, 1, 0.32, 1] as const;

/** The finish. A warm bloom from the button you pressed, one big word, a new dot. */
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onRest();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRest]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Your one thing is done" className="fixed inset-0 z-[70] overflow-hidden">
      {/* Bloom: grows out of the bottom, where your thumb was. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[var(--hot)]"
        initial={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 50% 88%)" }}
        animate={reduce ? { opacity: 1 } : { clipPath: "circle(150% at 50% 88%)" }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white">
        <div className="flex h-11 items-center justify-end">
          {onUndo && (
            <button type="button" onClick={onUndo} className="btn h-10 px-3 text-[15px] font-medium text-white/80">
              Undo
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <motion.span
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.6, delay: 0.25 }}
            className="grid size-16 place-items-center rounded-full bg-white text-[var(--hot)]"
          >
            <Check className="size-8" strokeWidth={3} />
          </motion.span>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
            className="mt-6 text-[72px] leading-[0.9] font-bold tracking-[-0.045em]"
          >
            Done.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }} className="mt-4 line-clamp-2 text-[19px] font-medium text-white/85 [overflow-wrap:anywhere]">
            {title}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.65 }} className="mt-8 [--hot:#fff] [--hair:rgb(255_255_255/0.3)] [--ink-3:rgb(255_255_255/0.8)]">
            <Wins count={weekWins} pulse />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.75 }} className="space-y-2.5">
          <button type="button" onClick={canPick ? onMore : onRest} className="btn h-[60px] w-full bg-white text-[17px] text-[#111]">
            {canPick ? "Do one more" : "Back to home"}
          </button>
          {askReminders && (
            <button type="button" onClick={onReminders} className="btn h-[52px] w-full bg-white/15 text-[15px] text-white">
              <BellRing className="size-4" /> Remind me every day
            </button>
          )}
          {canPick && (
            <button type="button" onClick={onRest} className="btn h-11 w-full text-[15px] font-medium text-white/80">
              I&apos;m done for now
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
