"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { toast } from "sonner";
import { ArrowDown, Check, ChevronRight, Pause, Play, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { prettyDue, stepMins, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { askNotify } from "@/lib/reminders";
import { HoldButton } from "./hold-button";

const SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const;
const FLICK = { type: "spring", bounce: 0.18, duration: 0.45 } as const;
const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
// Apple's momentum projection: where a flick would come to rest.
const project = (v: number, d = 0.998) => ((v / 1000) * d) / (1 - d);

/** The one thing, as an object you can hold. Drag it down to save it for later. */
export function FocusCard({
  task,
  actions,
  gentle,
  timer,
  timeUp,
  onStepDone,
  onAllDone,
  onOpen,
}: {
  task: Task;
  actions: Actions;
  gentle: boolean;
  timer?: { taskId: string; end: number; mins: number };
  timeUp?: boolean;
  onStepDone: () => void;
  onAllDone: () => void;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const y = useMotionValue(0);
  const rotate = useTransform(y, [-200, 0, 300], [-1.5, 0, 3]);
  const scale = useTransform(y, [0, 300], [1, 0.94]);
  const laterHint = useTransform(y, [20, 140], [0, 1]);
  const controlsFade = useTransform(y, [0, 120], [1, 0]);
  const [asking, setAsking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const next = task.subs.find((s) => !s.d);
  const step = (next ? next.t : task.step).replace(/^Start with: /, "");
  const mins = stepMins(step);
  const running = timer?.taskId === task.id && timer.end > now ? timer : undefined;
  const progress = running ? Math.min(1, 1 - (running.end - now) / (running.mins * 60000)) : 0;
  const today = ymd();

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [running]);

  const later = async () => {
    if (leaving) return;
    setLeaving(true);
    if (!reduce) await animate(y, 760, { ...FLICK, velocity: y.getVelocity() });
    actions.move(task.id, "week");
    toast("Saved for later this week.", { duration: 5000, action: { label: "Undo", onClick: () => actions.setMust(task.id) } });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const landing = info.offset.y + project(info.velocity.y);
    if (landing > 220) later();
    else animate(y, 0, { ...SPRING, velocity: info.velocity.y });
  };

  return (
    <div className="relative">
      {/* Revealed as you pull the card down. */}
      <motion.p style={{ opacity: laterHint }} aria-hidden className="pointer-events-none absolute inset-x-0 top-1 flex items-center justify-center gap-1.5 text-[14px] font-medium text-[var(--ink-2)]">
        <ArrowDown className="size-4" /> Let go to do it later
      </motion.p>

      <motion.article
        data-tour="card"
        aria-label={`Your one thing: ${task.title}`}
        drag={asking || leaving ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.9 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ y, rotate, scale }}
        initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className="surface relative z-20 touch-pan-x rounded-[28px] p-6 select-none"
      >
        {/* Timer: the card's own edge fills like a clock. */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <rect
            x="1.5"
            y="1.5"
            rx="26.5"
            fill="none"
            stroke="var(--hot)"
            strokeWidth="3"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
            strokeLinecap="round"
            style={{ width: "calc(100% - 3px)", height: "calc(100% - 3px)", opacity: running ? 1 : 0, transition: "stroke-dashoffset 1s linear, opacity 300ms ease" }}
          />
        </svg>

        <div className="flex items-center justify-between gap-3">
          <p className="t-label flex items-center gap-2">
            <span className={cn("size-2 rounded-full", gentle ? "bg-[#8b7cf6]" : "bg-[var(--hot)]")} />
            {gentle ? "Easy day · just this" : "Your one thing"}
            {task.due && task.due >= today && <span>· Due {prettyDue(task.due, today).replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}</span>}
          </p>
          <button type="button" onClick={onOpen} className="btn -mr-2 h-9 px-2.5 text-[14px] font-medium text-[var(--ink-3)]">
            Details <ChevronRight className="-ml-1 size-4" />
          </button>
        </div>

        <h2 className="t-display mt-3 line-clamp-3 [overflow-wrap:anywhere]">{task.title}</h2>

        <AnimatePresence mode="popLayout" initial={false}>
          {asking ? (
            <motion.div
              key="ask"
              initial={{ opacity: 0, filter: "blur(4px)", y: 6 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="mt-5"
            >
              <p className="t-body flex items-center gap-2 font-semibold text-[var(--good)]">
                <Check className="size-5" strokeWidth={2.8} /> Step done
              </p>
              <p className="t-body mt-0.5 text-[var(--ink-2)]">Is the whole task finished?</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setAsking(false)} className="btn btn-quiet h-14 text-[16px]">
                  Next step
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLeaving(true);
                    if (!reduce) await animate(y, -40, { duration: 0.18, ease: [0.23, 1, 0.32, 1] });
                    onAllDone();
                  }}
                  className="btn h-14 bg-[var(--hot)] text-[16px] text-white"
                >
                  All done
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={"step" + step}
              initial={{ opacity: 0, filter: "blur(4px)", y: 6 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="mt-5"
            >
              <div className="flex items-start gap-3 rounded-[18px] bg-[var(--surface-2)] p-4">
                <div className="min-w-0 flex-1">
                  <p className="t-label">
                    {running ? (
                      <span className="font-semibold text-[var(--hot)] tabular-nums">{fmt(running.end - now)} left</span>
                    ) : timeUp ? (
                      <span className="font-semibold text-[var(--hot)]">Time is up. How did it go?</span>
                    ) : (
                      <>{next || task.step.startsWith("Keep going") ? "Next step" : "First step"} · about {mins} min</>
                    )}
                  </p>
                  <p className="t-body mt-1 font-semibold [overflow-wrap:anywhere]">{step}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (running) actions.setMeta({ timer: undefined });
                    else {
                      actions.setMeta({ timer: { taskId: task.id, end: Date.now() + mins * 60000, mins } });
                      setNow(Date.now());
                      askNotify();
                    }
                  }}
                  aria-label={running ? "Stop timer" : `Start a ${mins} minute timer`}
                  className="btn size-11 shrink-0 bg-[var(--surface)] text-[var(--ink)] shadow-[0_0_0_1px_var(--hair)]"
                >
                  {running ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {!asking && (
        <motion.div style={{ opacity: controlsFade }} className="relative z-10 mt-6">
          <HoldButton
            data-tour="done"
            onCommit={() => {
              onStepDone();
              setAsking(true);
            }}
          >
            <Check className="size-5" strokeWidth={2.6} /> I did this step
          </HoldButton>
          <div className="mt-1 flex items-center justify-center">
            <button
              type="button"
              data-tour="smaller"
              onClick={() => {
                actions.shrink(task.id);
                try {
                  navigator.vibrate?.(6);
                } catch {}
              }}
              className="btn btn-ghost h-11 px-4 text-[15px]"
            >
              <Sparkles className="size-4" /> Make it smaller
            </button>
            <span className="h-4 w-px bg-[var(--hair)]" aria-hidden />
            <button type="button" onClick={later} className="btn btn-ghost h-11 px-4 text-[15px]">
              Later
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** A card shell for the other states, so the screen never changes shape. */
function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      data-tour="card"
      aria-label={label}
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className="surface rounded-[28px] p-6"
    >
      {children}
    </motion.article>
  );
}

export function PickShell({ options, onPick, onMore }: { options: Task[]; onPick: (id: string) => void; onMore: () => void }) {
  return (
    <Shell label="Choose your one thing">
      <p className="t-label">Choose your one thing</p>
      <h2 className="t-display mt-3">Which is easiest to start?</h2>
      <div className="mt-5 overflow-hidden rounded-[18px] bg-[var(--surface-2)]">
        {options.map((t, i) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => onPick(t.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 + i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            className={cn("flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-[var(--hair)]", i > 0 && "border-t border-[var(--hair)]")}
          >
            <span className="t-body line-clamp-2 font-semibold [overflow-wrap:anywhere]">{t.title}</span>
            <ChevronRight className="size-5 shrink-0 text-[var(--ink-3)]" />
          </motion.button>
        ))}
      </div>
      <button type="button" onClick={onMore} className="btn btn-ghost mt-2 h-11 w-full text-[15px]">
        See my whole list
      </button>
    </Shell>
  );
}

export function RestShell({ title, canPick, onPick }: { title: string; canPick: boolean; onPick: () => void }) {
  return (
    <Shell label="Done for today">
      <p className="t-label flex items-center gap-2 text-[var(--good)]">
        <Check className="size-4" strokeWidth={3} /> Done today
      </p>
      <h2 className="t-display mt-3 line-clamp-2 text-[var(--ink-3)] line-through decoration-[var(--hot)]/60 decoration-2 [overflow-wrap:anywhere]">{title}</h2>
      <p className="t-body mt-2 text-[var(--ink-2)]">You can stop here. Resting is part of it.</p>
      {canPick && (
        <button type="button" onClick={onPick} className="btn btn-primary mt-6 h-14 w-full text-[16px]">
          Do one more
        </button>
      )}
    </Shell>
  );
}

export function EmptyShell({ onAdd }: { onAdd: () => void }) {
  return (
    <Shell label="Nothing yet">
      <p className="t-label">Nothing here yet</p>
      <h2 className="t-display mt-3">What&apos;s on your mind?</h2>
      <p className="t-body mt-2 text-[var(--ink-2)]">Tell me one thing you need to do. I&apos;ll make the first step small.</p>
      <button type="button" onClick={onAdd} className="btn btn-primary mt-6 h-14 w-full text-[16px]">
        <Plus className="size-5" strokeWidth={2.4} /> Add something
      </button>
    </Shell>
  );
}
