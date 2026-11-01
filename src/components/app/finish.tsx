"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { Task } from "@/lib/tasks";
import { Contours, Field, Ribbon } from "./motifs";

/** A brief, warm acknowledgment. Then the person decides what happens next. */
export function Finish({
  task,
  onStop,
  onToday,
  onAnother,
  onUndo,
}: {
  task: Task;
  onStop: () => void;
  onToday: () => void;
  onAnother: () => void;
  onUndo: () => void;
}) {
  const reduce = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.9 + i * 0.07, type: "spring" as const, stiffness: 300, damping: 30 },
        };

  return (
    <Field tone="finish" className="on-night min-h-dvh text-white">
      <Contours className="pointer-events-none absolute inset-0 -z-10 h-full w-full" count={6} opacity={0.26} />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-t safe-b">
        <main className="flex flex-1 flex-col justify-center pb-8 pt-4">
          <Ribbon tone="finish" draw dot className="-mx-5 h-56 w-[calc(100%+2.5rem)]" />
          <motion.p {...rise(0)} className="mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/80">
            Finished
          </motion.p>
          <motion.h1
            {...rise(1)}
            ref={heading}
            tabIndex={-1}
            className="t-display mt-2 text-[40px] leading-[1.05] focus:outline-none [overflow-wrap:anywhere]"
          >
            {task.title}
          </motion.h1>
          <motion.p {...rise(2)} className="mt-3 text-[17px] text-white/85">
            That counts. One finished task is a whole win.
          </motion.p>
        </main>

        <motion.div {...rise(3)} className="flex flex-col gap-2 pb-2">
          <button type="button" className="btn btn-white w-full text-[17px]" onClick={onStop}>
            Stop for now
          </button>
          <div className="grid gap-2">
            <button type="button" className="btn btn-glass text-[15px]" onClick={onToday}>
              Return to today
            </button>
            <button type="button" className="btn btn-glass text-[15px]" onClick={onAnother}>
              Choose another task
            </button>
          </div>
          <button type="button" className="btn btn-quiet mt-1 min-h-11 text-[14px] text-white/75" onClick={onUndo}>
            Not finished yet? Undo
          </button>
        </motion.div>
      </div>
    </Field>
  );
}
