"use client";

import { Check, ChevronDown, Pause, Play, Plus, Scissors, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/lib/reminders";
import { type State, type Task, MAX_STEP, nextStep, smallerStep, suggestStep, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Art } from "./art";
import { Sheet } from "./sheet";
import { Tile } from "./task-row";

const R = 118;
const CIRC = 2 * Math.PI * R;
const QUICK = [5, 10, 15, 25, 45];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 250) {
        last = t;
        setNow(Date.now());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return now;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const clock = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [523, 659, 784].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.75);
    });
    navigator.vibrate?.([120, 80, 120]);
  } catch {}
}

/** Focus: a ring timer around a small painting, then the steps. After Tiimo. */
export function Focus({
  state,
  actions,
  taskId,
  onPickTask,
  onFinished,
  announce,
}: {
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
  const [mins, setMins] = useState(task?.mins && task.mins <= 60 ? task.mins : 15);
  const [picker, setPicker] = useState(false);
  const running = !!timer && timer.pausedLeft === undefined;
  const now = useNow(running);
  const left = timer ? (timer.pausedLeft ?? timer.end - now) : mins * 60_000;
  const total = timer ? timer.mins * 60_000 : 60 * 60_000;
  const frac = timer ? Math.max(0, Math.min(1, left / total)) : mins / 60;
  const over = !!timer && left <= 0;

  // Ring the bell once when time runs out.
  const rang = useRef<number | null>(null);
  useEffect(() => {
    if (timer && running && left <= 0 && rang.current !== timer.end) {
      rang.current = timer.end;
      if (left > -60_000) {
        chime();
        if (document.hidden) notify("Time is up", task ? `Nice work on: ${task.title}` : "Your focus time is done.");
      }
      announce("Time is up.");
    }
  }, [left, running, timer, task, announce]);

  // Drag around the ring to set minutes.
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const setFromPointer = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    let deg = (a * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    const m = Math.max(5, Math.min(60, Math.round((deg / 360) * 60 / 5) * 5 || 60));
    if (m !== mins) navigator.vibrate?.(4);
    setMins(m);
  };

  const knobAngle = frac * 2 * Math.PI - Math.PI / 2;
  const kx = 140 + R * Math.cos(knobAngle);
  const ky = 140 + R * Math.sin(knobAngle);
  const step = task ? nextStep(task) : undefined;

  return (
    <div className="on-night min-h-dvh bg-night text-white">
      <div className="mx-auto w-full max-w-md px-5 pb-36 safe-t">
        <header className="flex items-center justify-between py-2">
          <button type="button" onClick={() => setPicker(true)} className="flex h-10 max-w-[70%] items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] pl-1.5 pr-3 text-[14px] font-medium" aria-label="Choose what to focus on">
            {task ? <Tile task={task} size={28} /> : <span className="grid size-7 place-items-center rounded-full bg-white/10 text-[13px]">⏱</span>}
            <span className="truncate">{task ? task.title : "Just a timer"}</span>
            <ChevronDown className="size-4 shrink-0 text-white/60" />
          </button>
          {timer && (
            <button type="button" className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.06]" aria-label="Stop timer" onClick={() => (actions.stopTimer(), announce("Timer stopped."))}>
              <X className="size-4" />
            </button>
          )}
        </header>

        <h1 className="mt-6 text-center font-serif text-[40px] leading-none tracking-[-0.02em]">{timer ? (over ? "Time is up" : "Focus") : "Focus"}</h1>
        <p className="t-small mt-2 text-center text-white/60">{timer && !over ? `${clock(timer.end - timer.mins * 60_000)} → ${clock(timer.pausedLeft !== undefined ? now + timer.pausedLeft : timer.end)}` : timer ? "Keep going, or stop here. Both are fine." : "Drag the ring, or pick a time."}</p>

        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[300px]">
          <svg
            ref={svg}
            viewBox="0 0 280 280"
            className={`absolute inset-0 h-full w-full ${timer ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
            onPointerDown={(e) => {
              if (timer) return;
              dragging.current = true;
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              setFromPointer(e);
            }}
            onPointerMove={(e) => dragging.current && setFromPointer(e)}
            onPointerUp={() => (dragging.current = false)}
            role={timer ? "img" : "slider"}
            aria-label={timer ? `${fmt(left)} left` : "Focus minutes"}
            aria-valuemin={timer ? undefined : 5}
            aria-valuemax={timer ? undefined : 60}
            aria-valuenow={timer ? undefined : mins}
            tabIndex={timer ? -1 : 0}
            onKeyDown={(e) => {
              if (timer) return;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") setMins((m) => Math.min(60, m + 5));
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") setMins((m) => Math.max(5, m - 5));
            }}
          >
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#19d3e6" />
                <stop offset="50%" stopColor="#c3ef6e" />
                <stop offset="100%" stopColor="#ffb98a" />
              </linearGradient>
            </defs>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="22" />
            <motion.circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={over ? "#ff9bd6" : "url(#ring)"}
              strokeWidth="22"
              strokeLinecap="round"
              transform="rotate(-90 140 140)"
              strokeDasharray={CIRC}
              initial={false}
              animate={{ strokeDashoffset: CIRC * (1 - (over ? 1 : frac)) }}
              transition={timer ? { duration: 0.3, ease: "linear" } : { type: "spring", bounce: 0, duration: 0.3 }}
            />
            {!over && <circle cx={kx} cy={ky} r="13" fill="#fff" className="drop-shadow" />}
          </svg>
          {/* The painting sits inside the ring. */}
          <div className="absolute inset-[17%] overflow-hidden rounded-full">
            <Art mode={2} />
            <div className="absolute inset-0 grid place-items-center bg-night/25">
              {timer ? (
                task?.emoji ? <span className="text-[44px] drop-shadow-lg">{task.emoji}</span> : null
              ) : (
                <div className="text-center">
                  <span className="block font-serif text-[64px] leading-none drop-shadow-[0_2px_12px_rgb(6_11_43/0.6)]">{mins}</span>
                  <span className="text-[12px] font-semibold tracking-[0.14em] text-white/85">MINS</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {timer ? (
          <>
            <p className="mt-6 text-center font-serif text-[64px] leading-none tabular-nums tracking-[-0.02em]" role="timer" aria-live="off">
              {over ? "0:00" : fmt(left)}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {over ? (
                <>
                  <button type="button" className="btn btn-glass" onClick={() => actions.startTimer(5, timer.taskId)}>
                    +5 min
                  </button>
                  <button type="button" className="btn btn-white" onClick={() => (actions.stopTimer(), announce("Timer closed."))}>
                    Done for now
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-quiet text-[16px] font-semibold text-white" onClick={() => actions.addMinute()}>
                    +1 min
                  </button>
                  <button type="button" className="btn btn-white min-w-[96px]" aria-label={running ? "Pause" : "Resume"} onClick={() => (running ? actions.pauseTimer() : actions.resumeTimer())}>
                    {running ? <Pause className="size-5" /> : <Play className="size-5" />}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex justify-center gap-2" role="group" aria-label="Quick times">
              {QUICK.map((m) => (
                <button key={m} type="button" aria-pressed={mins === m} onClick={() => setMins(m)} className={`h-10 min-w-12 rounded-full px-3 text-[14px] font-semibold transition-colors ${mins === m ? "bg-white text-night" : "border border-white/15 bg-white/[0.06] text-white/85"}`}>
                  {m}m
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-white mx-auto mt-6 flex w-full max-w-[240px] text-[17px]"
              onClick={() => {
                actions.startTimer(mins, task?.id);
                announce(`${mins} minute timer started.`);
              }}
            >
              <Play className="size-5" /> Start
            </button>
          </>
        )}

        {task && <Steps task={task} actions={actions} onFinished={onFinished} announce={announce} />}
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Focus on">
        <ul className="mt-2">
          <li>
            <button type="button" className="row" onClick={() => (onPickTask(undefined), setPicker(false))}>
              <span className="grid size-10 place-items-center rounded-[12px] bg-paper text-[18px]">⏱</span>
              <span className="flex-1 font-medium">Just a timer</span>
            </button>
          </li>
          {todayTasks(state, ymd()).map((t) => (
            <li key={t.id}>
              <button type="button" className="row" onClick={() => (onPickTask(t.id), setPicker(false))}>
                <Tile task={t} />
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/** The task's steps under the timer. Ticking a step never finishes the task. */
function Steps({ task, actions, onFinished, announce }: { task: Task; actions: Actions; onFinished: (t: Task) => void; announce: (s: string) => void }) {
  const [draft, setDraft] = useState("");
  const [smaller, setSmaller] = useState<string | null>(null);
  const current = nextStep(task);

  return (
    <section className="mt-10" aria-label="Steps">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">{task.steps.length ? "Steps" : "Add a first step"}</h2>
        {task.steps.length > 0 && (
          <span className="t-small tabular-nums text-white/55">
            {task.steps.filter((s) => s.d).length}/{task.steps.length}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {task.steps.map((s) => (
            <motion.li key={s.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-2xl ${current?.id === s.id ? "bg-white/[0.12] ring-1 ring-white/20" : "bg-white/[0.05]"}`}>
              <button
                type="button"
                aria-pressed={s.d}
                onClick={() => {
                  actions.toggleStep(task.id, s.id);
                  if (!s.d) announce("Step done. The task is still open.");
                }}
                className="flex min-h-[54px] w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className={`hue-${task.hue} grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${s.d ? "border-[var(--h)] bg-[var(--h)]" : "border-white/50"}`}>
                  {s.d && <Check className="size-3.5 text-white" strokeWidth={3} />}
                </span>
                <span className={`text-[16px] ${s.d ? "text-white/45 line-through" : ""}`}>{s.t}</span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {current && smaller === null && (
        <button type="button" className="btn btn-quiet mt-2 gap-1.5 px-2 text-[14px] text-white/75" onClick={() => setSmaller(smallerStep(current.t))}>
          <Scissors className="size-4" /> Make the current step smaller
        </button>
      )}
      {current && smaller !== null && (
        <form
          className="mt-3 rounded-2xl bg-white/[0.06] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!smaller.trim()) return;
            actions.replaceStep(task.id, current.id, smaller);
            setSmaller(null);
            announce("Step made smaller.");
          }}
        >
          <label className="text-[13px] font-medium text-white/70" htmlFor="smaller">
            A smaller version. Change it if you like.
          </label>
          <input id="smaller" value={smaller} maxLength={MAX_STEP} onChange={(e) => setSmaller(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-white focus:border-moon focus:outline-none" />
          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn btn-white min-h-11 flex-1 text-[15px]">
              Use this
            </button>
            <button type="button" className="btn btn-glass min-h-11 flex-1 text-[15px]" onClick={() => setSmaller(null)}>
              Keep mine
            </button>
          </div>
        </form>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          actions.addStep(task.id, draft);
          setDraft("");
        }}
      >
        <label htmlFor="focus-add" className="sr-only">
          Add a step
        </label>
        <input id="focus-add" value={draft} maxLength={MAX_STEP} onChange={(e) => setDraft(e.target.value)} placeholder={task.steps.length ? "Add another step" : `Try: ${suggestStep(task.title)}`} className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/40 focus:border-moon focus:outline-none" />
        <button type="submit" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10" aria-label="Add step">
          <Plus className="size-5" />
        </button>
      </form>
      {!task.steps.length && (
        <button type="button" className="mt-2 text-[14px] text-white/70 underline underline-offset-2" onClick={() => actions.addStep(task.id, suggestStep(task.title))}>
          Use “{suggestStep(task.title)}”
        </button>
      )}

      <button
        type="button"
        className="btn btn-glass mt-8 w-full"
        onClick={() => {
          actions.finish(task.id);
          onFinished(task);
        }}
      >
        <Check className="size-5" /> Finish this task
      </button>
      <p className="t-small mt-2 text-center text-white/50">Only when the whole task is done.</p>
    </section>
  );
}

