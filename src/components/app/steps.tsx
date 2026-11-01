"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { feel } from "@/lib/feedback";
import { MAX_STEP, type Task, suggestStep } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { StepCheck } from "./task-row";

/**
 * Keeps the keyboard up when a button is pressed next to a text field.
 * Without this, the field loses focus first, the keyboard starts closing,
 * the layout jumps, and the tap lands nowhere. One press now works.
 */
export const keepFocus = { onPointerDown: (e: React.PointerEvent) => e.preventDefault(), onMouseDown: (e: React.MouseEvent) => e.preventDefault() };

/** A task's steps with a field to add more. Used right after saving a task. */
export function StepEditor({ task, actions }: { task: Task; actions: Actions }) {
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const tip = suggestStep(task.title);
  const add = (text: string) => {
    if (!text.trim()) return;
    actions.addStep(task.id, text);
    feel("save", "light");
    setDraft("");
    field.current?.focus();
  };
  return (
    <div>
      {task.steps.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          <AnimatePresence initial={false}>
            {task.steps.map((s) => (
              <motion.li key={s.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
                <div className="flex min-h-[48px] items-center gap-2 rounded-[14px] bg-white pl-2 pr-1 ring-1 ring-line">
                  <button type="button" className="grid size-9 shrink-0 place-items-center" aria-label={s.d ? "Mark step not done" : "Mark step done"} onClick={() => (actions.toggleStep(task.id, s.id), feel(s.d ? "unstep" : "step", "light"))}>
                    <StepCheck done={s.d} hue={task.hue} size={20} />
                  </button>
                  <span className={`min-w-0 flex-1 text-[15px] ${s.d ? "text-ink-3 line-through" : ""}`}>{s.t}</span>
                  <button type="button" className="icon-btn size-9 text-ink-3" aria-label="Remove step" onClick={() => (actions.removeStep(task.id, s.id), feel("tap"))}>
                    <X className="size-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
      >
        <input ref={field} value={draft} maxLength={MAX_STEP} onChange={(e) => setDraft(e.target.value)} placeholder={task.steps.length ? "Add another step" : "The smallest thing you could do first"} aria-label="New step" enterKeyHint="done" className="field min-w-0 flex-1" />
        <button type="submit" {...keepFocus} className="btn btn-ink btn-icon size-[50px] shrink-0 rounded-[14px]" aria-label="Add step">
          <Plus className="size-5" />
        </button>
      </form>
      {!task.steps.length && (
        <button type="button" className="chip mt-2 gap-1.5 text-left" onClick={() => add(tip)}>
          <Sparkles className="size-3.5 shrink-0 text-signal" /> {tip}
        </button>
      )}
    </div>
  );
}
