"use client";

import { ClipboardPaste, ExternalLink, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { AI_NAME, aiLink, breakdownPrompt, copy } from "@/lib/ai";
import { feel } from "@/lib/feedback";
import { type Settings, type Task, parseSteps } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";

/**
 * Break it down with your own AI. Two taps: ask, then paste.
 * Shrink my day writes the question and opens ChatGPT, Claude, Gemini or Grok with it.
 * Copy the answer there, come back, tap Paste. Free, and nothing is sent from here.
 */
export function BreakItDown({ task, actions, ai, announce, compact = false, onAdded }: { task: Task; actions: Actions; ai: Settings["ai"]; announce?: (s: string) => void; compact?: boolean; onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const name = AI_NAME[ai];
  const link = aiLink(ai, breakdownPrompt(task.title));
  const found = parseSteps(text);

  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!parseSteps(t).length) {
        toast(`Nothing to paste yet. Copy ${name}'s answer first.`);
        return;
      }
      setText(t);
      feel("tick");
    } catch {
      // Some browsers do not allow reading the clipboard. Typing or long-press paste still works.
      setTyping(true);
    }
  };

  const add = () => {
    actions.addSteps(task.id, found);
    feel("done", "success");
    toast(`Added ${found.length} subtasks.`);
    announce?.(`Added ${found.length} subtasks.`);
    setOpen(false);
    setAsked(false);
    setText("");
    setTyping(false);
    onAdded?.();
  };

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (setOpen((v) => !v), feel("tap"))}
        className={`ai-chip inline-flex items-center gap-2 rounded-full font-semibold ${compact ? "h-9 px-3.5 text-[14px]" : "h-10 px-4 text-[15px]"}`}
      >
        <Sparkles className="size-4" /> Break it down with {name}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden">
            <div className="mt-3 rounded-[20px] bg-white p-4 ring-1 ring-line">
              {!found.length ? (
                <>
                  <p className="text-[15px] font-semibold">Let {name} do the hard part</p>
                  <p className="t-small mt-1 text-ink-2">It splits this into tiny steps. You stay in charge of what gets added.</p>
                  <div className="mt-3 grid gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => {
                        const ok = await copy(breakdownPrompt(task.title));
                        setAsked(true);
                        if (!link.prefilled) toast(ok ? `Question copied. Paste it into ${name}.` : `Ask ${name} to break "${task.title}" into tiny steps.`);
                      }}
                      className={`btn ${asked ? "btn-line" : "btn-signal"} min-h-12 w-full gap-2`}
                    >
                      <span className="grid size-5 place-items-center rounded-full bg-white/25 text-[12px] font-bold">1</span> Ask {name} <ExternalLink className="size-4" />
                    </a>
                    <button type="button" className={`btn ${asked ? "btn-signal" : "btn-line"} min-h-12 w-full gap-2`} onClick={paste}>
                      <span className={`grid size-5 place-items-center rounded-full text-[12px] font-bold ${asked ? "bg-white/25" : "bg-paper"}`}>2</span> Paste the answer <ClipboardPaste className="size-4" />
                    </button>
                  </div>
                  {typing && <textarea autoFocus rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Paste ${name}'s list here`} className="field mt-3 resize-none text-[16px]" />}
                </>
              ) : (
                <>
                  <p className="text-[15px] font-semibold">Here is the plan</p>
                  <ul className="mt-2 space-y-1.5">
                    {found.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-[15px] leading-snug">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-signal-soft text-[11px] font-semibold text-signal-ink">{i + 1}</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                    <button type="button" className="btn btn-line min-h-12 px-4" onClick={() => (setText(""), setTyping(false))}>
                      Redo
                    </button>
                    <button type="button" className="btn btn-signal min-h-12" onClick={add}>
                      Add {found.length} subtasks
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
