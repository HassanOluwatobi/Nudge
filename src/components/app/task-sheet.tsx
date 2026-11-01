"use client";

import { ArrowRight, Check, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Bucket, type Task, BUCKET_NAME, MAX_STEP, MAX_TITLE, addDays, suggestStep, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Sheet } from "./sheet";

/** Everything about one task: words, first step, when, and the bigger actions. */
export function TaskSheet({
  task,
  onClose,
  actions,
  onFocus,
  onFinished,
  announce,
}: {
  task: Task | null;
  onClose: () => void;
  actions: Actions;
  onFocus: (t: Task) => void;
  onFinished: (t: Task) => void;
  announce: (s: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [step, setStep] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [last, setLast] = useState<Task | null>(task);

  useEffect(() => {
    if (task) {
      setLast(task);
      setTitle(task.title);
      setStep(task.step);
      setConfirm(false);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = task ?? last;
  if (!t) return null;
  const today = ymd();
  const done = t.bucket === "done";

  const commit = () => {
    if (!task) return;
    const p: { title?: string; step?: string } = {};
    if (title.trim() && title.trim() !== task.title) p.title = title;
    if (step.trim() !== task.step) p.step = step;
    if (Object.keys(p).length) actions.edit(task.id, p);
  };
  const close = () => {
    commit();
    onClose();
  };

  return (
    <Sheet open={!!task} onClose={close} title="Task">
      <label htmlFor="t-title" className="sr-only">
        Task
      </label>
      <textarea
        id="t-title"
        value={title}
        rows={2}
        maxLength={MAX_TITLE}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        className="mt-1 w-full resize-none bg-transparent t-title focus:outline-none"
      />
      {t.steps > 0 && <p className="-mt-1 text-[14px] text-ink-3">{t.steps === 1 ? "1 step done" : `${t.steps} steps done`}</p>}

      {!done && (
        <>
          <p className="t-label mt-5">{t.steps ? "Next step" : "First step"}</p>
          <label htmlFor="t-step" className="sr-only">
            Step
          </label>
          <input
            id="t-step"
            className="field mt-2"
            value={step}
            maxLength={MAX_STEP}
            placeholder="The smallest thing you could do first"
            onChange={(e) => setStep(e.target.value)}
            onBlur={commit}
          />
          {!step && (
            <button type="button" className="chip mt-2 gap-1.5 text-left" onClick={() => setStep(suggestStep(t.title))}>
              <Sparkles className="size-3.5 shrink-0 text-signal" /> Try: {suggestStep(t.title)}
            </button>
          )}

          <p className="t-label mt-6">When</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="When">
            {(["today", "week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
              <button
                key={b}
                type="button"
                className="chip"
                aria-pressed={t.bucket === b}
                onClick={() => {
                  actions.move(t.id, b);
                  announce(`Moved to ${BUCKET_NAME[b]}.`);
                }}
              >
                {BUCKET_NAME[b]}
              </button>
            ))}
          </div>

          <p className="t-label mt-6">
            Due date <span className="font-medium normal-case tracking-normal">(optional)</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="chip" aria-pressed={t.due === today} onClick={() => actions.edit(t.id, { due: t.due === today ? null : today })}>
              Today
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={t.due === addDays(today, 1)}
              onClick={() => actions.edit(t.id, { due: t.due === addDays(today, 1) ? null : addDays(today, 1) })}
            >
              Tomorrow
            </button>
            <label className="chip relative gap-1">
              <span>{t.due && t.due !== today && t.due !== addDays(today, 1) ? t.due : "Pick a date"}</span>
              <input
                type="date"
                aria-label="Pick a due date"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={t.due ?? ""}
                onChange={(e) => actions.edit(t.id, { due: e.target.value || null })}
              />
            </label>
            {t.due && (
              <button type="button" className="btn btn-quiet min-h-10 text-[14px]" onClick={() => actions.edit(t.id, { due: null })}>
                Clear date
              </button>
            )}
          </div>
        </>
      )}

      <div className="mt-7 flex flex-col gap-2">
        {done ? (
          <button
            type="button"
            className="btn btn-line w-full"
            onClick={() => {
              actions.restore(t.id);
              announce("Task is back on your list.");
              onClose();
            }}
          >
            <RotateCcw className="size-4" /> Put it back on my list
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-signal w-full"
              onClick={() => {
                commit();
                onFocus(t);
              }}
            >
              Start this task <ArrowRight className="size-5" />
            </button>
            <button
              type="button"
              className="btn btn-line w-full"
              onClick={() => {
                commit();
                actions.finish(t.id);
                onFinished(t);
              }}
            >
              <Check className="size-4" /> Finish this task
            </button>
          </>
        )}
        {confirm ? (
          <div className="mt-1 flex items-center justify-between gap-2 rounded-2xl bg-danger-soft p-2 pl-4" role="group" aria-label="Confirm delete">
            <span className="text-[15px]">Delete this task?</span>
            <div className="flex gap-1">
              <button type="button" className="btn btn-quiet min-h-11" onClick={() => setConfirm(false)}>
                Keep
              </button>
              <button
                type="button"
                className="btn btn-danger min-h-11 px-4"
                onClick={() => {
                  const gone = actions.remove(t.id);
                  onClose();
                  if (gone) toast("Task deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet w-full gap-1.5 text-[15px]" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </div>
    </Sheet>
  );
}
