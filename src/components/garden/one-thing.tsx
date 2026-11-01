"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BellRing, Check, ChevronRight, Feather, Moon, Pause, Play, Plus, Sparkles, Sprout, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { prettyDue, stepMins, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { askNotify } from "@/lib/reminders";

const SWIPE = 96;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The one thing. Do the small step, then say if the whole task is finished. */
export function OneThingCard({
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
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<"right" | "left" | null>(null);
  const [squish, setSquish] = useState(0);
  const [asking, setAsking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragging = useRef(false);
  const busy = useRef(false);
  const next = task.subs.find((s) => !s.d);
  const step = (next ? next.t : task.step).replace(/^Start with: /, "");
  const mins = stepMins(step);
  const running = timer?.taskId === task.id && timer.end > now ? timer : undefined;
  const today = ymd();

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [running]);

  const stepDone = () => {
    if (busy.current || asking) return;
    busy.current = true;
    setDx(0);
    onStepDone();
    setAsking(true);
    setTimeout(() => (busy.current = false), 400);
  };
  const allDone = () => {
    if (busy.current) return;
    busy.current = true;
    setLeaving("right");
    setTimeout(onAllDone, 260);
  };
  const later = () => {
    if (busy.current) return;
    busy.current = true;
    setLeaving("left");
    setTimeout(() => {
      actions.move(task.id, "week");
      toast("Moved to later this week.", {
        duration: 5000,
        action: { label: "Undo", onClick: () => actions.setMust(task.id) },
      });
    }, 260);
  };
  const startTimer = async () => {
    actions.setMeta({ timer: { taskId: task.id, end: Date.now() + mins * 60000, mins } });
    setNow(Date.now());
    askNotify();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (asking || (e.target as HTMLElement).closest("button,a,input")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!dragging.current) {
      if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } else if (Math.abs(my) > 10) {
        start.current = null;
        return;
      } else return;
    }
    setDx(mx);
  };
  const onPointerUp = () => {
    if (dragging.current) {
      if (dx > SWIPE) stepDone();
      else if (dx < -SWIPE) later();
      else setDx(0);
    }
    start.current = null;
    dragging.current = false;
  };

  const p = Math.max(-1, Math.min(1, dx / SWIPE));
  const total = (running?.mins ?? mins) * 60000;
  const progress = running ? 1 - (running.end - now) / total : 0;

  return (
    <div className="relative" data-tour="card">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-between px-2 text-[14px] font-semibold">
        <span className="flex items-center gap-1.5 text-[#2f8a5c]" style={{ opacity: Math.max(0, p) }}>
          <Check className="size-4" strokeWidth={3} /> Step done
        </span>
        <span className="flex items-center gap-1.5 text-[#5b3fd6]" style={{ opacity: Math.max(0, -p) }}>
          Later <Moon className="size-4" />
        </span>
      </div>

      <article
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`Your one thing: ${task.title}`}
        className={cn("relative touch-pan-y select-none bg-white", leaving === "right" && "nm-fly-right", leaving === "left" && "nm-fly-left")}
        style={leaving ? undefined : { transform: dx ? `translateX(${dx}px) rotate(${dx / 60}deg)` : undefined, opacity: dx ? 1 - Math.abs(p) * 0.25 : 1, transition: dx ? "none" : "transform 420ms cubic-bezier(.34,1.56,.64,1), opacity 300ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={cn("eyebrow flex items-center gap-1.5", gentle && "text-[#5b3fd6]")}>
            {gentle ? <Feather className="size-3.5" /> : <Star className="size-3 fill-[var(--coral)] text-[var(--coral)]" />}
            {gentle ? "Easy day · just this" : "Your one thing"}
            {task.due && task.due >= today && <span className="text-[var(--ink-3)]">· Due {prettyDue(task.due, today).replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}</span>}
          </p>
          <button type="button" onClick={onOpen} className="-mr-2 flex h-9 shrink-0 items-center gap-0.5 rounded-full px-2.5 text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]">
            Details <ChevronRight className="size-4" />
          </button>
        </div>

        <h2 className="mt-1 line-clamp-2 font-serif text-[29px] leading-[1.08] tracking-[-0.025em] [overflow-wrap:anywhere] text-[var(--ink)]">{task.title}</h2>

        {asking ? (
          <div className="nm-rise mt-4">
            <div className="flex items-center gap-3 rounded-[1.25rem] bg-[#eaf7f0] px-4 py-3.5">
              <span className="nm-pop grid size-10 shrink-0 place-items-center rounded-full bg-[#2f8a5c] text-white">
                <Sprout className="size-5" />
              </span>
              <div>
                <p className="text-[16px] leading-snug font-semibold text-[var(--ink)]">Nice. That step counts.</p>
                <p className="text-[14px] text-[var(--ink-2)]">Is the whole task finished?</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2.5">
              <button type="button" onClick={() => setAsking(false)} className="candy candy-soft h-[56px] text-[15px]">
                Not yet
              </button>
              <button type="button" onClick={allDone} className="candy candy-coral h-[56px] text-[16px]">
                <Check className="size-5" strokeWidth={3} /> All done
              </button>
            </div>
            <p className="mt-2 text-center text-[13px] text-[var(--ink-3)]">Not yet shows you the next small step.</p>
          </div>
        ) : (
          <>
            <div key={step} className={cn("nm-rise mt-4 flex items-center gap-3.5 border-t border-[var(--hair)] pt-4", squish && "nm-squish")}>
              <button
                type="button"
                onClick={running ? () => actions.setMeta({ timer: undefined }) : startTimer}
                aria-label={running ? "Stop timer" : `Start a ${mins} minute timer`}
                className="press relative grid size-14 shrink-0 place-items-center rounded-full bg-[#f6f1ef] text-[var(--ink)]"
              >
                <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="28" cy="28" r="25" fill="none" stroke="rgb(36 25 42 / 0.08)" strokeWidth="3" />
                  {running && <circle cx="28" cy="28" r="25" fill="none" stroke="var(--coral)" strokeWidth="3" strokeLinecap="round" strokeDasharray={157} strokeDashoffset={157 * (1 - progress)} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />}
                </svg>
                {running ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--ink-3)]">
                  {running ? (
                    <span className="font-semibold text-[var(--coral)] tabular-nums">{fmt(running.end - now)} left</span>
                  ) : timeUp ? (
                    <span className="flex items-center gap-1 font-semibold text-[var(--coral)]">
                      <BellRing className="size-3.5" /> Time is up. How did it go?
                    </span>
                  ) : (
                    <>
                      {next || task.step.startsWith("Keep going") ? "Next step" : "First step"} · {mins} min · tap play for a timer
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[17px] leading-snug font-semibold [overflow-wrap:anywhere] text-[var(--ink)]">{step}</p>
              </div>
            </div>

            <button type="button" onClick={stepDone} data-tour="done" className="candy mt-4 h-[56px] w-full text-[17px]">
              <Check className="size-5" strokeWidth={2.6} /> I did this step
            </button>

            <div className="mt-1.5 flex items-center justify-center text-[15px] font-medium">
              <button
                type="button"
                data-tour="smaller"
                onClick={() => {
                  actions.shrink(task.id);
                  setSquish((n) => n + 1);
                }}
                className="flex h-11 items-center gap-1.5 rounded-full px-4 text-[#5b3fd6]"
              >
                <Sparkles className="size-4" /> Make it smaller
              </button>
              <span className="h-4 w-px bg-[var(--hair)]" aria-hidden />
              <button type="button" onClick={later} className="flex h-11 items-center gap-1.5 rounded-full px-4 text-[var(--ink-2)]">
                Do it later <ArrowRight className="size-4" />
              </button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}

/** No one thing yet: offer up to three to choose from. */
export function PickCard({ options, onPick, onMore }: { options: Task[]; onPick: (id: string) => void; onMore: () => void }) {
  return (
    <div data-tour="card">
      <p className="eyebrow">Choose your one thing</p>
      <h2 className="mt-1 font-serif text-[27px] leading-tight tracking-[-0.025em] text-[var(--ink)]">Which is easiest to start?</h2>
      <div className="mt-4 flex flex-col divide-y divide-[var(--hair)] overflow-hidden rounded-[1.25rem] bg-[#f8f4f2]">
        {options.map((t) => (
          <button key={t.id} type="button" onClick={() => onPick(t.id)} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-[16px] font-semibold text-[var(--ink)] active:bg-[#f1ebe8]">
            <span className="line-clamp-2 [overflow-wrap:anywhere]">{t.title}</span>
            <ChevronRight className="size-5 shrink-0 text-[var(--ink-3)]" />
          </button>
        ))}
      </div>
      <button type="button" onClick={onMore} className="mt-2 h-11 w-full rounded-full text-[15px] font-medium text-[var(--ink-2)]">
        See my whole list
      </button>
    </div>
  );
}

/** The one thing is done. Resting state after the celebration. */
export function WinCard({
  title,
  canPick,
  onPick,
  askReminders,
  onReminders,
}: {
  title: string;
  canPick: boolean;
  onPick: () => void;
  askReminders: boolean;
  onReminders: () => void;
}) {
  return (
    <div className="select-none" data-tour="card">
      <p className="eyebrow flex items-center gap-1.5 text-[#2f8a5c]">
        <Check className="size-3.5" strokeWidth={3} /> Done today
      </p>
      <h2 className="mt-1 line-clamp-2 font-serif text-[27px] leading-tight tracking-[-0.025em] text-[var(--ink-3)] line-through decoration-[var(--coral)]/50 [overflow-wrap:anywhere]">{title}</h2>
      <p className="mt-1.5 text-[15px] text-[var(--ink-2)]">Great job. You can stop here, or do one more.</p>
      <div className={cn("mt-4 grid gap-2.5", canPick && askReminders ? "grid-cols-2" : "grid-cols-1")}>
        {canPick && (
          <button type="button" onClick={onPick} className="candy h-[54px] text-[16px]">
            Do one more
          </button>
        )}
        {askReminders && (
          <button type="button" onClick={onReminders} className="candy candy-grape h-[54px] text-[15px]">
            <BellRing className="size-4" /> Daily reminder
          </button>
        )}
      </div>
    </div>
  );
}

/** Nothing on the list yet. */
export function EmptyCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center" data-tour="card">
      <h2 className="font-serif text-[27px] leading-tight tracking-[-0.025em] text-[var(--ink)]">Your garden is ready.</h2>
      <p className="mx-auto mt-1 max-w-xs text-[15px] text-[var(--ink-2)] text-pretty">Tell me one thing you need to do. I&apos;ll make the first step small.</p>
      <button type="button" onClick={onAdd} className="candy mt-4 h-[56px] w-full text-[17px]">
        <Plus className="size-5" strokeWidth={2.4} /> Add something
      </button>
    </div>
  );
}
