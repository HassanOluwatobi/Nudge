"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Mic, Square, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Entry, makeEntry, makeTask, parseCapture, splitDump, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { useSpeech } from "@/lib/use-speech";
import { Logo } from "./logo";

type Kind = "task" | "idea" | "note";
type Draft = { id: number; text: string; kind: Kind; raw: string };

const KINDS: { id: Kind; label: string }[] = [
  { id: "task", label: "Task" },
  { id: "idea", label: "Idea" },
  { id: "note", label: "Note" },
];

function Shell({ children, step, onBack }: { children: React.ReactNode; step: number; onBack?: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex h-10 items-center justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className="-ml-2 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <Logo />
        )}
        {step > 0 && (
          <div className="flex gap-1.5" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i <= step ? "w-6 bg-primary" : "w-1.5 bg-border")} />
            ))}
          </div>
        )}
      </div>
      <div key={step} className="nm-rise flex flex-1 flex-col">
        {children}
      </div>
    </main>
  );
}

const Primary = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    {...p}
    className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:bg-muted disabled:text-muted-foreground"
  >
    {children}
  </button>
);

export function Onboarding({ actions }: { actions: Actions }) {
  const [step, setStep] = useState(0);
  const [dump, setDump] = useState("");
  const [interim, setInterim] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const speech = useSpeech((text, final) => {
    if (final) {
      setDump((d) => (d ? d.replace(/\s*$/, "\n") : "") + text);
      setInterim("");
    } else setInterim(text);
  });

  const sort = () => {
    const all = (dump + (interim ? "\n" + interim : "")).trim();
    if (speech.listening) speech.toggle();
    const ds: Draft[] = splitDump(all)
      .map((line, i) => {
        const p = parseCapture(line);
        if (!p) return null;
        return { id: i, kind: p.kind, raw: line, text: p.kind === "task" ? p.title : p.text } as Draft;
      })
      .filter(Boolean) as Draft[];
    setDrafts(ds);
    setStep(2);
  };

  const finish = () => {
    const today = ymd();
    const tasks: Task[] = [];
    const entries: Entry[] = [];
    let mustId: string | undefined;
    for (const d of drafts) {
      if (d.kind === "task") {
        const p = parseCapture(d.raw);
        const t = makeTask(
          p && p.kind === "task"
            ? p
            : { kind: "task", title: d.text, bucket: "week", step: "Set a 10 minute timer and just begin." }
        );
        if (d.id === pick) mustId = t.id;
        tasks.push(t);
      } else entries.push(makeEntry(d.kind, d.text, today));
    }
    actions.finishOnboarding(tasks, entries, mustId);
  };

  if (step === 0)
    return (
      <Shell step={0}>
        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="font-serif text-[44px] leading-[1.02] tracking-tight text-balance sm:text-[52px]">One calm step at a time.</h1>
          <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground text-pretty">
            Dump everything on your mind. NudgeMe picks out one thing and makes it small enough to start. No guilt, no piles, no noise.
          </p>
        </div>
        <Primary onClick={() => setStep(1)}>
          Get started <ArrowRight className="size-4" />
        </Primary>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" /> No sign-up. Your data stays on this device.
        </p>
      </Shell>
    );

  if (step === 1)
    return (
      <Shell step={1} onBack={() => setStep(0)}>
        <h1 className="mt-6 font-serif text-[32px] leading-tight tracking-tight">What&apos;s on your mind?</h1>
        <p className="mt-2 text-[15px] text-muted-foreground text-pretty">
          Everything. Tasks, worries, ideas, little things. One per line, or just talk. Messy is fine.
        </p>
        <div className="relative mt-5 flex-1">
          <textarea
            value={interim ? dump + (dump ? "\n" : "") + interim : dump}
            onChange={(e) => {
              setInterim("");
              setDump(e.target.value);
            }}
            autoFocus
            placeholder={"Call the bank tomorrow\nFinish the portfolio site\nIdea: a podcast about Lagos designers\nBuy sandals"}
            aria-label="Brain dump"
            className="h-full min-h-64 w-full resize-none rounded-3xl border bg-card p-5 text-[16px] leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-ring/30"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              aria-label={speech.listening ? "Stop listening" : "Talk instead"}
              className={cn(
                "absolute right-4 bottom-4 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-sm transition-colors",
                speech.listening ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
              )}
            >
              {speech.listening ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
              {speech.listening ? "Stop" : "Talk instead"}
            </button>
          )}
        </div>
        <div className="mt-5">
          <Primary onClick={sort} disabled={!dump.trim() && !interim}>
            Sort it for me <ArrowRight className="size-4" />
          </Primary>
          <button type="button" onClick={() => actions.finishOnboarding([], [])} className="mt-2 h-11 w-full text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
        </div>
      </Shell>
    );

  if (step === 2)
    return (
      <Shell step={2} onBack={() => setStep(1)}>
        <h1 className="mt-6 font-serif text-[32px] leading-tight tracking-tight">Here&apos;s what I found.</h1>
        <p className="mt-2 text-[15px] text-muted-foreground text-pretty">Tap to change anything I guessed wrong.</p>
        <ul className="mt-5 flex-1 space-y-2">
          {drafts.map((d) => (
            <li key={d.id} className="rounded-2xl border bg-card p-3.5">
              <p className="text-[15px] leading-snug font-medium">{d.text}</p>
              <div className="mt-2.5 flex gap-1">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setDrafts((ds) => ds.map((x) => (x.id === d.id ? { ...x, kind: k.id } : x)))}
                    aria-pressed={d.kind === k.id}
                    className={cn(
                      "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                      d.kind === k.id
                        ? k.id === "task"
                          ? "bg-primary text-primary-foreground"
                          : k.id === "idea"
                            ? "bg-idea text-idea-foreground"
                            : "bg-note text-note-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-0 mt-5 bg-background pt-2">
          <Primary onClick={() => (drafts.some((d) => d.kind === "task") ? setStep(3) : finish())}>
            Looks right <ArrowRight className="size-4" />
          </Primary>
        </div>
      </Shell>
    );

  const tasks = drafts.filter((d) => d.kind === "task");
  return (
    <Shell step={3} onBack={() => setStep(2)}>
      <h1 className="mt-6 font-serif text-[32px] leading-tight tracking-tight text-balance">Pick one thing for today.</h1>
      <p className="mt-2 text-[15px] text-muted-foreground text-pretty">Just one. The rest is safe for later.</p>
      <ul className="mt-5 flex-1 space-y-2">
        {tasks.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setPick(d.id === pick ? null : d.id)}
              aria-pressed={pick === d.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                pick === d.id ? "border-primary/40 bg-accent" : "bg-card hover:border-primary/30"
              )}
            >
              <Star className={cn("size-[18px] shrink-0", pick === d.id ? "fill-primary text-primary" : "text-muted-foreground/50")} />
              <span className="text-[15px] leading-snug font-medium">{d.text}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 mt-5 bg-background pt-2">
        <Primary onClick={finish}>{pick !== null ? "Start my day" : "I'll pick later"}</Primary>
      </div>
    </Shell>
  );
}
