"use client";

import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { feel } from "@/lib/feedback";
import { BUCKET_NAME, type EntryKind, MAX_TITLE, type State, type Task, isDuplicate } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { useSpeech } from "@/lib/use-speech";
import { keepFocus } from "./steps";

type Kind = "task" | EntryKind;

const HINT: Record<Kind, string> = {
  task: "Something to do. It goes on your list.",
  idea: "A spark for later. It comes back in a few days.",
  note: "Something to keep. It waits in Ideas.",
};

/**
 * Quick capture at the top of Today. One quiet field. The Task, Idea or Note
 * choice and the Save button only appear once you start, so Today stays calm.
 */
export function QuickCapture({ state, actions, announce, onOpen }: { state: State; actions: Actions; announce: (s: string) => void; onOpen: (t: Task) => void }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("task");
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  // A tap inside the box (the toggle, mic or Save) must not count as leaving.
  // iPhone moves focus off the field on any button tap, so we remember the
  // tap came from inside, ignore that blur, and hand focus straight back.
  const inside = useRef(false);
  const refocus = () => requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
  const speech = useSpeech((t, final) => {
    if (final) setText((v) => (v ? `${v} ${t}` : t).slice(0, kind === "task" ? MAX_TITLE : 2000));
  });
  const open = focused || !!text || speech.listening;
  const dup = kind === "task" && text.trim().length > 2 && isDuplicate(state, text);

  const grow = () => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  const reset = () => {
    setText("");
    setKind("task");
    requestAnimationFrame(grow);
  };
  const save = () => {
    if (speech.listening) speech.toggle();
    if (!text.trim()) return;
    if (kind === "task") {
      const t = actions.capture(text);
      if (!t) return;
      feel("save", "success");
      announce(`Saved: ${t.title}.`);
      toast(`Added to ${BUCKET_NAME[t.bucket]}.`, { action: { label: "Details", onClick: () => onOpen(t) } });
    } else {
      const e = actions.addEntry(text, kind);
      if (!e) return;
      feel("save", "success");
      toast(kind === "idea" ? "Idea saved. It comes back in a few days." : "Note saved in Ideas.");
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
      className={`mt-6 rounded-[20px] bg-white ring-1 transition-shadow ${open ? "ring-signal/40 shadow-[0_0_0_4px_rgb(29_77_245/0.08)]" : "ring-line"}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-start gap-2 pl-4 pr-1.5">
        <label htmlFor="quick" className="sr-only">
          What is on your mind?
        </label>
        <textarea
          id="quick"
          ref={field}
          rows={1}
          value={text}
          maxLength={kind === "task" ? MAX_TITLE : 2000}
          onChange={(e) => (setText(e.target.value), grow())}
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
          placeholder={speech.listening ? "Listening…" : "What is on your mind?"}
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
              <div className="flex items-center gap-2">
                <div className="seg inline-grid grid-cols-3 p-0.5" role="tablist" aria-label="What is it?">
                  {(["task", "idea", "note"] as Kind[]).map((k) => (
                    <button key={k} type="button" role="tab" aria-selected={kind === k} {...keepFocus} onClick={() => (setKind(k), feel("tick", "light"), refocus())} className="relative h-8 rounded-full px-3 text-[13px] font-semibold">
                      {kind === k && <motion.span layoutId="quick-seg" className="seg-knob absolute inset-0" transition={{ type: "spring", bounce: 0, duration: 0.28 }} />}
                      <span className={`relative capitalize ${kind === k ? "text-ink" : "text-ink-3"}`}>{k}</span>
                    </button>
                  ))}
                </div>
                <button type="submit" {...keepFocus} disabled={!text.trim()} className="btn btn-signal ml-auto min-h-9 px-4 text-[14px]">
                  Save
                </button>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={dup ? "dup" : kind} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }} className="t-small mt-2 px-1 text-ink-3">
                  {dup ? "You already have something like this. Saving adds it again." : HINT[kind]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
