"use client";

import { Bell, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { type Task, fmtMins, prettyDue, stepsDone, ymd } from "@/lib/tasks";
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

/** The round check. One tap finishes the whole task, so it says so to screen readers. */
export function CheckButton({ task, onDone, label }: { task: Task; onDone: () => void; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ticked, setTicked] = useState(false);
  const done = task.bucket === "done" || ticked;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label ?? (task.bucket === "done" ? `Finished: ${task.title}` : `Finish task: ${task.title}`)}
      aria-pressed={task.bucket === "done"}
      onClick={(e) => {
        e.stopPropagation();
        if (task.bucket === "done") return onDone();
        setTicked(true);
        burstFrom(ref.current, 14);
        navigator.vibrate?.(12);
        setTimeout(onDone, 420);
      }}
      className={`hue-${task.hue} relative grid size-11 shrink-0 place-items-center rounded-full`}
    >
      <motion.span
        className="grid size-[26px] place-items-center rounded-full border-2"
        initial={false}
        animate={{
          backgroundColor: done ? "var(--h)" : "rgba(0,0,0,0)",
          borderColor: done ? "var(--h)" : "#1b2044",
          scale: ticked ? [1, 0.82, 1.08, 1] : 1,
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>
              <Check className="size-4 text-white" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
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
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const done = task.bucket === "done";
  const n = task.steps.length;
  const k = stepsDone(task);
  const today = ymd();
  const meta = [fmtMins(task.mins), task.due && !done ? prettyDue(task.due, today) : ""].filter(Boolean).join(" · ");

  const startHold = () => {
    held.current = false;
    hold.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(8);
      onMenu(task);
    }, 480);
  };
  const endHold = () => hold.current && clearTimeout(hold.current);

  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }} transition={{ type: "spring", bounce: 0, duration: 0.42 }} className="task-row overflow-hidden">
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
            <span className={`block text-[16px] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere] ${done ? "text-ink-3 line-through decoration-ink-3/60" : ""}`}>{task.title}</span>
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
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-9 w-full items-center gap-3 border-t border-line/70 bg-[#fbf9f4] px-3.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ebe6db]">
              <motion.span className={`hue-${task.hue} block h-full rounded-full`} style={{ background: "var(--h)" }} initial={false} animate={{ width: `${(k / n) * 100}%` }} transition={{ type: "spring", bounce: 0, duration: 0.5 }} />
            </span>
            <span className="t-small tabular-nums text-ink-3">
              {k}/{n}
            </span>
            <ChevronDown className={`size-4 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden bg-[#fbf9f4]">
                {task.steps.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => actions.toggleStep(task.id, s.id)} className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left" aria-pressed={s.d}>
                      <span className={`hue-${task.hue} grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${s.d ? "border-[var(--h)] bg-[var(--h)]" : "border-ink-3/60"}`}>
                        {s.d && <Check className="size-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className={`text-[15px] ${s.d ? "text-ink-3 line-through" : ""}`}>{s.t}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.li>
  );
}
