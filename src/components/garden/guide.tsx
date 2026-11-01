"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Mic, Sprout, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Entry, makeEntry, makeTask, parseCapture, prettyDue, splitDump, suggestStep, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { useSpeech } from "@/lib/use-speech";
import { Companion } from "./companion";

type Kind = "task" | "idea" | "note";
type Draft = { id: number; text: string; kind: Kind; raw: string; due?: string };
const NEXT_KIND: Record<Kind, Kind> = { task: "idea", idea: "note", note: "task" };
const KIND_STYLE: Record<Kind, string> = {
  task: "bg-[#ffe6dc] text-[#d4553f]",
  idea: "bg-[#fff1cc] text-[#a7741a]",
  note: "bg-[#efe9ff] text-[#6b4fd8]",
};
const KIND_LABEL: Record<Kind, string> = { task: "To do", idea: "Idea", note: "Note" };
const DRAFT_KEY = "nudgeme.draft";

const SAYS = [
  "Hi, I'm Nudge! I help you do one calm thing at a time.",
  "Write everything you need to do. One thing on each line. Spelling doesn't matter.",
  "Here's what I found. Tap a label if it's wrong.",
  "Choose one thing for today. I'll keep the rest safe.",
];

/** First run. Nudge walks you through it: write it all down, check, choose one. */
export function Guide({ actions }: { actions: Actions }) {
  const [step, setStepRaw] = useState(0);
  const [dump, setDump] = useState("");
  const [interim, setInterim] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [cheer, setCheer] = useState(0);
  const [hint, setHint] = useState("");
  const [typing, setTyping] = useState(false);
  const busy = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeech((text, final) => {
    if (final) {
      setDump((d) => (d ? d.replace(/\s*$/, "\n") : "") + text);
      setInterim("");
    } else setInterim(text);
  });

  // Keep what was typed if the page reloads.
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) {
        setDump(d);
        setStepRaw(1);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (dump.trim()) localStorage.setItem(DRAFT_KEY, dump);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [dump]);

  // The phone's Back button goes back one step.
  useEffect(() => {
    const onPop = () => setStepRaw((s) => Math.max(0, s - 1));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (n: number) => {
    if (n > step) history.pushState({ guide: n }, "");
    setStepRaw(n);
    setCheer((c) => c + 1);
    setHint("");
    setTyping(false);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    if (history.state?.guide) history.back();
    else setStepRaw((s) => Math.max(0, s - 1));
  };

  const finish = (ds: Draft[], mustDraft: number | null) => {
    if (busy.current) return;
    busy.current = true;
    const today = ymd();
    const tasks: Task[] = [];
    const entries: Entry[] = [];
    let mustId: string | undefined;
    for (const d of ds) {
      if (d.kind === "task") {
        const p = parseCapture(d.raw);
        const t = makeTask(p && p.kind === "task" ? p : { kind: "task", title: d.text, bucket: "week", step: suggestStep(d.text) });
        if (d.id === mustDraft) mustId = t.id;
        tasks.push(t);
      } else entries.push(makeEntry(d.kind, d.text, today));
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    actions.finishOnboarding(tasks, entries, mustId);
  };

  const sort = () => {
    const all = (dump + (interim ? "\n" + interim : "")).trim();
    if (speech.listening) speech.toggle();
    if (!all) {
      setHint("Type at least one thing first. For example: call mum.");
      area.current?.focus();
      return;
    }
    const seen = new Set<string>();
    const ds = splitDump(all)
      .map((line, i) => {
        const p = parseCapture(line);
        if (!p) return null;
        const text = p.kind === "task" ? p.title : p.text;
        if (seen.has(text.toLowerCase())) return null;
        seen.add(text.toLowerCase());
        return { id: i, kind: p.kind, raw: line, text, due: p.kind === "task" ? p.due : undefined } as Draft;
      })
      .filter(Boolean)
      .slice(0, 60) as Draft[];
    if (!ds.length) {
      setHint("I couldn't find a task in that. Try a few words, like: buy airtime.");
      return;
    }
    // Just one thing? Skip the extra screens and start.
    if (ds.length === 1 && ds[0].kind === "task") {
      finish(ds, ds[0].id);
      return;
    }
    setDrafts(ds);
    go(2);
  };

  const tasks = drafts.filter((d) => d.kind === "task");
  const toPick = () => {
    if (!tasks.length) return finish(drafts, null);
    if (tasks.length === 1) return finish(drafts, tasks[0].id);
    // Suggest the one due soonest, so the big button always means "start".
    const first = [...tasks].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))[0];
    setPick(first.id);
    go(3);
  };

  const compact = step > 0 && typing;

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex h-11 items-center justify-between">
        {step > 0 ? (
          <button type="button" onClick={back} aria-label="Back" className="candy candy-soft grid size-11 place-items-center rounded-full p-0">
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

      <div className={cn("relative", compact && "hidden")}>
        <div key={step} className="bubble nm-pop relative z-10 mx-auto mt-3 max-w-sm px-5 py-3 text-center text-[16px] leading-snug text-[var(--plum)] after:left-1/2 after:-translate-x-1/2" aria-live="polite">
          {SAYS[step]}
        </div>
        <Companion
          plants={step === 0 ? 3 : step}
          cheer={cheer}
          className={cn("w-full transition-[height] duration-500", step === 0 ? "h-[clamp(140px,calc(100dvh-470px),300px)]" : "h-[clamp(90px,calc(100dvh-600px),190px)]")}
        />
      </div>

      <div key={step} className="nm-spring-in flex flex-1 flex-col">
        {step === 0 && (
          <>
            <h1 className="mt-1 text-center font-serif text-[36px] leading-[1.03] tracking-tight text-balance text-[var(--plum)] min-[400px]:text-[42px]">
              One calm step <em className="serif-em">at a time.</em>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-center text-[16px] leading-relaxed text-muted-foreground text-pretty">
              Write down everything on your mind. NudgeMe chooses one thing and makes it small enough to start. No guilt. No long lists.
            </p>
            <div className="min-h-4 flex-1" />
            <button type="button" onClick={() => go(1)} className="candy mt-4 h-[60px] w-full text-[17px]">
              Let&apos;s begin
            </button>
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
              <Lock className="size-3.5" /> Free. No sign-up. Your list stays on this phone.
              <Link href="/privacy" className="font-semibold text-[var(--plum)] underline underline-offset-2">
                Privacy
              </Link>
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="clay-card relative mt-1 flex flex-1 flex-col p-2">
              <textarea
                ref={area}
                value={interim ? dump + (dump ? "\n" : "") + interim : dump}
                onChange={(e) => {
                  setInterim("");
                  setHint("");
                  setDump(e.target.value.slice(0, 8000));
                }}
                onFocus={() => setTyping(true)}
                onBlur={() => setTimeout(() => setTyping(false), 150)}
                placeholder={"For example:\ncall mum tomorrow\nfinish history homework\nbuy airtime"}
                aria-label="Everything on your mind"
                className="min-h-44 w-full flex-1 resize-none rounded-[1.8rem] bg-transparent p-4 pb-16 text-[17px] leading-relaxed text-[var(--plum)] outline-none placeholder:text-[#c4b6c8] placeholder:italic"
              />
              {speech.supported && (
                <button
                  type="button"
                  onClick={speech.toggle}
                  aria-pressed={speech.listening}
                  className={cn("candy absolute right-4 bottom-4 h-12 rounded-full px-5 text-[15px]", speech.listening ? "candy-grape" : "candy-soft")}
                >
                  {speech.listening ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
                  {speech.listening ? "Stop" : "Speak"}
                </button>
              )}
              {speech.listening && (
                <p className="absolute bottom-6 left-6 flex items-center gap-2 text-[14px] font-semibold text-[#6b4fd8]" aria-live="polite">
                  <span className="size-2.5 animate-pulse rounded-full bg-[#e8664f]" /> Listening. Speak now.
                </p>
              )}
            </div>
            {hint && (
              <p className="mt-3 text-center text-[15px] font-medium text-[#d4553f]" role="alert">
                {hint}
              </p>
            )}
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={sort} className="candy mt-4 h-[60px] w-full text-[17px]">
              Sort it for me
            </button>
            <div className="mt-1 flex items-center justify-between">
              <button type="button" onClick={() => finish([], null)} className="h-11 px-2 text-[14px] font-medium text-muted-foreground hover:text-foreground">
                Skip for now
              </button>
              {speech.supported && <p className="text-right text-[12px] text-muted-foreground">Speaking uses your browser&apos;s voice typing.</p>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="mt-1 mb-2 text-center text-[13px] text-muted-foreground">To do = goes on your list. Idea and Note = saved for later.</p>
            <ul className="flex-1 space-y-2.5 pb-24">
              {drafts.map((d, i) => (
                <li key={d.id} className="clay-card nm-spring-in flex items-center gap-3 rounded-[1.6rem] p-4" style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 text-[16px] leading-snug font-semibold [overflow-wrap:anywhere] text-[var(--plum)]">{d.text}</p>
                    {d.due && d.kind === "task" && <p className="mt-0.5 text-[13px] text-muted-foreground">Due {prettyDue(d.due).replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrafts((ds) => ds.map((x) => (x.id === d.id ? { ...x, kind: NEXT_KIND[x.kind] } : x)))}
                    aria-label={`${KIND_LABEL[d.kind]}. Tap to change.`}
                    className={cn("h-11 min-w-[72px] shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors", KIND_STYLE[d.kind])}
                  >
                    {KIND_LABEL[d.kind]}
                  </button>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[var(--sky-2)] via-[var(--sky-2)]/95 to-transparent px-5 pt-6 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={toPick} className="candy h-[60px] w-full text-[17px]">
                Looks right
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <ul className="mt-1 flex-1 space-y-2.5 pb-28">
              {tasks.map((d, i) => (
                <li key={d.id} className="nm-spring-in" style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
                  <button
                    type="button"
                    onClick={() => setPick(d.id)}
                    aria-pressed={pick === d.id}
                    className={cn(
                      "clay-card flex w-full items-center gap-3 rounded-[1.6rem] p-4 text-left transition-all",
                      pick === d.id && "ring-[3px] ring-[#ff8f8f] ring-offset-2 ring-offset-transparent"
                    )}
                  >
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full transition-colors", pick === d.id ? "bg-[#ff8f8f] text-white" : "bg-[#f6eef2] text-[#c9b3c0]")}>
                      <Sprout className="size-4" />
                    </span>
                    <span className="line-clamp-3 text-[16px] leading-snug font-semibold [overflow-wrap:anywhere] text-[var(--plum)]">{d.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[var(--sky-2)] via-[var(--sky-2)]/95 to-transparent px-5 pt-6 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => finish(drafts, pick)} className="candy h-[60px] w-full text-[17px]">
                Start with this one
              </button>
              <button type="button" onClick={() => finish(drafts, null)} className="h-11 w-full text-[14px] font-medium text-muted-foreground hover:text-foreground">
                I&apos;ll choose later
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
