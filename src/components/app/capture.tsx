"use client";

import { Check, Mic } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Bucket, type EntryKind, type Part, type State, type Task, BUCKET_NAME, MAX_TITLE, isDuplicate, splitLines } from "@/lib/tasks";
import { type Actions, DRAFT_KEY } from "@/lib/use-tasks";
import { useSpeech } from "@/lib/use-speech";
import { feel } from "@/lib/feedback";
import { RemindPicker } from "./remind";
import { Sheet } from "./sheet";
import { StepEditor, keepFocus } from "./steps";
import { Tile } from "./task-row";

const readDraft = () => {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
};
const writeDraft = (v: string) => {
  try {
    if (v) localStorage.setItem(DRAFT_KEY, v);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
};

type Kind = "task" | EntryKind;

/** Capture: one field, saved first. Details are optional and come after. */
export function Capture({
  open,
  onClose,
  state,
  actions,
  announce,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  state: State;
  actions: Actions;
  announce: (s: string) => void;
  preset?: { bucket?: Exclude<Bucket, "done">; part?: Part };
}) {
  const [kind, setKind] = useState<Kind>("task");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [saved, setSaved] = useState<Task | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeech((t, final) => {
    if (final) {
      setInterim("");
      setText((v) => {
        const next = (v ? `${v}\n${t}` : t).slice(0, 2000);
        writeDraft(next);
        return next;
      });
    } else setInterim(t);
  });

  useEffect(() => {
    if (open) {
      setText(readDraft());
      setSaved(null);
      setKind("task");
    }
  }, [open]);

  const live = saved ? (state.tasks.find((t) => t.id === saved.id) ?? saved) : null;
  const dup = kind === "task" && !saved && text.trim().length > 2 && isDuplicate(state, text);

  const save = () => {
    if (speech.listening) speech.toggle();
    if (kind === "task") {
      const extra = { ...(preset?.bucket ? { bucket: preset.bucket } : {}), ...(preset?.part ? { part: preset.part } : {}) };
      // Brain dump: several lines become several tasks.
      const lines = splitLines(text);
      if (lines.length > 1) {
        const made = actions.captureMany(lines, extra);
        writeDraft("");
        setText("");
        feel("save", "success");
        toast(`Added ${made.length} tasks.`);
        announce(`Added ${made.length} tasks.`);
        onClose();
        return;
      }
      const t = actions.capture(text, extra);
      if (!t) return;
      writeDraft("");
      setText("");
      feel("save", "success");
      setSaved(t);
      announce(`Saved: ${t.title}.`);
    } else {
      const e = actions.addEntry(text, kind);
      if (!e) return;
      writeDraft("");
      setText("");
      feel("save", "success");
      toast(kind === "idea" ? "Idea saved. It comes back on Home in a few days." : "Note saved. Find it under Notes on Home.");
      onClose();
    }
  };

  const another = () => {
    setSaved(null);
    requestAnimationFrame(() => input.current?.focus());
  };

  return (
    <Sheet open={open} onClose={onClose} title={live ? "Saved" : "Add a task"} initialFocus={input}>
      {!live ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {preset?.bucket && <p className="t-small text-ink-3">Goes to {BUCKET_NAME[preset.bucket]}. Type several lines to add several tasks.</p>}
          <label htmlFor="thought" className="sr-only">
            What is on your mind?
          </label>
          <textarea
            id="thought"
            ref={input}
            autoFocus
            value={text + (interim ? (text ? " " : "") + interim : "")}
            maxLength={2000}
            rows={3}
            placeholder={kind === "task" ? "What do you need to do?" : kind === "idea" ? "What is the idea?" : "What do you want to keep?"}
            onChange={(e) => {
              setText(e.target.value);
              writeDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && kind === "task") {
                e.preventDefault();
                save();
              }
            }}
            className="t-title mt-4 w-full resize-none rounded-[18px] border border-line bg-white px-4 py-3.5 text-[24px] transition-[border-color,box-shadow] placeholder:text-ink-3/70 focus:border-signal focus:shadow-[0_0_0_4px_rgb(29_77_245/0.12)] focus:outline-none"
          />
          <p className="t-small mt-2 min-h-5 px-1 text-ink-3">
            {speech.listening
              ? "Listening. Your browser turns speech into text, and some browsers use their own online service for this."
              : dup
                ? "This is already on your list. You can still save it."
                : text
                  ? "Your words are kept as you type."
                  : kind === "task"
                    ? "Messy is fine. Try “call mum tomorrow”."
                    : "Messy is fine."}
          </p>
          <div className="mt-4 flex gap-2">
            {speech.supported && (
              <button type="button" onClick={() => (speech.toggle(), feel("tap", "light"))} aria-pressed={speech.listening} aria-label={speech.listening ? "Stop listening" : "Speak instead"} className={`btn btn-icon size-[52px] ${speech.listening ? "btn-signal mic-live" : "btn-line"}`}>
                {speech.listening ? (
                  <motion.span animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 1.1 }}>
                    <Mic className="size-5" />
                  </motion.span>
                ) : (
                  <Mic className="size-5" />
                )}
              </button>
            )}
            <button type="submit" {...keepFocus} className="btn btn-signal flex-1 text-[17px]" disabled={!text.trim()}>
              Save
            </button>
          </div>
        </form>
      ) : (
        <TaskDetails task={live} actions={actions} onDone={onClose} onAnother={another} />
      )}
    </Sheet>
  );
}

/** The optional details after a task is saved. Every choice is one tap. */

function TaskDetails({ task, actions, onDone, onAnother }: { task: Task; actions: Actions; onDone: () => void; onAnother: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
        <Tile task={task} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{task.title}</p>
          <p className="t-small text-ink-3">Saved to {BUCKET_NAME[task.bucket]}</p>
        </div>
        <span className="grid size-7 place-items-center rounded-full bg-signal text-white">
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>

      <p className="t-label mt-6">Subtasks <span className="font-medium normal-case tracking-normal">(optional)</span></p>
      <StepEditor task={task} actions={actions} />

      <p className="t-label mt-6">When</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["today", "week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
          <button key={b} type="button" className="chip" aria-pressed={task.bucket === b} onClick={() => actions.move(task.id, b)}>
            {BUCKET_NAME[b]}
          </button>
        ))}
      </div>

      <p className="t-label mt-5">Remind me</p>
      <RemindPicker task={task} actions={actions} compact />

      <div className="mt-7 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-line" onClick={onAnother}>
          Add another
        </button>
        <button type="button" className="btn btn-signal" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
