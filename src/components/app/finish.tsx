"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/tasks";
import { Thread, pullFor } from "./thread";

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
  const [pulled, setPulled] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    const t = setTimeout(() => setPulled(true), reduce ? 0 : 120);
    return () => clearTimeout(t);
  }, [reduce]);

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.35 + i * 0.07, type: "spring" as const, stiffness: 300, damping: 30 },
        };

  return (
    <div className="on-night min-h-dvh bg-night text-paper">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-t safe-b">
        <main className="flex flex-1 flex-col justify-center py-10">
          <Thread pull={pulled ? 1 : pullFor(task.steps)} done={pulled} tone="night" className="h-12 w-full max-w-[260px]" label="The thread is straight. Task finished." />
          <motion.p {...rise(0)} className="mt-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-moon">
            Finished
          </motion.p>
          <motion.h1
            {...rise(1)}
            ref={heading}
            tabIndex={-1}
            className="mt-2 font-serif text-[36px] leading-[1.1] tracking-[-0.02em] focus:outline-none [overflow-wrap:anywhere]"
          >
            {task.title}
          </motion.h1>
          <motion.p {...rise(2)} className="mt-3 text-[17px] text-paper/70">
            That counts. One finished task is a whole win.
          </motion.p>
        </main>

        <motion.div {...rise(3)} className="flex flex-col gap-2 pb-2">
          <button type="button" className="btn btn-moon w-full text-[17px]" onClick={onStop}>
            Stop for now
          </button>
          <div className="grid gap-2">
            <button type="button" className="btn btn-night-quiet text-[15px]" onClick={onToday}>
              Return to today
            </button>
            <button type="button" className="btn btn-night-quiet text-[15px]" onClick={onAnother}>
              Choose another task
            </button>
          </div>
          <button type="button" className="btn btn-quiet mt-1 min-h-11 text-[14px] text-paper/50" onClick={onUndo}>
            Not finished yet? Undo
          </button>
        </motion.div>
      </div>
    </div>
  );
}
