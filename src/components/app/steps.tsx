"use client";

import { Lightbulb, Plus, X } from "lucide-react";
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

/**
 * The "Add a subtask" row. Type and press Return to add, and the field stays
 * ready for the next one. Tapping away with text in it adds it too, so there
 * is never a second button to press.
 */
export function AddSubtask({ onAdd, placeholder = "Add a subtask", className = "" }: { onAdd: (text: string) => void; placeholder?: string; className?: string }) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const add = (keep: boolean) => {
    const t = draft.trim();
    if (!t) return;
    onAdd(t);
    feel("save", "light");
    setDraft("");
    if (keep) ref.current?.focus();
  };
  return (
    <label className={`flex min-h-[50px] cursor-text items-center gap-2 pl-2 pr-3 ${className}`}>
      <span className="grid size-9 shrink-0 place-items-center text-ink-3" aria-hidden>
        <Plus className="size-[18px]" />
      </span>
      <input
        ref={ref}
        value={draft}
        maxLength={MAX_STEP}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(true);
          }
        }}
        onBlur={() => add(false)}
        enterKeyHint="next"
        placeholder={placeholder}
        aria-label="Add a subtask"
        className="min-w-0 flex-1 bg-transparent py-3 text-[16px] placeholder:text-ink-3 focus:outline-none"
      />
      {draft.trim() && <span className="shrink-0 text-[12px] font-medium text-ink-3">Press enter to add</span>}
    </label>
  );
}

/** A task's subtasks as one grouped list, with the add row at the bottom. */
export function SubtaskList({ task, actions, suggest = true }: { task: Task; actions: Actions; suggest?: boolean }) {
  const tip = suggestStep(task.title);
  return (
    <div>
      <ul className="overflow-hidden rounded-[18px] bg-white ring-1 ring-line">
        <AnimatePresence initial={false}>
          {task.steps.map((s) => (
            <motion.li key={s.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.28 }} className="border-b border-line/70">
              <div className="flex min-h-[50px] items-center gap-2 pl-2 pr-1">
                <button type="button" className="grid size-9 shrink-0 place-items-center" aria-pressed={s.d} aria-label={s.d ? "Mark subtask not done" : "Mark subtask done"} onClick={() => (actions.toggleStep(task.id, s.id), feel(s.d ? "unstep" : "step", "light"))}>
                  <StepCheck done={s.d} hue={task.hue} size={20} />
                </button>
                <input
                  defaultValue={s.t}
                  maxLength={MAX_STEP}
                  aria-label="Subtask"
                  onBlur={(e) => e.target.value.trim() && e.target.value !== s.t && actions.editStep(task.id, s.id, e.target.value)}
                  className={`min-w-0 flex-1 bg-transparent py-3 text-[16px] focus:outline-none ${s.d ? "text-ink-3 line-through" : ""}`}
                />
                <button type="button" className="icon-btn size-9 text-ink-3" aria-label="Remove subtask" onClick={() => (actions.removeStep(task.id, s.id), feel("tap"))}>
                  <X className="size-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        <li>
          <AddSubtask onAdd={(t) => actions.addStep(task.id, t)} placeholder={task.steps.length ? "Add a subtask" : "What's the first tiny step?"} />
        </li>
      </ul>
      {suggest && !task.steps.length && (
        <button type="button" className="chip mt-2 gap-1.5 text-left" onClick={() => (actions.addStep(task.id, tip), feel("step", "light"))}>
          <Lightbulb className="size-3.5 shrink-0 text-ink-3" /> {tip}
        </button>
      )}
    </div>
  );
}

/** Kept for the capture flow: the same list under a different name. */
export const StepEditor = SubtaskList;
