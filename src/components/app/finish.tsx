"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { Task } from "@/lib/tasks";
import { Art } from "./art";
import { burst } from "./petals";

/** The one full-bleed moment. Brief and warm, then the person decides what is next. */
export function Finish({ task, onStop, onToday, onAnother, onUndo }: { task: Task; onStop: () => void; onToday: () => void; onAnother: () => void; onUndo: () => void }) {
  const reduce = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    const t = setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.36, 28), 250);
    return () => clearTimeout(t);
  }, []);

  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 + i * 0.06, type: "spring" as const, bounce: 0, duration: 0.6 } };

  return (
    <div className="on-night relative min-h-dvh overflow-hidden bg-night text-white">
      <div className="absolute inset-0">
        <Art mode={1} />
        {/* Keep the words on calm, dark paint. */}
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-night via-night/85 to-transparent" />
      </div>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 safe-t safe-b">
        <main className="mt-auto pb-2">
          <motion.p {...rise(0)} className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-white/80">
            <span className="size-2 rounded-full bg-coral" /> Finished
          </motion.p>
          <motion.h1 {...rise(1)} ref={heading} tabIndex={-1} className="mt-3 text-[40px] font-medium leading-[1.04] tracking-[-0.04em] focus:outline-none [overflow-wrap:anywhere]">
            {task.title}
          </motion.h1>
          <motion.p {...rise(2)} className="mt-3 text-[17px] leading-relaxed text-white/85">
            That counts. One finished task is a whole win.
          </motion.p>
        </main>
        <motion.div {...rise(3)} className="flex flex-col gap-2 pb-2 pt-7">
          <button type="button" className="btn btn-white w-full text-[17px]" onClick={onStop}>
            Stop for now
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-glass min-h-[50px] px-3 text-[15px]" onClick={onToday}>
              Return to today
            </button>
            <button type="button" className="btn btn-glass min-h-[50px] px-3 text-[15px]" onClick={onAnother}>
              Choose another
            </button>
          </div>
          <button type="button" className="btn btn-quiet mt-1 min-h-11 text-[14px] text-white/75" onClick={onUndo}>
            Not finished yet? Undo
          </button>
        </motion.div>
      </div>
    </div>
  );
}
