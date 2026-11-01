"use client";

import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { feel } from "@/lib/feedback";
import { BUCKET_NAME, type EntryKind, MAX_TITLE, type State, type Task, isDuplicate, splitLines } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { useSpeech } from "@/lib/use-speech";
import { keepFocus } from "./steps";

export type Kind = "task" | EntryKind;

const HINT: Record<Kind, string> = {
  task: "Add one or more tasks.",
  idea: "Save it for later. I'll remind you in a few days.",
  note: "Numbers, addresses, anything you'll need later.",
};
const PLACEHOLDER: Record<Kind, string> = { task: "Add a task…", idea: "Jot an idea…", note: "Write a note…" };

/**
 * Quick capture on Home. It types into whatever the toggle above shows, so
 * what you save always lands in the list you are looking at. Save appears
 * only once you start.
 */
export function QuickCapture({ kind, state, actions, announce, onOpen }: { kind: Kind; state: State; actions: Actions; announce: (s: string) => void; onOpen: (t: Task) => void }) {
  const [text, setText] = useState("");
  const textState = text;
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  // A tap inside the box (the toggle, mic or Save) must not count as leaving.
  // iPhone moves focus off the field on any button tap, so we remember the
  // tap came from inside, ignore that blur, and hand focus straight back.
  const inside = useRef(false);
  const refocus = () => requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
  // Live words while you speak. They become real text once the browser is sure.
  const [interim, setInterim] = useState("");
  const speech = useSpeech((t, final) => {
    // Each pause in speech is a new line, so each thing you say becomes its own task.
    if (final) setText((v) => (v ? `${v}\n${t}` : t).slice(0, 2000));
    else setInterim(t);
    requestAnimationFrame(grow);
  });
  const open = focused || !!text || !!interim || speech.listening;
  const dup = kind === "task" && text.trim().length > 2 && isDuplicate(state, text);
  // Show how a brain dump will be cut up, live, while you type or speak.
  const live = interim ? (text ? `${text}\n${interim}` : interim) : text;
  const parts = kind === "task" && live.trim() ? splitLines(live) : [];

  const grow = () => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  const reset = () => {
    setText("");
    requestAnimationFrame(grow);
  };
  const save = () => {
    const typed = textState;
    if (speech.listening) speech.stopQuiet();
    // Keep any words still being heard when Save is tapped.
    const text = interim ? (typed ? `${typed}\n${interim}` : interim) : typed;
    setInterim("");
    if (!text.trim()) return;
    if (kind === "task") {
      const lines = splitLines(text);
      if (lines.length > 1) {
        const made = actions.captureMany(lines);
        feel("save", "success");
        announce(`Added ${made.length} tasks.`);
        toast(`Added ${made.length} tasks.`);
        reset();
        inside.current = false;
        setFocused(false);
        field.current?.blur();
        return;
      }
      const t = actions.capture(lines[0] ?? text);
      if (!t) return;
      feel("save", "success");
      announce(`Saved: ${t.title}.`);
      toast("Added.", { action: { label: "Details", onClick: () => onOpen(t) } });
    } else {
      const e = actions.addEntry(text, kind);
      if (!e) return;
      feel("save", "success");
      toast(kind === "idea" ? "Saved. I'll bring it back in a few days." : "Note saved.");
    }
    reset();
    inside.current = false;
    setFocused(false);
    field.current?.blur();
  };

  return (
    <form
      onPointerDownCapture={(e) => {
        if (e.target === field.current) return;
        inside.current = true;
        setTimeout(() => (inside.current = false), 700);
      }}
      onClickCapture={() => {
        if (!inside.current) return;
        setTimeout(() => (inside.current = false), 0);
      }}
      className={`rounded-[20px] bg-white ring-1 transition-shadow ${open ? "ring-signal/40 shadow-[0_0_0_4px_rgb(29_77_245/0.08)]" : "ring-line"}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-start gap-2 pl-4 pr-1.5">
        <label htmlFor="quick" className="sr-only">
          {PLACEHOLDER[kind]}
        </label>
        <textarea
          id="quick"
          ref={field}
          rows={1}
          value={interim ? (text ? `${text}\n${interim}` : interim) : text}
          maxLength={2000}
          onChange={(e) => (setText(e.target.value), setInterim(""), grow())}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (inside.current) return;
            setFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && kind === "task") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              reset();
              inside.current = false;
              field.current?.blur();
            }
          }}
          enterKeyHint={kind === "task" ? "done" : "enter"}
          placeholder={speech.listening ? "I'm listening…" : PLACEHOLDER[kind]}
          className="min-h-[54px] flex-1 resize-none bg-transparent py-[15px] text-[17px] leading-snug placeholder:text-ink-3 focus:outline-none"
        />
        {speech.supported && (
          <button type="button" {...keepFocus} onClick={() => (speech.toggle(), feel("tap", "light"), refocus())} aria-pressed={speech.listening} aria-label={speech.listening ? "Stop listening" : "Speak instead"} className={`btn btn-icon mt-[7px] size-10 ${speech.listening ? "btn-signal mic-live" : "btn-quiet text-ink-2"}`}>
            <Mic className="size-[18px]" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden">
            <div className="border-t border-line px-3 pb-3 pt-3">
              {parts.length > 1 && (
                <ul className="mb-3 flex flex-wrap gap-1.5 px-1" aria-label="Tasks it will make">
                  {parts.map((p, i) => (
                    <li key={i} className="chip-in max-w-full truncate rounded-full bg-signal-soft px-2.5 py-1 text-[13px] font-medium text-signal-ink">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  {parts.length > 1 ? (
                    <motion.p key="split" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }} className="t-small min-w-0 flex-1 px-1 font-semibold text-signal-ink">
                      That&apos;s {parts.length} tasks
                    </motion.p>
                  ) : (
                    <motion.p key={dup ? "dup" : kind} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }} className="t-small min-w-0 flex-1 px-1 text-ink-3">
                      {dup ? "You've already got this one." : HINT[kind]}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" {...keepFocus} disabled={!text.trim() && !interim.trim()} className="btn btn-signal min-h-9 shrink-0 px-4 text-[14px]">
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
