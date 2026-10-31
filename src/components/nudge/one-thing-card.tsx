"use client";

import { useEffect, useState } from "react";
import { Check, Feather, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { finish, TaskMeta } from "./task-row";

export function OneThingCard({
  task,
  actions,
  lowEnergy,
  onOpen,
}: {
  task: Task;
  actions: Actions;
  lowEnergy: boolean;
  onOpen: (id: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => finish(actions, task, lowEnergy), 460);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  return (
    <section
      aria-label="Your one thing"
      className={cn(
        "nm-rise relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 shadow-[0_18px_40px_-28px_rgb(60_80_50/0.45)] sm:p-6",
        leaving && "nm-settle"
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full bg-calm blur-2xl" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary">
          <Star className="size-3.5 fill-current" />
          Your one thing
        </p>
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className="mt-2 block text-left font-serif text-[26px] leading-[1.15] tracking-tight text-balance outline-none hover:opacity-80 focus-visible:underline sm:text-[30px]"
        >
          {task.title}
        </button>
        <TaskMeta task={task} />

        <div className="mt-5 rounded-2xl bg-calm/70 p-4">
          <p className="text-xs font-medium text-muted-foreground">First step</p>
          <p className="mt-1 text-[15px] leading-snug font-medium text-pretty">{task.step}</p>
          <button
            type="button"
            onClick={() => actions.shrink(task.id)}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
          >
            <Feather className="size-3.5" />
            Make it smaller
          </button>
        </div>

        <button
          type="button"
          onClick={() => setLeaving(true)}
          disabled={leaving}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-90"
        >
          <Check className="size-[18px]" />
          {leaving ? "Done" : "I did it"}
        </button>
      </div>
    </section>
  );
}

export function PickOneCard({ hasTasks }: { hasTasks: boolean }) {
  return (
    <section className="nm-rise rounded-3xl border border-dashed border-primary/30 bg-card/60 p-5 sm:p-6">
      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary">
        <Star className="size-3.5" />
        Your one thing
      </p>
      <p className="mt-2 font-serif text-[22px] leading-tight tracking-tight text-balance">
        {hasTasks ? "Pick the one thing that would make today a win." : "Your day is a blank page."}
      </p>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        {hasTasks
          ? "Tap the star on any task below. Everything else stays safe where it is."
          : "Type or say anything on your mind in the box below. NudgeMe sorts it for you."}
      </p>
    </section>
  );
}

export function WinCard({ title }: { title: string }) {
  return (
    <section className="nm-rise relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full bg-calm blur-2xl" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary">
          <Check className="size-3.5" />
          One thing, done
        </p>
        <p className="mt-2 font-serif text-[26px] leading-[1.15] tracking-tight text-balance">Today is already a win.</p>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          You finished {title}. Anything else today is a bonus.
        </p>
      </div>
    </section>
  );
}
