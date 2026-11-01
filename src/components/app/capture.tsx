"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Bucket, type State, type Task, BUCKET_NAME, MAX_TITLE, isDuplicate, suggestStep } from "@/lib/tasks";
import { type Actions, DRAFT_KEY } from "@/lib/use-tasks";
import { Sheet } from "./sheet";

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

/** Capture: one field. Save the raw thought first, details after. */
export function Capture({
  open,
  onClose,
  state,
  actions,
  announce,
}: {
  open: boolean;
  onClose: () => void;
  state: State;
  actions: Actions;
  announce: (s: string) => void;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<Task | null>(null);
  const [step, setStep] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(readDraft());
      setSaved(null);
      setStep("");
    }
  }, [open]);

  const live = saved ? state.tasks.find((t) => t.id === saved.id) ?? saved : null;
  const dup = !saved && text.trim().length > 2 && isDuplicate(state, text);

  const save = () => {
    const t = actions.capture(text);
    if (!t) return;
    writeDraft("");
    setText("");
    setSaved(t);
    announce(`Saved: ${t.title}.`);
  };

  const finish = () => {
    if (live && step.trim() && step.trim() !== live.step) actions.edit(live.id, { step });
    onClose();
  };

  const another = () => {
    if (live && step.trim()) actions.edit(live.id, { step });
    setSaved(null);
    setStep("");
    requestAnimationFrame(() => input.current?.focus());
  };

  return (
    <Sheet open={open} onClose={saved ? finish : onClose} title={saved ? "Saved" : "Add a thought"} initialFocus={input}>
      {!live ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor="thought" className="sr-only">
            What is on your mind?
          </label>
          <textarea
            id="thought"
            ref={input}
            autoFocus
            value={text}
            maxLength={MAX_TITLE}
            rows={3}
            placeholder="What is on your mind?"
            onChange={(e) => {
              setText(e.target.value);
              writeDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
            }}
            className="mt-2 w-full resize-none bg-transparent font-serif text-[24px] leading-snug tracking-[-0.01em] placeholder:text-ink-3/80 focus:outline-none"
          />
          <div className="mt-1 flex min-h-5 items-center justify-between text-[13px] text-ink-3">
            <span>{dup ? "This is already on your list. You can still save it." : text ? "Your words are kept as you type." : "Messy is fine. You can tidy it later."}</span>
            {text.length > MAX_TITLE - 30 && <span>{MAX_TITLE - text.length}</span>}
          </div>
          <button type="submit" className="btn btn-signal mt-4 w-full text-[17px]" disabled={!text.trim()}>
            Save
          </button>
        </form>
      ) : (
        <div>
          <div className="flex items-start gap-3 rounded-2xl bg-paper p-4">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-signal text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-medium [overflow-wrap:anywhere]">{live.title}</p>
              <p className="text-[14px] text-ink-3">Saved to {BUCKET_NAME[live.bucket]}.</p>
            </div>
          </div>

          <p className="mt-5 text-[15px] font-semibold">
            First step <span className="font-normal text-ink-3">(optional)</span>
          </p>
          <label htmlFor="first-step" className="sr-only">
            First step
          </label>
          <input
            id="first-step"
            className="field mt-2"
            value={step}
            maxLength={160}
            placeholder="The smallest thing you could do first"
            onChange={(e) => setStep(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && finish()}
          />
          {!step && (
            <button type="button" className="chip mt-2 gap-1.5 text-left" onClick={() => setStep(suggestStep(live.title))}>
              <Sparkles className="size-3.5 shrink-0 text-signal" /> Try: {suggestStep(live.title)}
            </button>
          )}

          <p className="mt-5 text-[15px] font-semibold">When</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="When">
            {(["today", "week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={live.bucket === b} onClick={() => actions.move(live.id, b)}>
                {BUCKET_NAME[b]}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-line" onClick={another}>
              Add another
            </button>
            <button type="button" className="btn btn-signal" onClick={finish}>
              Done
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
