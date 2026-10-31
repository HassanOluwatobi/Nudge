"use client";

import { useState } from "react";
import { ArrowLeft, Lock, Mic, Sprout, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Entry, makeEntry, makeTask, parseCapture, splitDump, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { useSpeech } from "@/lib/use-speech";
import { Companion } from "./companion";

type Kind = "task" | "idea" | "note";
type Draft = { id: number; text: string; kind: Kind; raw: string };
const NEXT_KIND: Record<Kind, Kind> = { task: "idea", idea: "note", note: "task" };
const KIND_STYLE: Record<Kind, string> = {
  task: "bg-[#ffe6dc] text-[#d4553f]",
  idea: "bg-[#fff1cc] text-[#a7741a]",
  note: "bg-[#efe9ff] text-[#6b4fd8]",
};
const KIND_LABEL: Record<Kind, string> = { task: "To do", idea: "Idea", note: "Note" };

const SAYS = [
  "Hi, I'm Nudge! I help you do one calm thing at a time.",
  "Tell me everything on your mind. Tasks, worries, ideas. Messy is fine.",
  "Here's what I heard. Tap a label if I guessed wrong.",
  "Now pick one thing for today. Just one. I'll keep the rest safe.",
];

/** First run. Nudge walks you through it: empty your head, sort, pick one. */
export function Guide({ actions }: { actions: Actions }) {
  const [step, setStep] = useState(0);
  const [dump, setDump] = useState("");
  const [interim, setInterim] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [cheer, setCheer] = useState(0);
  const speech = useSpeech((text, final) => {
    if (final) {
      setDump((d) => (d ? d.replace(/\s*$/, "\n") : "") + text);
      setInterim("");
    } else setInterim(text);
  });

  const go = (n: number) => {
    setStep(n);
    setCheer((c) => c + 1);
  };

  const sort = () => {
    const all = (dump + (interim ? "\n" + interim : "")).trim();
    if (speech.listening) speech.toggle();
    const ds = splitDump(all)
      .map((line, i) => {
        const p = parseCapture(line);
        return p ? ({ id: i, kind: p.kind, raw: line, text: p.kind === "task" ? p.title : p.text } as Draft) : null;
      })
      .filter(Boolean) as Draft[];
    setDrafts(ds);
    go(2);
  };

  const finish = () => {
    const today = ymd();
    const tasks: Task[] = [];
    const entries: Entry[] = [];
    let mustId: string | undefined;
    for (const d of drafts) {
      if (d.kind === "task") {
        const p = parseCapture(d.raw);
        const t = makeTask(p && p.kind === "task" ? p : { kind: "task", title: d.text, bucket: "week", step: "Set a 10 minute timer and just begin." });
        if (d.id === pick) mustId = t.id;
        tasks.push(t);
      } else entries.push(makeEntry(d.kind, d.text, today));
    }
    actions.finishOnboarding(tasks, entries, mustId);
  };

  const tasks = drafts.filter((d) => d.kind === "task");

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex h-11 items-center justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} aria-label="Back" className="candy candy-soft grid size-11 place-items-center rounded-full p-0">
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span className="font-serif text-[22px] tracking-tight text-[var(--plum)]">
            Nudge<span className="serif-em">Me</span>
          </span>
        )}
        {step > 0 && (
          <div className="flex gap-1.5" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={cn("h-2 rounded-full transition-all duration-300", i <= step ? "w-7 bg-[#ff8f8f]" : "w-2 bg-[#ead9dc]")} />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div key={step} className="bubble nm-pop relative z-10 mx-auto mt-4 max-w-sm px-5 py-3.5 text-center text-[16px] leading-snug text-[var(--plum)] after:left-1/2 after:-translate-x-1/2" aria-live="polite">
          {SAYS[step]}
        </div>
        <Companion plants={step === 0 ? 3 : step} cheer={cheer} className={cn("w-full transition-[height] duration-500", step === 0 ? "h-[300px]" : "h-[190px]")} />
      </div>

      <div key={step} className="nm-spring-in flex flex-1 flex-col">
        {step === 0 && (
          <>
            <h1 className="mt-2 text-center font-serif text-[42px] leading-[1.03] tracking-tight text-balance text-[var(--plum)]">
              One calm step <em className="serif-em">at a time.</em>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-center text-[16px] leading-relaxed text-muted-foreground text-pretty">
              Dump everything on your mind. NudgeMe picks out one thing and makes it small enough to start. No guilt, no piles, no noise.
            </p>
            <div className="flex-1" />
            <button type="button" onClick={() => go(1)} className="candy mt-8 h-[60px] w-full text-[17px]">
              Let&apos;s begin
            </button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
              <Lock className="size-3.5" /> No sign-up. Everything stays on this device.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="clay-card relative mt-1 flex flex-1 flex-col p-2">
              <textarea
                value={interim ? dump + (dump ? "\n" : "") + interim : dump}
                onChange={(e) => {
                  setInterim("");
                  setDump(e.target.value);
                }}
                autoFocus
                placeholder={"Call the bank tomorrow\nFinish the portfolio site\nIdea: a podcast about Lagos designers\nBuy sandals"}
                aria-label="Everything on your mind"
                className="min-h-56 w-full flex-1 resize-none rounded-[1.8rem] bg-transparent p-4 text-[17px] leading-relaxed text-[var(--plum)] outline-none placeholder:text-[#b6a6bb]"
              />
              {speech.supported && (
                <button type="button" onClick={speech.toggle} className="candy candy-grape absolute right-4 bottom-4 h-12 rounded-full px-5 text-[15px]">
                  {speech.listening ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
                  {speech.listening ? "Stop" : "Talk instead"}
                </button>
              )}
            </div>
            <button type="button" onClick={sort} disabled={!dump.trim() && !interim} className="candy mt-6 h-[60px] w-full text-[17px]">
              Sort it for me
            </button>
            <button type="button" onClick={() => actions.finishOnboarding([], [])} className="mt-2 h-11 w-full text-[14px] font-medium text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <ul className="mt-1 flex-1 space-y-2.5">
              {drafts.map((d, i) => (
                <li key={d.id} className="clay-card nm-spring-in flex items-center gap-3 rounded-[1.6rem] p-4" style={{ animationDelay: `${i * 50}ms` }}>
                  <p className="flex-1 text-[16px] leading-snug font-semibold text-[var(--plum)]">{d.text}</p>
                  <button
                    type="button"
                    onClick={() => setDrafts((ds) => ds.map((x) => (x.id === d.id ? { ...x, kind: NEXT_KIND[x.kind] } : x)))}
                    aria-label={`${KIND_LABEL[d.kind]}. Tap to change.`}
                    className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors", KIND_STYLE[d.kind])}
                  >
                    {KIND_LABEL[d.kind]}
                  </button>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 pt-4">
              <button type="button" onClick={() => (tasks.length ? go(3) : finish())} className="candy h-[60px] w-full text-[17px]">
                Looks right
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <ul className="mt-1 flex-1 space-y-2.5">
              {tasks.map((d, i) => (
                <li key={d.id} className="nm-spring-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <button
                    type="button"
                    onClick={() => setPick(d.id === pick ? null : d.id)}
                    aria-pressed={pick === d.id}
                    className={cn(
                      "clay-card flex w-full items-center gap-3 rounded-[1.6rem] p-4 text-left transition-all",
                      pick === d.id && "ring-[3px] ring-[#ff8f8f] ring-offset-2 ring-offset-transparent"
                    )}
                  >
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full transition-colors", pick === d.id ? "bg-[#ff8f8f] text-white" : "bg-[#f6eef2] text-[#c9b3c0]")}>
                      <Sprout className="size-4" />
                    </span>
                    <span className="text-[16px] leading-snug font-semibold text-[var(--plum)]">{d.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 pt-4">
              <button type="button" onClick={finish} className="candy h-[60px] w-full text-[17px]">
                {pick !== null ? "Plant it and start my day" : "I'll pick later"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
