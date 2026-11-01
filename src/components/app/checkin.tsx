"use client";

import { ArrowRight, BatteryLow, Check, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Bucket, type State, type Task, addDays, doneOn, dueIdeas, todayTasks, weekStart, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { burst } from "./petals";
import { Sheet } from "./sheet";
import { Tile } from "./task-row";

type Kind = "morning" | "evening" | "weekly";

const swap = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { type: "spring" as const, bounce: 0, duration: 0.35 } };

function Dots({ n, i }: { n: number; i: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label={`Step ${i + 1} of ${n}`}>
      {Array.from({ length: n }, (_, k) => (
        <motion.span key={k} className="h-1.5 rounded-full bg-ink" initial={false} animate={{ width: k === i ? 20 : 6, opacity: k === i ? 1 : 0.2 }} />
      ))}
    </div>
  );
}

function Pick({ t, on, onToggle }: { t: Task; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <button type="button" aria-pressed={on} onClick={onToggle} className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors ${on ? "bg-white ring-2 ring-signal" : "bg-white/70 ring-1 ring-line"}`}>
        <Tile task={t} size={34} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t.title}</span>
        <span className={`grid size-6 place-items-center rounded-full border-2 ${on ? "border-signal bg-signal" : "border-ink-3/50"}`}>{on && <Check className="size-3.5 text-white" strokeWidth={3} />}</span>
      </button>
    </li>
  );
}

/** Morning kickoff, evening wrap-up and weekly reset. Short, skippable, never guilt. */
export function Checkin({ kind, onClose, state, actions, onStart }: { kind: Kind | null; onClose: () => void; state: State; actions: Actions; onStart: (t: Task) => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [last, setLast] = useState<Kind | null>(kind);
  const [thought, setThought] = useState("");
  useEffect(() => {
    if (kind) {
      setLast(kind);
      setI(0);
      setPicked([]);
      setThought("");
    }
  }, [kind]);
  const k = kind ?? last;
  if (!k) return null;
  const today = ymd();

  const close = (finished: boolean) => {
    if (finished) {
      actions.finishCheckin(k);
      feel("save", "success");
    }
    onClose();
  };

  const title = k === "morning" ? "Morning kickoff" : k === "evening" ? "Evening wrap-up" : "Weekly reset";

  // ---------- morning ----------
  if (k === "morning") {
    const yesterday = doneOn(state, addDays(today, -1));
    const already = todayTasks(state, today);
    const candidates = state.tasks.filter((t) => (t.bucket === "week" || t.bucket === "later") && !already.includes(t)).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999")).slice(0, 8);
    const first = state.tasks.find((t) => t.id === (picked[0] ?? already[0]?.id));
    return (
      <Sheet open={!!kind} onClose={() => close(false)} title={title}>
        <Dots n={3} i={i} />
        <AnimatePresence mode="wait" initial={false}>
          {i === 0 && (
            <motion.div key="m0" {...swap} className="pt-5">
              <h3 className="t-title">Good morning. How is your energy?</h3>
              {yesterday.length > 0 && <p className="t-body mt-2 text-ink-2">Yesterday you finished {yesterday.length === 1 ? `“${yesterday[0].title}”` : `${yesterday.length} tasks`}. Nice.</p>}
              <div className="mt-5 grid gap-2">
                <button type="button" className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white px-4 text-left ring-1 ring-line" onClick={() => (actions.setEnergy("ok"), actions.clearEasy(), feel("start", "light"), setI(1))}>
                  <span className="hue-lime tile grid size-10 place-items-center rounded-xl"><Zap className="size-5" /></span>
                  <span><span className="block font-semibold">Ready to go</span><span className="t-small text-ink-3">Plan a normal day</span></span>
                </button>
                <button type="button" className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white px-4 text-left ring-1 ring-line" onClick={() => (actions.setEnergy("low"), actions.makeEasy(), feel("tap", "light"), setI(1))}>
                  <span className="hue-lilac tile grid size-10 place-items-center rounded-xl"><BatteryLow className="size-5" /></span>
                  <span><span className="block font-semibold">Running low</span><span className="t-small text-ink-3">One thing is enough today</span></span>
                </button>
              </div>
            </motion.div>
          )}
          {i === 1 && (
            <motion.div key="m1" {...swap} className="pt-5">
              <h3 className="t-title">What matters today?</h3>
              <p className="t-body mt-2 text-ink-2">{already.length ? `${already.length} already on Today. Add any of these, or none.` : "Pick one, two or three. Fewer is fine."}</p>
              {candidates.length ? (
                <ul className="mt-4 max-h-[44vh] space-y-2 overflow-auto">
                  {candidates.map((t) => (
                    <Pick key={t.id} t={t} on={picked.includes(t.id)} onToggle={() => (feel(picked.includes(t.id) ? "unstep" : "step", "light"), setPicked((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])))} />
                  ))}
                </ul>
              ) : (
                <p className="t-small mt-4 rounded-2xl bg-white/70 p-4 text-ink-3">Nothing waiting in This week or Later.</p>
              )}
              <button type="button" className="btn btn-signal mt-5 w-full" onClick={() => (actions.planToday(picked), setI(2))}>
                {picked.length ? `Add ${picked.length} to Today` : "Continue"}
              </button>
            </motion.div>
          )}
          {i === 2 && (
            <motion.div key="m2" {...swap} className="pt-5">
              <h3 className="t-title">{first ? "Your first thing" : "You are set"}</h3>
              {first ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
                  <Tile task={first} />
                  <span className="min-w-0 flex-1 font-semibold">{first.title}</span>
                </div>
              ) : (
                <p className="t-body mt-2 text-ink-2">Add something whenever you are ready.</p>
              )}
              <div className="mt-5 grid gap-2">
                {first && (
                  <button type="button" className="btn btn-signal w-full" onClick={() => (close(true), onStart(first))}>
                    Start now <ArrowRight className="size-5" />
                  </button>
                )}
                <button type="button" className={`btn w-full ${first ? "btn-line" : "btn-signal"}`} onClick={() => close(true)}>
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Sheet>
    );
  }

  // ---------- evening ----------
  if (k === "evening") {
    const done = doneOn(state, today);
    const left = todayTasks(state, today);
    return (
      <Sheet open={!!kind} onClose={() => close(false)} title={title}>
        <Dots n={3} i={i} />
        <AnimatePresence mode="wait" initial={false}>
          {i === 0 && (
            <motion.div key="e0" {...swap} className="pt-5">
              <h3 className="t-title">{done.length ? `You finished ${done.length === 1 ? "one thing" : `${done.length} things`} today` : "Today is done"}</h3>
              {done.length ? (
                <ul className="mt-4 space-y-2">
                  {done.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
                      <Tile task={t} size={34} />
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="size-2 rounded-full bg-coral" aria-label="Finished" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-body mt-2 text-ink-2">Nothing ticked today, and that is okay. Rest counts too.</p>
              )}
              <button type="button" className="btn btn-signal mt-5 w-full" onClick={(e) => (done.length && (burst(e.clientX, e.clientY, 18), feel("done", "success")), setI(left.length ? 1 : 2))}>
                Continue
              </button>
            </motion.div>
          )}
          {i === 1 && (
            <motion.div key="e1" {...swap} className="pt-5">
              <h3 className="t-title">What about the rest?</h3>
              <p className="t-body mt-2 text-ink-2">Choose where each one goes. Nothing is overdue here.</p>
              <ul className="mt-4 max-h-[46vh] space-y-2 overflow-auto">
                {left.map((t) => (
                  <li key={t.id} className="rounded-2xl bg-white p-3 ring-1 ring-line">
                    <div className="flex items-center gap-3">
                      <Tile task={t} size={30} />
                      <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button type="button" className="chip min-h-9 text-[14px]" onClick={() => actions.tomorrow(t.id)}>Tomorrow</button>
                      {(["week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
                        <button key={b} type="button" className="chip min-h-9 text-[14px]" onClick={() => actions.move(t.id, b)}>
                          {b === "week" ? "This week" : "Later"}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-signal mt-5 w-full" onClick={() => setI(2)}>
                {left.length ? "Leave the rest on Today" : "Continue"}
              </button>
            </motion.div>
          )}
          {i === 2 && (
            <motion.div key="e2" {...swap} className="pt-5">
              <h3 className="t-title">Anything on your mind?</h3>
              <p className="t-body mt-2 text-ink-2">Put it down so it can stop circling. It will be here tomorrow.</p>
              <textarea value={thought} onChange={(e) => setThought(e.target.value)} rows={3} placeholder="Optional" aria-label="Anything on your mind" className="field mt-4 resize-none" />
              <div className="mt-5 grid gap-2">
                {thought.trim() && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="btn btn-line" onClick={() => (actions.capture(thought, { bucket: "week", due: addDays(today, 1) }), toast("Saved for tomorrow."), close(true))}>
                      Save as task
                    </button>
                    <button type="button" className="btn btn-line" onClick={() => (actions.addEntry(thought, "idea"), toast("Saved under Ideas on Home."), close(true))}>
                      Save as idea
                    </button>
                  </div>
                )}
                <button type="button" className="btn btn-signal w-full" onClick={() => close(true)}>
                  Rest well
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Sheet>
    );
  }

  // ---------- weekly ----------
  const ws = weekStart(today, state.settings.weeklyDay);
  const weekDone = state.tasks.filter((t) => t.bucket === "done" && t.doneAt && t.doneAt.slice(0, 10) >= addDays(ws, -6));
  const waiting = state.tasks.filter((t) => t.bucket === "week" || t.bucket === "later");
  const ideas = dueIdeas(state, addDays(today, 30)).length;
  return (
    <Sheet open={!!kind} onClose={() => close(false)} title={title}>
      <Dots n={3} i={i} />
      <AnimatePresence mode="wait" initial={false}>
        {i === 0 && (
          <motion.div key="w0" {...swap} className="pt-5 text-center">
            <p className="font-serif text-[88px] leading-none tracking-[-0.03em]">{weekDone.length}</p>
            <h3 className="t-title mt-2">{weekDone.length === 1 ? "thing finished this week" : "things finished this week"}</h3>
            <p className="t-body mt-2 text-ink-2">{weekDone.length ? "Every one of them counts." : "A quiet week is still a week. Let us set up the next one."}</p>
            <button type="button" className="btn btn-signal mt-6 w-full" onClick={(e) => (weekDone.length && (burst(e.clientX, e.clientY, 22), feel("finish", "success")), setI(1))}>
              Continue
            </button>
          </motion.div>
        )}
        {i === 1 && (
          <motion.div key="w1" {...swap} className="pt-5">
            <h3 className="t-title">Set up next week</h3>
            <p className="t-body mt-2 text-ink-2">Move what matters into This week. Park the rest in Later.</p>
            {waiting.length ? (
              <ul className="mt-4 max-h-[46vh] space-y-2 overflow-auto">
                {waiting.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-line">
                    <Tile task={t} size={30} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t.title}</span>
                    <div className="seg flex shrink-0 p-0.5">
                      {(["week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
                        <button key={b} type="button" aria-pressed={t.bucket === b} onClick={() => actions.move(t.id, b)} className={`h-8 rounded-full px-2.5 text-[13px] font-semibold ${t.bucket === b ? "seg-knob text-ink" : "text-ink-3"}`}>
                          {b === "week" ? "Week" : "Later"}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small mt-4 rounded-2xl bg-white/70 p-4 text-ink-3">Nothing waiting. A clean slate.</p>
            )}
            <button type="button" className="btn btn-signal mt-5 w-full" onClick={() => setI(2)}>
              Continue
            </button>
          </motion.div>
        )}
        {i === 2 && (
          <motion.div key="w2" {...swap} className="pt-5">
            <h3 className="t-title">You are ready for the week</h3>
            <p className="t-body mt-2 text-ink-2">{ideas ? `${ideas} ${ideas === 1 ? "idea is" : "ideas are"} resting under Ideas on Home. They will come back when it is time.` : "Your ideas will come back on Today when it is time."}</p>
            <button type="button" className="btn btn-signal mt-6 w-full" onClick={() => close(true)}>
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
