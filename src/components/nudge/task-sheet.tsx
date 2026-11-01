"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Feather, Plus, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, type Bucket, EST_OPTIONS, prettyDue, type Task, ymd } from "@/lib/nudge";
import { remindChoices, remindOnce } from "@/lib/reminders";
import type { Actions } from "@/lib/use-nudge";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { DoneCircle } from "./done-circle";
import { finish } from "./task-row";

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "later", label: "Later" },
];

const EST_TEXT: Record<string, string> = { "15m": "15 min", "30m": "30 min", "1h": "1 hour", "2h": "2 hours", "half day": "Half a day", day: "A full day" };

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-xs font-medium text-muted-foreground">{children}</p>
);

export function TaskSheet({
  task,
  actions,
  onClose,
}: {
  task: Task | undefined;
  actions: Actions;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!task} onOpenChange={(o) => !o && onClose()} showSwipeHandle>
      <DrawerContent className="mx-auto w-full max-w-xl">
        {task && <SheetBody key={task.id} task={task} actions={actions} onClose={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({ task, actions, onClose }: { task: Task; actions: Actions; onClose: () => void }) {
  const [sub, setSub] = useState("");
  const [title, setTitle] = useState(task.title);
  const [reminded, setReminded] = useState<string | null>(null);
  const today = ymd();
  const done = task.bucket === "done";

  return (
    <div className="overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <DrawerTitle className="sr-only">Edit task</DrawerTitle>
      <DrawerDescription className="sr-only">Change the title, first step, size, date, subtasks or where it lives.</DrawerDescription>

      <div className="flex items-start gap-3">
        <div className="pt-1.5">
          <DoneCircle
            done={done}
            label={done ? "Mark as not done" : "Mark as done"}
            onClick={() => {
              if (done) actions.restore(task.id);
              else {
                finish(actions, task);
                onClose();
              }
            }}
          />
        </div>
        <textarea
          value={title}
          maxLength={140}
          onChange={(e) => {
            const v = e.target.value.replace(/\n/g, " ");
            setTitle(v);
            if (v.trim()) actions.patchTask(task.id, { title: v });
          }}
          onBlur={() => !title.trim() && setTitle(task.title)}
          rows={1}
          aria-label="Task title"
          className="field-sizing-content min-h-10 w-full resize-none bg-transparent font-serif text-[24px] leading-tight tracking-tight outline-none"
        />
      </div>

      {!done && (
        <>
          <div className="mt-5">
            <Label>First step (keep it small)</Label>
            <div className="rounded-2xl bg-calm/70 p-3">
              <textarea
                value={task.step}
                onChange={(e) => actions.patchTask(task.id, { step: e.target.value })}
                rows={1}
                aria-label="First step"
                className="field-sizing-content w-full resize-none bg-transparent text-[15px] leading-snug font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => actions.shrink(task.id)}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
              >
                <Feather className="size-3.5" /> Make it smaller
              </button>
            </div>
          </div>

          <div className="mt-5">
            <Label>Where it lives</Label>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
              {BUCKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => actions.move(task.id, b.id)}
                  aria-pressed={task.bucket === b.id}
                  className={cn(
                    "h-10 rounded-xl text-sm font-medium transition-all",
                    task.bucket === b.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (task.must ? actions.clearMust() : actions.setMust(task.id))}
              className={cn(
                "mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors",
                task.must ? "border-primary/30 bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              <Star className={cn("size-4", task.must && "fill-current")} />
              {task.must ? "This is your one thing" : "Make it my one thing"}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <Label>Whole task takes about</Label>
              <div className="flex flex-wrap gap-1.5">
                {EST_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => actions.patchTask(task.id, { est: task.est === e ? undefined : e })}
                    aria-pressed={task.est === e}
                    className={cn(
                      "h-10 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                      task.est === e ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                    )}
                  >
                    {EST_TEXT[e]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>When is it due?</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["Today", today],
                    ["Tomorrow", addDays(today, 1)],
                    ["Next week", addDays(today, 7)],
                    ["No date", undefined],
                  ] as [string, string | undefined][]
                ).map(([l, d]) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => actions.patchTask(task.id, { due: d })}
                    aria-pressed={task.due === d}
                    className={cn("h-10 rounded-full px-3.5 text-[13px] font-medium transition-colors", task.due === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")}
                  >
                    {l}
                  </button>
                ))}
                <input
                  type="date"
                  value={task.due ?? ""}
                  onChange={(e) => actions.patchTask(task.id, { due: e.target.value || undefined })}
                  aria-label="Pick a date"
                  className="h-10 rounded-full bg-muted px-3 text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                />
              </div>
              {task.due && <p className="mt-1.5 text-[13px] text-muted-foreground">Due {prettyDue(task.due, today)}</p>}
            </div>
            <div>
              <Label>Remind me</Label>
              <div className="flex flex-wrap gap-1.5">
                {remindChoices().map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => {
                      remindOnce(task.title, c.when);
                      setReminded(c.label);
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-muted px-3.5 text-[13px] font-medium hover:bg-accent"
                  >
                    <Bell className="size-3.5" /> {c.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {reminded ? `Added to your calendar: ${reminded.toLowerCase()}.` : "Your phone's calendar will remind you."}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="mt-5">
        <Label>Small steps</Label>
        <ul className="space-y-0.5">
          {task.subs.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <DoneCircle done={s.d} label={s.d ? `Untick ${s.t}` : `Tick ${s.t}`} onClick={() => actions.toggleSub(task.id, i)} />
              <span className={cn("text-[15px]", s.d && "text-muted-foreground line-through decoration-muted-foreground/40")}>{s.t}</span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!sub.trim()) return;
            actions.addSub(task.id, sub.trim());
            setSub("");
          }}
          className="mt-1 flex items-center gap-2 rounded-xl bg-muted px-3"
        >
          <Plus className="size-4 text-muted-foreground" />
          <input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Add a small step"
            aria-label="Add a small step"
            className="h-10 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </form>
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={() => {
            const undo = actions.removeTask(task.id);
            onClose();
            toast("Task removed.", { action: { label: "Undo", onClick: undo } });
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="size-4" /> Remove
        </button>
        <button type="button" onClick={onClose} className="h-10 rounded-xl bg-foreground px-5 text-sm font-medium text-background hover:opacity-90">
          Done editing
        </button>
      </div>
    </div>
  );
}
