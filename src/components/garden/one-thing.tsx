"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BellRing, CalendarDays, Check, ChevronRight, Feather, Moon, Pause, Play, Sparkles, Sprout, Star } from "lucide-react";
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

  return (
    <div className="relative" data-tour="card">
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[2.25rem]">
        <div className="absolute inset-0 flex items-center justify-between bg-[linear-gradient(90deg,#d3f1e2,#efe9ff)] px-8 text-[15px] font-semibold">
          <span className="flex items-center gap-2 text-[#2f8a5c]" style={{ opacity: Math.max(0, p) }}>
            <Check className="size-5" strokeWidth={3} /> Step done
          </span>
          <span className="flex items-center gap-2 text-[#6b4fd8]" style={{ opacity: Math.max(0, -p) }}>
            Later <Moon className="size-5" />
          </span>
        </div>
      </div>

      <article
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`Your one thing: ${task.title}`}
        className={cn(
          "clay-card relative touch-pan-y select-none p-5",
          leaving === "right" && "nm-fly-right",
          leaving === "left" && "nm-fly-left",
          !leaving && !dx && "nm-spring-in"
        )}
        style={leaving ? undefined : { transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined, transition: dx ? "none" : "transform 380ms cubic-bezier(.22,1.4,.36,1)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", gentle ? "bg-[#efe9ff] text-[#6b4fd8]" : "bg-[#ffe6dc] text-[#d4553f]")}>
              {gentle ? <Feather className="size-3.5" /> : <Star className="size-3.5 fill-current" />}
              {gentle ? "Easy day · just this" : "Your one thing"}
            </span>
          </div>
          <button type="button" onClick={onOpen} className="-mr-2 flex h-11 shrink-0 items-center gap-0.5 rounded-full px-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
            Details <ChevronRight className="size-4" />
          </button>
        </div>

        <h2 className="mt-1.5 line-clamp-3 font-serif text-[27px] leading-[1.12] tracking-tight [overflow-wrap:anywhere] text-[var(--plum)] min-[400px]:text-[30px]">{task.title}</h2>
        {task.due && task.due >= today && (
          <p className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground">
            <CalendarDays className="size-4" /> {`Due ${prettyDue(task.due, today).replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}`}
          </p>
        )}

        {asking ? (
          <div className="nm-pop mt-4">
            <div className="step-pill flex items-center gap-3 px-5 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d3f1e2] text-[#2f8a5c]">
                <Sprout className="size-5" />
              </span>
              <div>
                <p className="text-[16px] leading-snug font-semibold text-[var(--plum)]">Nice! That step counts.</p>
                <p className="text-[14px] text-muted-foreground">Is the whole task finished?</p>
              </div>
            </div>
            <button type="button" onClick={allDone} className="candy mt-4 h-[56px] w-full text-[17px]">
              <Check className="size-5" strokeWidth={3} /> Yes, all done
            </button>
            <button type="button" onClick={() => setAsking(false)} className="candy candy-soft mt-2.5 h-[52px] w-full text-[16px]">
              Not yet, show the next step
            </button>
          </div>
        ) : (
          <>
            <div key={step} className={cn("step-pill mt-3 px-5 py-3 nm-pop", squish && "nm-squish")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] text-muted-foreground">
                  {next || task.step.startsWith("Keep going") ? "Next step" : "First step"} · {mins} min
                </p>
                {running ? (
                  <button type="button" onClick={() => actions.setMeta({ timer: undefined })} className="-my-2 -mr-2 flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold tabular-nums text-[#6b4fd8]" aria-label="Stop timer">
                    <Pause className="size-4 fill-current" /> {fmt(running.end - now)}
                  </button>
                ) : (
                  <button type="button" onClick={startTimer} className="-my-2 -mr-2 flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-[#6b4fd8] hover:bg-white/60">
                    <Play className="size-4 fill-current" /> Start {mins} min timer
                  </button>
                )}
              </div>
              <p className="mt-1 text-[17px] leading-snug font-semibold [overflow-wrap:anywhere] text-[var(--plum)]">{step}</p>
              {timeUp && !running && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-[#d4553f]">
                  <BellRing className="size-4" /> Time is up. How did it go?
                </p>
              )}
            </div>

            <button type="button" onClick={stepDone} data-tour="done" className="candy mt-4 h-[56px] w-full text-[17px]">
              <Check className="size-5" strokeWidth={3} /> I did this step
            </button>

            <div className="mt-2 flex items-center justify-center gap-1 text-[15px] font-medium">
              <button
                type="button"
                data-tour="smaller"
                onClick={() => {
                  actions.shrink(task.id);
                  setSquish((n) => n + 1);
                }}
                className="flex h-11 items-center gap-1.5 rounded-full px-4 text-[#7a5ad9] hover:bg-[#f2edff]"
              >
                <Sparkles className="size-4" /> Make it smaller
              </button>
              <span className="text-border" aria-hidden>
                •
              </span>
              <button type="button" onClick={later} className="flex h-11 items-center gap-1.5 rounded-full px-4 text-muted-foreground hover:bg-muted">
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
    <article className="clay-card nm-spring-in p-6" data-tour="card">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe6dc] px-3 py-1.5 text-[13px] font-semibold text-[#d4553f]">
        <Star className="size-3.5 fill-current" /> Choose your one thing
      </span>
      <h2 className="mt-4 font-serif text-[27px] leading-tight tracking-tight text-[var(--plum)]">Which one is easiest to start?</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">Just one. The rest stays safe in your list.</p>
      <div className="mt-5 flex flex-col gap-3">
        {options.map((t) => (
          <button key={t.id} type="button" onClick={() => onPick(t.id)} className="candy candy-soft h-auto min-h-[56px] w-full justify-between px-5 py-3 text-left text-[16px] font-semibold">
            <span className="line-clamp-2 [overflow-wrap:anywhere]">{t.title}</span>
            <span className="shrink-0 text-[13px] font-medium text-muted-foreground">Choose</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onMore} className="mt-3 h-11 w-full rounded-full text-[15px] font-medium text-muted-foreground hover:text-foreground">
        See my whole list
      </button>
    </article>
  );
}

/** The one thing is done. */
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
    <article className="clay-card nm-spring-in select-none p-6 text-center" data-tour="card">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#d3f1e2] text-[#2f8a5c]">
        <Check className="size-6" strokeWidth={3} />
      </span>
      <h2 className="mt-3 font-serif text-[29px] leading-tight tracking-tight text-[var(--plum)]">Your one thing is done.</h2>
      <p className="mx-auto mt-1 line-clamp-2 max-w-xs text-[15px] text-muted-foreground text-pretty line-through decoration-[#e8664f]/40 [overflow-wrap:anywhere]">{title}</p>
      <p className="mx-auto mt-3 max-w-xs text-[15px] text-pretty text-[var(--plum)]">Great job. You can stop here, or do one more.</p>
      {canPick && (
        <button type="button" onClick={onPick} className="candy candy-soft mt-5 h-[54px] w-full text-[16px]">
          Do one more
        </button>
      )}
      {askReminders && (
        <button type="button" onClick={onReminders} className="candy candy-grape mt-3 h-[54px] w-full text-[16px]">
          <BellRing className="size-5" /> Remind me every day
        </button>
      )}
    </article>
  );
}

/** Nothing on the list. Point at the capture bar. */
export function EmptyCard() {
  return (
    <article className="clay-card nm-spring-in p-6 text-center" data-tour="card">
      <h2 className="font-serif text-[27px] leading-tight tracking-tight text-[var(--plum)]">Your garden is ready.</h2>
      <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted-foreground text-pretty">
        Type one thing you need to do in the box below. I&apos;ll make the first step small.
      </p>
      <p className="mt-3 text-2xl nm-float" aria-hidden>
        👇
      </p>
    </article>
  );
}
