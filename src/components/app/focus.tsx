"use client";

import { Check, Pause, Play, Sparkles, Timer, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type State, type Task, MAX_STEP, smallerStep, suggestStep } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Field } from "./motifs";
import { Thread, pullFor } from "./thread";

type Mode = "step" | "choose" | "next" | "smaller";

const swap = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

/** Focus: one task, one step, nothing else on screen. */
export function Focus({
  task,
  state,
  actions,
  onPause,
  onFinished,
  announce,
}: {
  task: Task;
  state: State;
  actions: Actions;
  onPause: () => void;
  onFinished: (t: Task) => void;
  announce: (s: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(task.step ? "step" : "choose");
  const [draft, setDraft] = useState("");
  const [timerOpen, setTimerOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (mode !== "step") requestAnimationFrame(() => field.current?.focus());
  }, [mode]);

  const timer = state.meta.timer?.taskId === task.id ? state.meta.timer : undefined;

  const doStep = () => {
    const before = task.step;
    actions.stepDone(task.id, "");
    setDraft("");
    setMode("next");
    announce("Step done. The task is still open.");
    toast("Step done.", { duration: 3000, action: { label: "Undo", onClick: () => (actions.undoStep(task.id, before), setMode("step")) } });
  };

  const setStep = (s: string) => {
    const v = s.trim();
    if (!v) return;
    actions.edit(task.id, { step: v });
    setMode("step");
    announce(`Next step: ${v}`);
  };

  const finish = () => {
    actions.finish(task.id);
    onFinished(task);
  };

  const stepNo = task.steps + 1;

  return (
    <Field tone="focus" stipple={false} grain={0} className="on-night min-h-dvh text-paper">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-t safe-b">
        <header className="flex items-center justify-between py-2">
          <button type="button" className="btn btn-night-quiet min-h-11 gap-1.5 px-4 text-[15px]" onClick={onPause}>
            <Pause className="size-4" /> Pause
          </button>
          <button
            type="button"
            className="btn btn-night-quiet min-h-11 gap-1.5 px-4 text-[15px]"
            aria-expanded={timerOpen}
            aria-controls="timer"
            onClick={() => setTimerOpen((v) => !v)}
          >
            <Timer className="size-4" /> {timer ? <TimeLeft end={timer.end} paused={timer.pausedLeft} /> : "Timer"}
          </button>
        </header>

        <TimerBell timer={timer} />
        <AnimatePresence initial={false}>
          {timerOpen && (
            <motion.div id="timer" key="timer" {...swap} className="mt-2 rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md">
              <TimerPanel task={task} timer={timer} actions={actions} onDone={() => setTimerOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex flex-1 flex-col justify-center py-8">
          <Thread pull={pullFor(task.steps)} tone="night" className="h-10 w-full max-w-[240px]" label={`${task.steps} steps done on this task`} />
          <p className="mt-6 text-[15px] text-paper/60 [overflow-wrap:anywhere]">{task.title}</p>

          <AnimatePresence mode="wait" initial={false}>
            {mode === "step" && (
              <motion.div key={`step-${task.step}`} {...swap}>
                <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-moon">Step {stepNo}</p>
                <h1 ref={heading} tabIndex={-1} className="mt-2 t-title text-[34px] focus:outline-none">
                  {task.step}
                </h1>
                <button type="button" className="btn btn-white mt-8 w-full text-[17px]" onClick={doStep}>
                  <Check className="size-5" strokeWidth={2.5} /> Do this step
                </button>
                <p className="mt-2 text-center text-[13px] text-paper/50">Tap when you have done it.</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn btn-night-quiet text-[15px]"
                    onClick={() => {
                      setDraft(smallerStep(task.step));
                      setMode("smaller");
                    }}
                  >
                    Make it smaller
                  </button>
                  <button type="button" className="btn btn-night-quiet text-[15px]" onClick={finish}>
                    Finish this task
                  </button>
                </div>
              </motion.div>
            )}

            {(mode === "choose" || mode === "next" || mode === "smaller") && (
              <motion.form
                key={mode}
                {...swap}
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(draft);
                }}
              >
                <h1 ref={heading} tabIndex={-1} className="t-title mt-6 text-[30px] focus:outline-none">
                  {mode === "next" ? "Nice. What is next?" : mode === "smaller" ? "A smaller step" : "What is the first step?"}
                </h1>
                <p className="mt-2 text-[15px] text-paper/60">
                  {mode === "next"
                    ? "Write the next small step. Or finish the task if that was the last of it."
                    : mode === "smaller"
                      ? "Change it however you like. It only replaces your step when you say so."
                      : "Pick something you could do in a few minutes."}
                </p>
                <label htmlFor="focus-step" className="sr-only">
                  Step
                </label>
                <input
                  id="focus-step"
                  ref={field}
                  value={draft}
                  maxLength={MAX_STEP}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="The smallest thing you could do"
                  className="mt-5 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-paper placeholder:text-paper/40 focus:border-moon focus:outline-none"
                />
                {!draft && mode !== "smaller" && (
                  <button
                    type="button"
                    className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-left text-[14px] text-paper/80"
                    onClick={() => setDraft(suggestStep(task.title))}
                  >
                    <Sparkles className="size-3.5 shrink-0 text-moon" /> Try: {suggestStep(task.title)}
                  </button>
                )}
                <button type="submit" className="btn btn-white mt-6 w-full text-[17px]" disabled={!draft.trim()}>
                  {mode === "smaller" ? "Use this step" : "Set this step"}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {mode === "smaller" ? (
                    <button type="button" className="btn btn-night-quiet col-span-2 text-[15px]" onClick={() => setMode("step")}>
                      Keep my step
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-night-quiet text-[15px]" onClick={onPause}>
                        Stop for now
                      </button>
                      <button type="button" className="btn btn-night-quiet text-[15px]" onClick={finish}>
                        Finish this task
                      </button>
                    </>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </main>
      </div>
    </Field>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  return now;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function TimeLeft({ end, paused }: { end: number; paused?: number }) {
  const now = useNow(paused === undefined);
  const left = paused ?? end - now;
  return <span className="tabular-nums">{left <= 0 ? "Time is up" : fmt(left)}</span>;
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
    navigator.vibrate?.(120);
  } catch {}
}

/** Rings once when the timer runs out, wherever the panel is. */
function TimerBell({ timer }: { timer?: State["meta"]["timer"] }) {
  const running = !!timer && timer.pausedLeft === undefined;
  const now = useNow(running);
  const left = timer ? timer.pausedLeft ?? timer.end - now : 1;
  const rang = useRef<number | null>(null);
  useEffect(() => {
    if (timer && running && left <= 0 && rang.current !== timer.end) {
      rang.current = timer.end;
      // Only ring if it ran out in the last minute, not on a reopen hours later.
      if (left > -60_000) chime();
      toast("Time is up. Keep going, or stop here. Both are fine.");
    }
  }, [left, running, timer]);
  return null;
}

function TimerPanel({ task, timer, actions, onDone }: { task: Task; timer?: State["meta"]["timer"]; actions: Actions; onDone: () => void }) {
  const running = !!timer && timer.pausedLeft === undefined;
  const now = useNow(running);
  const left = timer ? timer.pausedLeft ?? timer.end - now : 0;

  if (!timer)
    return (
      <div>
        <p className="text-[15px] text-paper/80">A timer is optional. Pick a length.</p>
        <div className="mt-3 flex gap-2">
          {[5, 10, 25].map((m) => (
            <button
              key={m}
              type="button"
              className="btn btn-night-quiet min-h-11 flex-1 px-0 text-[15px]"
              onClick={() => {
                actions.startTimer(task.id, m);
                onDone();
              }}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
    );

  const pct = Math.max(0, Math.min(1, left / (timer.mins * 60_000)));
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid size-16 shrink-0 place-items-center rounded-full"
        aria-hidden
        style={{ background: `conic-gradient(from -90deg, var(--cyan), var(--lime), var(--peach), var(--pink) ${pct * 100}%, rgb(255 255 255 / 0.1) 0)` }}
      >
        <div className="size-[52px] rounded-full bg-night" />
      </div>
      <div className="flex-1">
        <p className="text-[22px] font-semibold tabular-nums" role="timer" aria-live="off">
          {left <= 0 ? "Time is up" : fmt(left)}
        </p>
        <p className="text-[13px] text-paper/55">{timer.mins} minute timer</p>
      </div>
      {left > 0 && (
        <button type="button" className="icon-btn text-paper" aria-label={running ? "Pause timer" : "Resume timer"} onClick={() => (running ? actions.pauseTimer() : actions.resumeTimer())}>
          {running ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
      )}
      <button type="button" className="icon-btn text-paper" aria-label="Stop timer" onClick={() => actions.stopTimer()}>
        <X className="size-5" />
      </button>
    </div>
  );
}
