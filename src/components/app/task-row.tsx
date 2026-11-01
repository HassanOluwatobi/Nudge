"use client";

import { Bell, ChevronDown, Trash2 } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { feel, haptic } from "@/lib/feedback";
import { type Hue, type Task, fmtMins, prettyDue, stepsDone, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { useHold } from "@/lib/use-hold";
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
      className="grid shrink-0 place-items-center border-2"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      initial={false}
      animate={{ backgroundColor: done ? "var(--signal)" : "rgba(255,255,255,0)", borderColor: done ? "var(--signal)" : "var(--ink-3)", scale: done ? [1, 0.84, 1.08, 1] : 1 }}
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
          <motion.span className="absolute size-[26px] rounded-full border-2" style={{ borderColor: "var(--signal)" }} initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2.1, opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
        )}
      </AnimatePresence>
      <motion.span
        className="grid size-[26px] place-items-center rounded-full border-2"
        initial={false}
        animate={{
          backgroundColor: done ? "var(--signal)" : "rgba(255,255,255,0)",
          borderColor: done ? "var(--signal)" : "var(--ink)",
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

/**
 * Swipe a row left to show Delete, like iOS lists. A long swipe deletes at
 * once. Every delete can be undone from the toast.
 */
export function SwipeDelete({ children, onDelete, label, onDragStart }: { children: React.ReactNode; onDelete: () => void; label: string; onDragStart?: () => void }) {
  const x = useMotionValue(0);
  const moved = useRef(false);
  const [open, setOpen] = useState(false);
  const spring = { type: "spring" as const, bounce: 0, duration: 0.32 };
  const close = () => (animate(x, 0, spring), setOpen(false));
  return (
    <div className="relative overflow-hidden">
      <button type="button" tabIndex={open ? 0 : -1} aria-label={`Delete ${label}`} onClick={() => (feel("undo", "warning"), onDelete())} className="absolute inset-y-0 right-0 flex w-[92px] flex-col items-center justify-center gap-0.5 bg-danger text-[12px] font-semibold text-white">
        <Trash2 className="size-[18px]" /> Delete
      </button>
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -92, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        onDragStart={() => ((moved.current = true), onDragStart?.())}
        onDragEnd={(_, i) => {
          if (i.offset.x < -200) {
            feel("undo", "warning");
            return onDelete();
          }
          const go = i.offset.x < -46 || i.velocity.x < -320;
          animate(x, go ? -92 : 0, spring);
          setOpen(go);
          if (go) haptic("light");
        }}
        onClickCapture={(e) => {
          if (moved.current || open) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
            if (open) close();
          }
        }}
        onPointerDown={() => (moved.current = false)}
        className="relative touch-pan-y bg-white"
      >
        {children}
      </motion.div>
    </div>
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
  const { bind: holdBind, pressing, cancel: endHold } = useHold(() => (feel("open"), onMenu(task)));
  const done = task.bucket === "done";
  const n = task.steps.length;
  const k = stepsDone(task);
  const today = ymd();
  const meta = [fmtMins(task.mins), task.due && !done ? prettyDue(task.due, today) : ""].filter(Boolean).join(" · ");

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: pressing ? 0.975 : 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", bounce: 0, duration: pressing ? 0.46 : 0.36 }}
      className="task-row overflow-hidden"
    >
      <SwipeDelete
        label={task.title}
        onDragStart={endHold}
        onDelete={() => {
          const gone = actions.remove(task.id);
          if (gone) toast("Task deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
        }}
      >
      <div className="flex items-center gap-3 pl-3 pr-1">
        <button
          type="button"
          className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
          {...holdBind}
          onClick={() => onOpen(task)}
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
      </SwipeDelete>
      {n > 0 && !done && (
        <>
          <button type="button" onClick={() => (setOpen((v) => !v), feel("tap"))} aria-expanded={open} aria-label={`${k} of ${n} steps done. ${open ? "Hide" : "Show"} steps`} className="flex h-9 w-full items-center gap-3 border-t border-line/70 bg-[#fbf9f4] px-3.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ebe6db]">
              <motion.span className="block h-full rounded-full" style={{ background: "var(--signal)" }} initial={false} animate={{ width: `${(k / n) * 100}%` }} transition={{ type: "spring", bounce: 0.15, duration: 0.6 }} />
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

/**
 * Finished tasks, after Apple Reminders: one quiet grouped list. A filled
 * check you can tap to put a task back, the title softened, the time it was
 * finished on the right.
 */
export function DoneList({ tasks, actions, onOpen, onMenu }: { tasks: Task[]; actions: Actions; onOpen: (t: Task) => void; onMenu?: (t: Task) => void }) {
  const time = (t: Task) => (t.doneAt ? new Date(t.doneAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
  const day = (t: Task) => {
    if (!t.doneAt) return "";
    const d = new Date(t.doneAt);
    return ymd(d) === ymd() ? time(t) : d.toLocaleDateString([], { day: "numeric", month: "short" });
  };
  return (
    <ul className="overflow-hidden rounded-[20px] bg-white ring-1 ring-line">
      <AnimatePresence initial={false}>
        {tasks.map((t, i) => (
          <motion.li key={t.id} layout="position" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="relative">
            {i > 0 && <span aria-hidden className="pointer-events-none absolute left-[52px] right-0 top-0 z-10 h-px bg-line/80" />}
            <SwipeDelete
              label={t.title}
              onDelete={() => {
                const gone = actions.remove(t.id);
                if (gone) toast("Task deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
              }}
            >
            <div className="flex min-h-[52px] items-center pl-1 pr-4">
              <span className="scale-[0.85]">
                <CheckButton task={t} onDone={() => actions.restore(t.id)} label={`Put back: ${t.title}`} />
              </span>
              <DoneTitle task={t} onOpen={onOpen} onMenu={onMenu} />
              <span className="pl-3 text-[13px] tabular-nums text-ink-3">{day(t)}</span>
            </div>
            </SwipeDelete>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function DoneTitle({ task, onOpen, onMenu }: { task: Task; onOpen: (t: Task) => void; onMenu?: (t: Task) => void }) {
  const { bind } = useHold(() => (feel("open"), onMenu?.(task)));
  return (
    <button type="button" {...(onMenu ? bind : {})} onClick={() => onOpen(task)} className="min-w-0 flex-1 py-3 pl-0.5 text-left" aria-label={`${task.title}. Open details. Hold for options.`}>
      <span className="block truncate text-[15px] text-ink-3 line-through decoration-ink-3/35 decoration-1">{task.title}</span>
    </button>
  );
}
