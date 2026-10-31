"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronRight, Feather, Moon, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { stepMinutes, type Task } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";

const SWIPE = 96;

/** The one thing. Swipe right when it's done, left to save it for later. */
export function OneThingCard({
  task,
  actions,
  gentle,
  onDone,
  onOpen,
}: {
  task: Task;
  actions: Actions;
  gentle: boolean;
  onDone: () => void;
  onOpen: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<"right" | "left" | null>(null);
  const [squish, setSquish] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragging = useRef(false);
  const next = task.subs.find((s) => !s.d);
  const step = next ? next.t : task.step;

  const done = () => {
    setLeaving("right");
    setTimeout(onDone, 260);
  };
  const later = () => {
    setLeaving("left");
    setTimeout(() => {
      actions.move(task.id, "week");
      toast("Saved for later this week. Pick another whenever you like.", {
        duration: 5000,
        action: { label: "Undo", onClick: () => actions.setMust(task.id) },
      });
    }, 260);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input")) return;
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
      if (dx > SWIPE) done();
      else if (dx < -SWIPE) later();
      else setDx(0);
    }
    start.current = null;
    dragging.current = false;
  };

  const p = Math.max(-1, Math.min(1, dx / SWIPE));

  return (
    <div className="relative" data-tour="card">
      {/* What a swipe will do. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[2.25rem]">
        <div className="absolute inset-0 flex items-center justify-between bg-[linear-gradient(90deg,#d3f1e2,#efe9ff)] px-8 text-[15px] font-semibold">
          <span className="flex items-center gap-2 text-[#2f8a5c]" style={{ opacity: Math.max(0, p) }}>
            <Check className="size-5" strokeWidth={3} /> Done
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
          "clay-card relative touch-pan-y select-none p-5 sm:p-6",
          leaving === "right" && "nm-fly-right",
          leaving === "left" && "nm-fly-left",
          !leaving && !dx && "nm-spring-in"
        )}
        style={leaving ? undefined : { transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined, transition: dx ? "none" : "transform 380ms cubic-bezier(.22,1.4,.36,1)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", gentle ? "bg-[#efe9ff] text-[#6b4fd8]" : "bg-[#ffe6dc] text-[#d4553f]")}>
            {gentle ? <Feather className="size-3.5" /> : <Star className="size-3.5 fill-current" />}
            {gentle ? "Gentle day · just this" : "Your one thing"}
          </span>
          <button type="button" onClick={onOpen} className="flex items-center gap-0.5 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Details <ChevronRight className="size-3.5" />
          </button>
        </div>

        <h2 className="mt-3 font-serif text-[28px] leading-[1.12] tracking-tight text-balance text-[var(--plum)] min-[400px]:text-[31px]">{task.title}</h2>

        <div key={step} className={cn("step-pill mt-4 px-5 py-3.5 nm-pop", squish && "nm-squish")}>
          <p className="text-[13px] text-muted-foreground">
            {next ? "Next step" : "First step"} · {stepMinutes(step)}
          </p>
          <p className="mt-1 text-[17px] leading-snug font-semibold text-[var(--plum)]">{step.replace(/^Start with: /, "")}</p>
        </div>

        <button type="button" onClick={done} data-tour="done" className="candy mt-5 h-[58px] w-full text-[17px]">
          <Check className="size-5" strokeWidth={3} /> I did it, grow something
        </button>

        <div className="mt-3 flex items-center justify-center gap-1 text-[14px] font-medium">
          <button
            type="button"
            data-tour="smaller"
            onClick={() => {
              actions.shrink(task.id);
              setSquish((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[#7a5ad9] hover:bg-[#f2edff]"
          >
            <Sparkles className="size-4" /> Make it smaller
          </button>
          <span className="text-border">•</span>
          <button type="button" onClick={later} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-muted-foreground hover:bg-muted">
            Not now <ArrowRight className="size-4" />
          </button>
        </div>
      </article>
    </div>
  );
}

/** No one thing yet: offer up to three to choose from. */
export function PickCard({ options, onPick, onMore }: { options: Task[]; onPick: (id: string) => void; onMore: () => void }) {
  return (
    <article className="clay-card nm-spring-in p-6" data-tour="card">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe6dc] px-3 py-1.5 text-[13px] font-semibold text-[#d4553f]">
        <Star className="size-3.5 fill-current" /> Pick your one thing
      </span>
      <h2 className="mt-4 font-serif text-[28px] leading-tight tracking-tight text-[var(--plum)]">Which one feels doable?</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">Just one. The rest stays safe.</p>
      <div className="mt-5 flex flex-col gap-3">
        {options.map((t) => (
          <button key={t.id} type="button" onClick={() => onPick(t.id)} className="candy candy-soft h-auto min-h-[56px] w-full justify-between px-5 py-3 text-left text-[16px] font-semibold">
            <span className="line-clamp-2">{t.title}</span>
            <span className="shrink-0 text-[13px] font-medium text-muted-foreground">Choose</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onMore} className="mt-4 w-full rounded-full py-2 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        See my whole list
      </button>
    </article>
  );
}

/** The one thing is done. */
export function WinCard({ title, canPick, onPick }: { title: string; canPick: boolean; onPick: () => void }) {
  return (
    <article className="clay-card nm-spring-in p-7 text-center" data-tour="card">
      <p className="text-[40px] leading-none">🌼</p>
      <h2 className="mt-3 font-serif text-[30px] leading-tight tracking-tight text-[var(--plum)]">Your one thing is done.</h2>
      <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted-foreground text-pretty line-through decoration-[#e8664f]/40">{title}</p>
      <p className="mx-auto mt-3 max-w-xs text-[15px] text-pretty text-[var(--plum)]">That&apos;s a full win. Resting counts too.</p>
      {canPick && (
        <button type="button" onClick={onPick} className="candy candy-soft mt-6 h-[54px] w-full text-[16px]">
          I&apos;ve got energy, pick another
        </button>
      )}
    </article>
  );
}

/** Nothing on the list. Point at the capture bar. */
export function EmptyCard() {
  return (
    <article className="clay-card nm-spring-in p-7 text-center" data-tour="card">
      <h2 className="font-serif text-[28px] leading-tight tracking-tight text-[var(--plum)]">Your garden is ready.</h2>
      <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted-foreground text-pretty">
        Tell me what&apos;s on your mind below. I&apos;ll find the one thing and make it small.
      </p>
      <p className="mt-4 text-2xl nm-float" aria-hidden>
        👇
      </p>
    </article>
  );
}
