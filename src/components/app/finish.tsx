"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { Task } from "@/lib/tasks";
import { Art } from "./art";
import { burstFrom } from "./petals";
import { Tile } from "./task-row";

/*
  Finish. One calm card of moving silk with a tick drawn in the middle, the
  task underneath, and three clear choices. Brief and warm, then the person
  decides what is next.
*/
export function Finish({ task, onStop, onToday, onAnother, onUndo }: { task: Task; onStop: () => void; onToday: () => void; onAnother: () => void; onUndo: () => void }) {
  const reduce = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const badge = useRef<HTMLDivElement>(null);

  useEffect(() => {
    heading.current?.focus();
    const t = setTimeout(() => burstFrom(badge.current, 26), 520);
    return () => clearTimeout(t);
  }, []);

  const steps = task.steps.length;
  const doneSteps = task.steps.filter((s) => s.d).length;
  const at = new Date(task.doneAt ?? Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.18 + i * 0.07, type: "spring" as const, bounce: 0, duration: 0.6 } };

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-t safe-b">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.7 }}
          className="relative mt-4 h-[min(44dvh,360px)] overflow-hidden rounded-[32px] shadow-[0_30px_60px_-36px_rgb(6_11_43/0.55)]"
        >
          <Art mode={1} />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <motion.div
              ref={badge}
              initial={reduce ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", bounce: 0.45, duration: 0.7 }}
              className="grid size-[104px] place-items-center rounded-full bg-white/95 shadow-[0_20px_40px_-18px_rgb(6_11_43/0.55)] backdrop-blur"
            >
              <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
                <motion.path
                  d="M13 25.5l7 7L35.5 16"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.42, duration: 0.42, ease: [0.65, 0, 0.35, 1] }}
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        <main className="flex flex-1 flex-col px-1 pt-7">
          <motion.p {...rise(0)} className="t-label text-signal-ink">
            Finished
          </motion.p>
          <motion.div {...rise(1)} className="mt-3 flex items-center gap-3">
            <Tile task={task} size={44} />
            <h1 ref={heading} tabIndex={-1} className="t-title min-w-0 flex-1 text-[30px] leading-[1.08] focus:outline-none [overflow-wrap:anywhere]">
              {task.title}
            </h1>
          </motion.div>
          <motion.p {...rise(2)} className="t-body mt-3 text-ink-2">
            That counts. One finished task is a whole win.
          </motion.p>
          <motion.div {...rise(3)} className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-ink-2 ring-1 ring-line">Done at {at}</span>
            {steps > 0 && (
              <span className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-ink-2 ring-1 ring-line tabular-nums">
                {doneSteps} of {steps} {steps === 1 ? "step" : "steps"}
              </span>
            )}
          </motion.div>

          <motion.div {...rise(4)} className="mt-auto flex flex-col gap-2 pb-3 pt-8">
            <button type="button" className="btn btn-ink w-full text-[17px]" onClick={onStop}>
              Take a break
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-line min-h-[50px] px-3 text-[15px]" onClick={onAnother}>
                Do another
              </button>
              <button type="button" className="btn btn-line min-h-[50px] px-3 text-[15px]" onClick={onToday}>
                Back to Today
              </button>
            </div>
            <button type="button" className="btn btn-quiet mt-1 min-h-11 text-[14px] text-ink-3" onClick={onUndo}>
              Not finished yet? Undo
            </button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
