"use client";

import { ArrowRight, Check, ChevronDown, Pause, Play, Scissors, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { feel } from "@/lib/feedback";
import { notify } from "@/lib/reminders";
import { type Settings, type State, type Task, MAX_STEP, nextStep, smallerStep, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { BreakItDown } from "./breakdown";
import { Sheet } from "./sheet";
import { AddSubtask, SubtaskList } from "./steps";
import { burstFrom } from "./petals";
import { Tile } from "./task-row";
import { TopBar } from "./today";

const QUICK = [5, 10, 15, 25, 45];
const R = 88;
const CIRC = 2 * Math.PI * R;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const clock = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/*
  Focus answers two questions, in this order:
    1. What am I doing right now?  One subtask, big, with a single "Done, next" button.
    2. For how long?               One timer. Pick a time, Start. Pause or stop.
  Everything else (the full subtask list, adding more) is folded away below.
*/
export function Focus({
  dark,
  onTheme,
  onSettings,
  onHelp,
  state,
  actions,
  taskId,
  onPickTask,
  onFinished,
  announce,
}: {
  dark?: boolean;
  onTheme?: () => void;
  onSettings: () => void;
  onHelp: () => void;
  state: State;
  actions: Actions;
  taskId?: string;
  onPickTask: (id?: string) => void;
  onFinished: (t: Task) => void;
  announce: (s: string) => void;
}) {
  const timer = state.meta.timer;
  const activeId = timer ? timer.taskId : taskId;
  const task = activeId ? state.tasks.find((t) => t.id === activeId && t.bucket !== "done") : undefined;
  const [picker, setPicker] = useState(false);

  const finish = () => {
    if (!task) return;
    if (timer) actions.stopTimer();
    actions.finish(task.id);
    onFinished(task);
  };

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto w-full max-w-md px-5 pb-36 safe-t">
        {/* What you are focusing on. Tap to switch. */}
        <TopBar
          dark={dark}
          onTheme={onTheme}
          onSettings={onSettings}
          onHelp={onHelp}
          title={
            <span className="block min-w-0">
              <span className="block text-[13px] font-medium text-ink-3">Focusing on</span>
              <button type="button" onClick={() => setPicker(true)} className="flex max-w-full items-center gap-1.5 text-left" aria-label="Choose what to focus on">
                {task && <Tile task={task} size={26} />}
                <span className="truncate font-serif text-[24px] leading-tight tracking-[-0.01em]">{task ? task.title : "Just a timer"}</span>
                <ChevronDown className="size-4 shrink-0 text-ink-3" />
              </button>
            </span>
          }
        />

        {task ? <NowCard task={task} actions={actions} ai={state.settings.ai} onFinish={finish} announce={announce} /> : <NoTaskCard onPick={() => setPicker(true)} />}

        <TimerCard state={state} actions={actions} task={task} announce={announce} />

        {task && <MoreSubtasks task={task} actions={actions} onFinish={finish} />}
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Focus on">
        <ul className="mt-2">
          {todayTasks(state, ymd()).map((t) => (
            <li key={t.id}>
              <button type="button" className="row" onClick={() => (onPickTask(t.id), setPicker(false))}>
                <Tile task={t} />
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                {t.id === task?.id && <Check className="size-5 text-signal-ink" />}
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="row" onClick={() => (onPickTask(undefined), setPicker(false))}>
              <span className="grid size-10 place-items-center rounded-[12px] bg-white text-[18px] ring-1 ring-line">⏱</span>
              <span className="flex-1 font-medium">Just a timer, no task</span>
              {!task && <Check className="size-5 text-signal-ink" />}
            </button>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}

/** 1. The one thing to do now. */
function NowCard({ task, actions, ai, onFinish, announce }: { task: Task; actions: Actions; ai: Settings["ai"]; onFinish: () => void; announce: (s: string) => void }) {
  const current = nextStep(task);
  const n = task.steps.length;
  const k = task.steps.filter((s) => s.d).length;
  const [smaller, setSmaller] = useState<string | null>(null);
  const doneBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => setSmaller(null), [current?.id]);

  const tick = () => {
    if (!current) return;
    actions.toggleStep(task.id, current.id);
    feel("step", "success");
    burstFrom(doneBtn.current, 10);
    announce(k + 1 === n ? "That was the last one." : "Nice. Next one.");
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] bg-white p-5 ring-1 ring-line" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {n > 0 && current ? (
          <motion.div key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }}>
            <div className="flex items-center justify-between">
              <p className="t-label text-signal-ink">Now</p>
              <p className="t-small tabular-nums text-ink-3">
                {k + 1} of {n}
              </p>
            </div>
            {smaller === null ? (
              <>
                <p className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.01em] [overflow-wrap:anywhere]">{current.t}</p>
                <button ref={doneBtn} type="button" className="btn btn-signal mt-5 w-full text-[17px]" onClick={tick}>
                  <Check className="size-5" /> {k + 1 === n ? "Done" : "Done, next"}
                </button>
                <button type="button" className="btn btn-quiet mx-auto mt-1 flex min-h-10 gap-1.5 text-[14px]" onClick={() => setSmaller(smallerStep(current.t))}>
                  <Scissors className="size-4" /> Still too big? Shrink it
                </button>
              </>
            ) : (
              <form
                className="mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!smaller.trim()) return;
                  actions.replaceStep(task.id, current.id, smaller);
                  setSmaller(null);
                  feel("save", "light");
                  announce("Subtask made smaller.");
                }}
              >
                <label className="t-small font-medium text-ink-2" htmlFor="smaller">
                  Here is a smaller way in. Change it if you like.
                </label>
                <input id="smaller" value={smaller} maxLength={MAX_STEP} onChange={(e) => setSmaller(e.target.value)} className="field mt-2" autoFocus />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-line min-h-11 text-[15px]" onClick={() => setSmaller(null)}>
                    Keep mine
                  </button>
                  <button type="submit" className="btn btn-signal min-h-11 text-[15px]">
                    Use this
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        ) : n > 0 ? (
          <motion.div key="all" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}>
            <p className="t-label text-signal-ink">All done</p>
            <p className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.01em]">Tick the whole thing off?</p>
            <button type="button" className="btn btn-signal mt-5 w-full text-[17px]" onClick={onFinish}>
              <Check className="size-5" /> Finish the task
            </button>
          </motion.div>
        ) : (
          <motion.div key="none" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }}>
            <p className="t-label text-signal-ink">Now</p>
            <p className="mt-2 font-serif text-[24px] leading-tight tracking-[-0.01em]">Not sure where to start?</p>
            <p className="t-small mt-1 text-ink-3">Let your AI split it into tiny steps. Then you just do the first one.</p>
            <div className="mt-4">
              <BreakItDown task={task} actions={actions} ai={ai} announce={announce} />
            </div>
            <p className="t-small mt-5 text-ink-3">Or write the first step yourself.</p>
            <div className="task-row mt-2">
              <AddSubtask onAdd={(t) => actions.addStep(task.id, t)} placeholder="Open the laptop" />
            </div>
            <button type="button" className="btn btn-line mt-3 w-full" onClick={onFinish}>
              <Check className="size-4" /> Finish the task
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function NoTaskCard({ onPick }: { onPick: () => void }) {
  return (
    <section className="mt-5 rounded-[24px] bg-white p-5 ring-1 ring-line">
      <p className="t-label text-signal-ink">Now</p>
      <p className="mt-2 font-serif text-[24px] leading-tight tracking-[-0.01em]">Just you and a timer.</p>
      <p className="t-small mt-1 text-ink-3">Pick a time below. Or choose a task and take it one step at a time.</p>
      <button type="button" className="btn btn-line mt-4 w-full" onClick={onPick}>
        Choose a task <ArrowRight className="size-4" />
      </button>
    </section>
  );
}

/** 2. One timer. Pick a time, Start. Then pause, add five minutes, or stop. */
function TimerCard({ state, actions, task, announce }: { state: State; actions: Actions; task?: Task; announce: (s: string) => void }) {
  const timer = state.meta.timer;
  const [mins, setMins] = useState(15);
  const running = !!timer && timer.pausedLeft === undefined;
  const paused = !!timer && timer.pausedLeft !== undefined;
  const now = useNow(running);
  const left = timer ? (timer.pausedLeft ?? timer.end - now) : mins * 60_000;
  const total = timer ? timer.mins * 60_000 : mins * 60_000;
  const over = !!timer && left <= 0;
  const frac = timer ? Math.max(0, Math.min(1, left / total)) : 1;

  // Ring the bell once when time runs out.
  const rang = useRef<number | null>(null);
  useEffect(() => {
    if (timer && running && left <= 0 && rang.current !== timer.end) {
      rang.current = timer.end;
      if (left > -60_000) {
        feel("end", "warning");
        if (document.hidden) notify("Time is up", task ? `Nice work on: ${task.title}` : "Your focus time is done.");
      }
      announce("Time is up.");
    }
  }, [left, running, timer, task, announce]);

  const label = !timer ? "Ready" : over ? "Time is up" : paused ? "Paused" : `Ends ${clock(timer.end)}`;

  return (
    <section className="mt-3 rounded-[24px] bg-white p-5 ring-1 ring-line" aria-label="Timer">
      <div className="flex items-center gap-5">
        <div className="relative size-[132px] shrink-0">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
            <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="14" />
            <motion.circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={paused ? "var(--ink-3)" : "var(--signal)"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={false}
              animate={{ strokeDashoffset: CIRC * (1 - frac) }}
              transition={timer ? { duration: 0.3, ease: "linear" } : { type: "spring", bounce: 0, duration: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-serif text-[34px] leading-none tabular-nums tracking-[-0.02em]" role="timer" aria-live="off">
                {over ? "0:00" : fmt(left)}
              </p>
              <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${paused || over ? "text-signal-ink" : "text-ink-3"}`}>{label}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {!timer ? (
            <>
              <p className="t-small text-ink-3">How long? Short is fine.</p>
              <button
                type="button"
                className="btn btn-ink mt-2 w-full"
                onClick={() => {
                  actions.startTimer(mins, task?.id);
                  feel("start", "medium");
                  announce(`${mins} minute timer started.`);
                }}
              >
                <Play className="size-5" /> Start
              </button>
            </>
          ) : over ? (
            <div className="grid gap-2">
              <button type="button" className="btn btn-ink" onClick={() => (actions.startTimer(5, timer.taskId), feel("start", "light"))}>
                5 more min
              </button>
              <button type="button" className="btn btn-line" onClick={() => (actions.stopTimer(), announce("Timer closed."))}>
                Stop here
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <button type="button" className={`btn ${paused ? "btn-signal" : "btn-ink"}`} onClick={() => (paused ? actions.resumeTimer() : actions.pauseTimer(), feel("tap", "light"))}>
                {paused ? (
                  <>
                    <Play className="size-5" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-5" /> Pause
                  </>
                )}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-line min-h-11 px-2 text-[14px]" onClick={() => (actions.addMinute(5), feel("tick", "light"), announce("Five minutes added."))}>
                  +5 min
                </button>
                <button type="button" className="btn btn-line min-h-11 gap-1.5 px-2 text-[14px]" onClick={() => (actions.stopTimer(), feel("undo", "light"), announce("Timer stopped."))}>
                  <Square className="size-3.5" /> Stop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {!timer && (
        <div className="mt-4 grid grid-cols-5 gap-1.5" role="group" aria-label="Minutes">
          {QUICK.map((m) => (
            <button key={m} type="button" aria-pressed={mins === m} onClick={() => (setMins(m), feel("tick", "light"))} className="chip min-h-10 justify-center px-0 text-[14px] font-semibold">
              {m}m
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** 3. Folded away: the full list of subtasks, and finishing early. */
function MoreSubtasks({ task, actions, onFinish }: { task: Task; actions: Actions; onFinish: () => void }) {
  const [open, setOpen] = useState(false);
  const n = task.steps.length;
  const k = task.steps.filter((s) => s.d).length;
  const allDone = n > 0 && k === n;
  if (!n) return null;
  return (
    <section className="mt-6">
      <button type="button" className="flex w-full items-center justify-between px-1" aria-expanded={open} onClick={() => (setOpen((v) => !v), feel("tap"))}>
        <span className="text-[15px] font-semibold">
          All subtasks <span className="font-medium tabular-nums text-ink-3">{k}/{n}</span>
        </span>
        <ChevronDown className={`size-5 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden">
            <div className="pt-3">
              <SubtaskList task={task} actions={actions} suggest={false} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!allDone && (
        <button type="button" className="btn btn-quiet mx-auto mt-4 flex min-h-10 gap-1.5 text-[14px]" onClick={onFinish}>
          <Check className="size-4" /> Finish the whole task now
        </button>
      )}
    </section>
  );
}
