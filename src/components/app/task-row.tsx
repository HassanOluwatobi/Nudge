"use client";

import { Bell, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { feel, haptic } from "@/lib/feedback";
import { type Hue, type Task, fmtMins, prettyDue, stepsDone, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { burstFrom } from "./petals";

export function Tile({ task, size = 40 }: { task: Pick<Task, "emoji" | "title" | "hue">; size?: number }) {
  return (
    <span
      aria-hidden
      className={`hue-${task.hue} tile grid shrink-0 place-items-center rounded-[12px] font-semibold`}
      style={{ width: size, height: size, fontSize: task.emoji ? size * 0.5 : size * 0.42 }}
    >
      {task.emoji ?? task.title.charAt(0).toUpperCase()}
    </span>
  );
}

/** A tick that draws itself. */
function Tick({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden>
      <motion.path d="M3.5 8.4 6.6 11.4 12.6 4.8" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.05 }} />
    </svg>
  );
}

/** The small step check used in lists, sheets and Focus. */
export function StepCheck({ done, hue, size = 24 }: { done: boolean; hue: Hue; size?: number }) {
  return (
    <motion.span
      aria-hidden
      className={`hue-${hue} grid shrink-0 place-items-center rounded-full border-2`}
      style={{ width: size, height: size }}
      initial={false}
      animate={{ backgroundColor: done ? "var(--h)" : "rgba(255,255,255,0)", borderColor: done ? "var(--h)" : "rgba(95,101,132,0.55)", scale: done ? [1, 0.84, 1.08, 1] : 1 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      {done && <Tick size={size * 0.6} />}
    </motion.span>
  );
}

/** The round check. One tap finishes the whole task, so it says so to screen readers. */
export function CheckButton({ task, onDone, label }: { task: Task; onDone: () => void; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ticked, setTicked] = useState(false);
  const reduce = useReducedMotion();
  const done = task.bucket === "done" || ticked;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label ?? (task.bucket === "done" ? `Put back: ${task.title}` : `Finish task: ${task.title}`)}
      aria-pressed={task.bucket === "done"}
      onClick={(e) => {
        e.stopPropagation();
        if (task.bucket === "done") {
          feel("undo", "light");
          return onDone();
        }
        setTicked(true);
        burstFrom(ref.current, 14);
        feel("done", "success");
        setTimeout(onDone, reduce ? 0 : 520);
      }}
      className={`hue-${task.hue} relative grid size-11 shrink-0 place-items-center rounded-full`}
    >
      {/* A soft ring that blooms outward on tick. */}
      <AnimatePresence>
        {ticked && !reduce && (
          <motion.span className="absolute size-[26px] rounded-full border-2" style={{ borderColor: "var(--h)" }} initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2.1, opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
        )}
      </AnimatePresence>
      <motion.span
        className="grid size-[26px] place-items-center rounded-full border-2"
        initial={false}
        animate={{
          backgroundColor: done ? "var(--h)" : "rgba(255,255,255,0)",
          borderColor: done ? "var(--h)" : "#1b2044",
          scale: ticked ? [1, 0.78, 1.12, 1] : 1,
        }}
        whileTap={{ scale: 0.86 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {done && <Tick />}
      </motion.span>
    </button>
  );
}

/** A task row, after Tiimo: tile, title, time, steps bar, round check. Hold for quick actions. */
export function TaskRow({
  task,
  actions,
  onOpen,
  onMenu,
  onFinished,
}: {
  task: Task;
  actions: Actions;
  onOpen: (t: Task) => void;
  onMenu: (t: Task) => void;
  onFinished?: (t: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const done = task.bucket === "done";
  const n = task.steps.length;
  const k = stepsDone(task);
  const today = ymd();
  const meta = [fmtMins(task.mins), task.due && !done ? prettyDue(task.due, today) : ""].filter(Boolean).join(" · ");

  const startHold = () => {
    held.current = false;
    setPressing(true);
    hold.current = setTimeout(() => {
      held.current = true;
      setPressing(false);
      feel("open", "medium");
      onMenu(task);
    }, 460);
  };
  const endHold = () => {
    setPressing(false);
    if (hold.current) clearTimeout(hold.current);
  };

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: pressing ? 0.975 : 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", bounce: 0, duration: pressing ? 0.46 : 0.36 }}
      className="task-row overflow-hidden"
    >
      <div className="flex items-center gap-3 pl-3 pr-1">
        <button
          type="button"
          className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => {
            e.preventDefault();
            endHold();
            haptic("medium");
            onMenu(task);
          }}
          onClick={() => {
            if (held.current) return;
            onOpen(task);
          }}
          aria-label={`${task.title}. Open details. Hold for quick actions.`}
        >
          <Tile task={task} />
          <span className="min-w-0 flex-1">
            <span className={`relative block text-[16px] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere] ${done ? "text-ink-3" : ""}`}>
              {task.title}
              {done && <motion.span aria-hidden className="absolute left-0 top-1/2 h-[1.5px] bg-ink-3/70" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />}
            </span>
            {(meta || task.remindAt) && !done && (
              <span className="t-small mt-0.5 flex items-center gap-1.5 text-ink-3">
                {meta}
                {task.remindAt && (
                  <span className="inline-flex items-center gap-0.5">
                    {meta && "·"} <Bell className="size-3" aria-label="Reminder set" />
                  </span>
                )}
              </span>
            )}
          </span>
        </button>
        <CheckButton
          task={task}
          onDone={() => {
            if (done) actions.restore(task.id);
            else {
              actions.finish(task.id);
              onFinished?.(task);
            }
          }}
        />
      </div>
      {n > 0 && !done && (
        <>
          <button type="button" onClick={() => (setOpen((v) => !v), feel("tap"))} aria-expanded={open} aria-label={`${k} of ${n} steps done. ${open ? "Hide" : "Show"} steps`} className="flex h-9 w-full items-center gap-3 border-t border-line/70 bg-[#fbf9f4] px-3.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ebe6db]">
              <motion.span className={`hue-${task.hue} block h-full rounded-full`} style={{ background: "var(--h)" }} initial={false} animate={{ width: `${(k / n) * 100}%` }} transition={{ type: "spring", bounce: 0.15, duration: 0.6 }} />
            </span>
            <span className="t-small tabular-nums text-ink-3">
              {k}/{n}
            </span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
              <ChevronDown className="size-4 text-ink-3" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.34 }} className="overflow-hidden bg-[#fbf9f4]">
                {task.steps.map((s, i) => (
                  <motion.li key={s.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <button
                      type="button"
                      onClick={() => {
                        actions.toggleStep(task.id, s.id);
                        feel(s.d ? "unstep" : "step", "light");
                      }}
                      className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left"
                      aria-pressed={s.d}
                    >
                      <StepCheck done={s.d} hue={task.hue} size={20} />
                      <span className={`text-[15px] transition-colors ${s.d ? "text-ink-3 line-through" : ""}`}>{s.t}</span>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.li>
  );
}
