"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ListChecks, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { prettyDue, type Task, WIN_LINES, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { DoneCircle } from "./done-circle";

export function finish(actions: Actions, task: Task, lowEnergy = false) {
  actions.complete(task.id);
  const line = lowEnergy || task.must ? "That was your one thing. Today is a win." : WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)];
  toast(line, {
    duration: 5000,
    action: { label: "Undo", onClick: () => actions.restore(task.id) },
  });
}

const EST_LABEL: Record<string, string> = { "15m": "15 min", "30m": "30 min", "1h": "1 hour", "2h": "2 hours", "half day": "Half a day", day: "A full day" };

export function TaskMeta({ task }: { task: Task }) {
  const today = ymd();
  const subsDone = task.subs.filter((s) => s.d).length;
  const bits = [];
  if (task.due)
    bits.push(
      <span key="due" className={cn("inline-flex items-center gap-1", task.due <= today && "text-foreground")}>
        <CalendarDays className="size-3.5" />
        {prettyDue(task.due, today)}
      </span>
    );
  if (task.est) bits.push(<span key="est">Whole task: {EST_LABEL[task.est].toLowerCase()}</span>);
  if (task.subs.length)
    bits.push(
      <span key="subs" className="inline-flex items-center gap-1">
        <ListChecks className="size-3.5" />
        {subsDone}/{task.subs.length}
      </span>
    );
  if (!bits.length) return null;
  return <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{bits}</div>;
}

export function TaskRow({
  task,
  actions,
  onOpen,
  showStar = true,
}: {
  task: Task;
  actions: Actions;
  onOpen: (id: string) => void;
  showStar?: boolean;
}) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => finish(actions, task), 460);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);
  const done = task.bucket === "done";

  return (
    <div
      onClick={() => onOpen(task.id)}
      className={cn(
        "group flex cursor-pointer items-start gap-3.5 rounded-2xl px-3 py-3 transition-colors hover:bg-card has-[.nm-open:focus-visible]:ring-3 has-[.nm-open:focus-visible]:ring-ring/40",
        leaving && "nm-settle"
      )}
    >
      <div className="pt-0.5">
        <DoneCircle
          done={done || leaving}
          label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
          onClick={() => {
            if (done) actions.restore(task.id);
            else setLeaving(true);
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(task.id);
          }}
          className={cn(
            "nm-open block text-left text-[15px] leading-snug font-medium text-pretty outline-none [overflow-wrap:anywhere] line-clamp-3",
            done && "text-muted-foreground line-through decoration-muted-foreground/40"
          )}
        >
          {task.title}
        </button>
        {!done && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground text-pretty">{task.step.replace(/^Start with: /, "")}</p>}
        {!done && <TaskMeta task={task} />}
      </div>
      {showStar && !done && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (task.must) actions.clearMust();
            else actions.setMust(task.id);
          }}
          aria-label={task.must ? "Unpick as your one thing" : "Make this your one thing"}
          aria-pressed={task.must}
          className={cn(
            "-mr-1 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-accent",
            task.must ? "text-primary" : "text-muted-foreground/50 hover:text-primary"
          )}
        >
          <Star className={cn("size-[18px]", task.must && "fill-current")} />
        </button>
      )}
    </div>
  );
}
