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
  task: "One task, or paste a list and each line becomes a task.",
  idea: "A spark for later. It comes back in a few days.",
  note: "Something to keep, like a number or an address.",
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
    if (final) setText((v) => (v ? `${v} ${t}` : t).slice(0, kind === "task" ? MAX_TITLE : 2000));
    else setInterim(t);
    requestAnimationFrame(grow);
  });
  const open = focused || !!text || !!interim || speech.listening;
  const dup = kind === "task" && text.trim().length > 2 && isDuplicate(state, text);

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
    if (speech.listening) speech.toggle();
    // Keep any words still being heard when Save is tapped.
    const text = interim ? (typed ? `${typed} ${interim}` : interim) : typed;
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
      const t = actions.capture(text);
      if (!t) return;
      feel("save", "success");
      announce(`Saved: ${t.title}.`);
      toast(`Added to ${BUCKET_NAME[t.bucket]}.`, { action: { label: "Details", onClick: () => onOpen(t) } });
    } else {
      const e = actions.addEntry(text, kind);
      if (!e) return;
      feel("save", "success");
      toast(kind === "idea" ? "Idea saved. It comes back in a few days." : "Note saved.");
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
          value={interim ? (text ? `${text} ${interim}` : interim) : text}
          maxLength={kind === "task" ? MAX_TITLE : 2000}
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
          placeholder={speech.listening ? "Listening…" : PLACEHOLDER[kind]}
          className="min-h-[54px] flex-1 resize-none bg-transparent py-[15px] text-[17px] leading-snug placeholder:text-ink-3 focus:outline-none"
        />
        {speech.supported && (
          <button type="button" {...keepFocus} onClick={() => (speech.toggle(), feel("tap", "light"), refocus())} aria-pressed={speech.listening} aria-label={speech.listening ? "Stop listening" : "Speak instead"} className={`btn btn-icon mt-[7px] size-10 ${speech.listening ? "btn-danger" : "btn-quiet text-ink-2"}`}>
            <Mic className="size-[18px]" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden">
            <div className="border-t border-line px-3 pb-3 pt-3">
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p key={dup ? "dup" : kind} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }} className="t-small min-w-0 flex-1 px-1 text-ink-3">
                    {dup ? "You already have this. Saving adds it again." : HINT[kind]}
                  </motion.p>
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
