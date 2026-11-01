"use client";

import { ArrowRight, Check, RotateCcw, Sparkles, SunMedium, Trash2, Copy as Dup } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Bucket, type Settings, type Task, BUCKET_NAME, HUES, MAX_TITLE } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { BreakItDown } from "./breakdown";
import { RemindPicker } from "./remind";
import { Sheet } from "./sheet";
import { SubtaskList } from "./steps";
import { Tile } from "./task-row";

const EMOJIS = ["✨", "📞", "✉️", "🛒", "💳", "🧺", "🏃", "📚", "✍️", "🎨", "🍳", "🩺", "🗓️", "💻", "🌱", "🧘", "🧹", "🎧", "🚗", "💡"];

export function TaskSheet({
  task,
  ai,
  onClose,
  actions,
  onFocus,
  onFinished,
  announce,
}: {
  task: Task | null;
  ai: Settings["ai"];
  onClose: () => void;
  actions: Actions;
  onFocus: (t: Task) => void;
  onFinished: (t: Task) => void;
  announce: (s: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [last, setLast] = useState<Task | null>(task);
  const [look, setLook] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (task) {
      setLast(task);
      setTitle(task.title);
      setConfirm(false);
      setLook(false);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (task) setLast(task);
  }, [task]);

  const t = task ?? last;
  if (!t) return null;
  const done = t.bucket === "done";
  const commit = () => {
    if (task && title.trim() && title.trim() !== task.title) actions.patch(task.id, { title });
  };
  const close = () => {
    commit();
    onClose();
  };

  const doneCount = t.steps.filter((s) => s.d).length;

  return (
    <Sheet open={!!task} onClose={close} title="Task details" hideTitle>
      {/* 1. What it is. Tap the title to edit it, tap the tile to change its look. */}
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setLook((v) => !v)} aria-expanded={look} aria-label="Change colour and icon" className="mt-0.5 shrink-0 rounded-[14px]">
          <Tile task={t} size={44} />
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="t-title" className="sr-only">
            Task
          </label>
          <textarea
            id="t-title"
            value={title}
            rows={1}
            maxLength={MAX_TITLE}
            onChange={(e) => {
              setTitle(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
            enterKeyHint="done"
            className="t-title -mx-2 w-[calc(100%+1rem)] resize-none rounded-[12px] bg-transparent px-2 py-1 text-[24px] leading-tight transition-colors [field-sizing:content] focus:bg-[var(--sheet)] focus:outline-none focus:ring-1 focus:ring-line"
          />
          {!done && <p className="t-small mt-0.5 text-ink-3">{BUCKET_NAME[t.bucket]}{t.steps.length > 0 && ` · ${doneCount} of ${t.steps.length} subtasks done`}</p>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {look && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="overflow-hidden">
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Colour">
              {HUES.map((h) => (
                <button key={h} type="button" aria-label={h} aria-pressed={t.hue === h} onClick={() => actions.patch(t.id, { hue: h })} className={`hue-${h} grid size-9 place-items-center rounded-full`} style={{ background: "var(--h)" }}>
                  {t.hue === h && <Check className="size-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Icon">
              {EMOJIS.map((e) => (
                <button key={e} type="button" aria-pressed={t.emoji === e} onClick={() => actions.patch(t.id, { emoji: e })} className={`grid size-10 place-items-center rounded-xl bg-white text-[20px] ${t.emoji === e ? "ring-2 ring-signal" : "ring-1 ring-line"}`}>
                  {e}
                </button>
              ))}
              <button type="button" onClick={() => actions.patch(t.id, { emoji: undefined })} className="h-10 rounded-xl bg-white px-3 text-[14px] text-ink-2 ring-1 ring-line">
                Use a letter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {done ? (
        <button type="button" className="btn btn-line mt-6 w-full" onClick={() => (actions.restore(t.id), announce("Task is back on your list."), onClose())}>
          <RotateCcw className="size-4" /> Put it back on my list
        </button>
      ) : (
        <>
          {/* 2. What to do next. The two main actions sit right under the title. */}
          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" className="btn btn-signal" onClick={() => (commit(), onFocus(t))}>
              Start <ArrowRight className="size-5" />
            </button>
            <button type="button" className="btn btn-line gap-1.5 px-4" onClick={() => (commit(), actions.finish(t.id), onFinished(t))}>
              <Check className="size-4" /> Done
            </button>
          </div>

          {/* 3. Subtasks. Type and press Return. No extra button. */}
          <p className="t-label mt-7">Subtasks</p>
          <div className="mt-2">
            <SubtaskList task={t} actions={actions} />
          </div>
          <div className="mt-3">
            <BreakItDown key={t.id} task={t} actions={actions} ai={ai} announce={announce} compact />
          </div>

          {/* 4. When, and a nudge. That is all the planning a task needs. */}
          <p className="t-label mt-7">When?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["today", "week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={t.bucket === b} onClick={() => (actions.move(t.id, b), feel("tick", "light"), announce(`Moved to ${BUCKET_NAME[b].toLowerCase()}.`))}>
                {BUCKET_NAME[b]}
              </button>
            ))}
          </div>

          <p className="t-label mt-6">Remind me</p>
          <RemindPicker task={t} actions={actions} />
        </>
      )}

      {/* 5. The rest, kept quiet at the bottom. */}
      <div className="mt-8 flex items-center justify-center gap-1 border-t border-line pt-3">
        {!done && (
          <>
            <button type="button" className="btn btn-quiet min-h-10 gap-1.5 px-3 text-[14px]" onClick={() => (actions.tomorrow(t.id), toast("Moved to tomorrow."), onClose())}>
              <SunMedium className="size-4" /> Tomorrow
            </button>
            <button type="button" className="btn btn-quiet min-h-10 gap-1.5 px-3 text-[14px]" onClick={() => (actions.duplicate(t.id), toast("Copied."))}>
              <Dup className="size-4" /> Copy
            </button>
          </>
        )}
        {confirm ? (
          <span className="flex items-center gap-1" role="group" aria-label="Confirm delete">
            <button type="button" className="btn btn-quiet min-h-10 px-3 text-[14px]" onClick={() => setConfirm(false)}>
              Keep
            </button>
            <button
              type="button"
              className="btn btn-danger min-h-10 px-4 text-[14px]"
              onClick={() => {
                const gone = actions.remove(t.id);
                onClose();
                if (gone) toast("Deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
              }}
            >
              Delete
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-quiet min-h-10 gap-1.5 px-3 text-[14px] text-danger" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </div>
    </Sheet>
  );
}


/** Quick actions on a held task, after Tiimo's menu. */
export function TaskMenu({ task, onClose, actions, onOpen, onFocus }: { task: Task | null; onClose: () => void; actions: Actions; onOpen: (t: Task) => void; onFocus: (t: Task) => void }) {
  const [last, setLast] = useState<Task | null>(task);
  useEffect(() => {
    if (task) setLast(task);
  }, [task]);
  const t = task ?? last;
  if (!t) return null;
  const item = (label: string, icon: React.ReactNode, fn: () => void, danger = false) => (
    <li>
      <button type="button" className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] transition-colors active:bg-ink/5 ${danger ? "text-danger" : ""}`} onClick={() => (fn(), feel("tap", "light"), onClose())}>
        <span className="grid size-6 place-items-center">{icon}</span>
        {label}
      </button>
    </li>
  );
  return (
    <Sheet open={!!task} onClose={onClose} title={t.title}>
      <ul className="mt-1 pb-2">
        {t.bucket !== "done" && item("Start focus", <ArrowRight className="size-5" />, () => onFocus(t))}
        {t.bucket !== "done" && item("Do it tomorrow", <SunMedium className="size-5" />, () => (actions.tomorrow(t.id), toast("Moved to tomorrow.")))}
        {t.bucket !== "today" && t.bucket !== "done" && item("Move to Today", <span className="text-[15px]">→</span>, () => actions.move(t.id, "today"))}
        {t.bucket !== "week" && t.bucket !== "done" && item("Move to This week", <span className="text-[15px]">→</span>, () => actions.move(t.id, "week"))}
        {t.bucket !== "later" && t.bucket !== "done" && item("Move to someday", <span className="text-[15px]">→</span>, () => actions.move(t.id, "later"))}
        {t.bucket === "done" && item("Put it back", <RotateCcw className="size-5" />, () => actions.restore(t.id))}
        {item("Edit", <Sparkles className="size-5" />, () => onOpen(t))}
        {item("Make a copy", <Dup className="size-5" />, () => (actions.duplicate(t.id), toast("Copied.")))}
        {item(
          "Delete",
          <Trash2 className="size-5" />,
          () => {
            const gone = actions.remove(t.id);
            if (gone) toast("Deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
          },
          true
        )}
      </ul>
    </Sheet>
  );
}
