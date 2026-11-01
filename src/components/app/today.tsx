"use client";

import { ArrowRight, CalendarSync, ChevronDown, CircleHelp, Feather, Lightbulb, Moon, Plus, Settings2, Sparkles, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { type Part, type State, type Task, PARTS, PART_NAME, checkinDue, doneToday, dueIdeas, nextStep, partNow, suggestion, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { Art } from "./art";
import { TaskRow, Tile } from "./task-row";

export function Counter({ done, total }: { done: number; total: number }) {
  return (
    <span className="inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-full bg-white px-3.5 text-[14px] font-semibold tabular-nums shadow-[0_1px_2px_rgb(6_11_43/0.06),0_6px_16px_-10px_rgb(6_11_43/0.3)]" aria-label={`${done} of ${total} done today`}>
      <motion.span key={`e${done}`} aria-hidden initial={{ scale: 1, rotate: 0 }} animate={done ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : {}} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        🎉
      </motion.span>
      <span className="inline-flex">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={done} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}>
            {done}
          </motion.span>
        </AnimatePresence>
        /{total}
      </span>
    </span>
  );
}

const round = "grid size-10 place-items-center rounded-full bg-white text-ink-2 shadow-[0_1px_2px_rgb(6_11_43/0.06),0_6px_16px_-10px_rgb(6_11_43/0.3)] transition-transform active:scale-90";

export function TopBar({ done, total, onSettings, onAdd, onHelp }: { done: number; total: number; onSettings: () => void; onAdd: () => void; onHelp?: () => void }) {
  return (
    <header className="flex items-center justify-between py-2">
      <Counter done={done} total={total} />
      <div className="flex items-center gap-2">
        {onHelp && (
          <button type="button" className={round} aria-label="How NudgeMe works" onClick={onHelp}>
            <CircleHelp className="size-[18px]" />
          </button>
        )}
        <button type="button" className={round} aria-label="Settings, reminders and privacy" onClick={onSettings}>
          <Settings2 className="size-[18px]" />
        </button>
        <button type="button" className="grid size-10 place-items-center rounded-full bg-ink text-white shadow-[0_8px_18px_-8px_rgb(6_11_43/0.6)] transition-transform active:scale-90" aria-label="Add a thought" onClick={onAdd}>
          <Plus className="size-5" />
        </button>
      </div>
    </header>
  );
}

const CHECKIN = {
  morning: { icon: Sun, title: "Morning kickoff", body: "Two minutes to pick what matters today.", hue: "hue-peach" },
  evening: { icon: Moon, title: "Evening wrap-up", body: "See what you did and let the rest wait.", hue: "hue-lilac" },
  weekly: { icon: CalendarSync, title: "Weekly reset", body: "Clear the week and set up the next one.", hue: "hue-blue" },
} as const;

export function Today({
  state,
  actions,
  onAdd,
  onAddTo,
  onSettings,
  onOpen,
  onMenu,
  onFocus,
  onCheckin,
  onHelp,
  announce,
}: {
  state: State;
  actions: Actions;
  onAdd: () => void;
  onAddTo: (part: Part) => void;
  onSettings: () => void;
  onOpen: (t: Task) => void;
  onMenu: (t: Task) => void;
  onFocus: (t: Task) => void;
  onCheckin: (k: "morning" | "evening" | "weekly") => void;
  onHelp: () => void;
  announce: (s: string) => void;
}) {
  const today = ymd();
  const [showDone, setShowDone] = useState(false);
  const pick = suggestion(state, today);
  const list = todayTasks(state, today);
  const finished = doneToday(state, today);
  const easy = state.meta.easy?.date === today;
  const due = checkinDue(state);
  const idea = dueIdeas(state, today)[0];
  const rest = easy ? [] : list.filter((t) => t.id !== pick?.id);
  const now = partNow();
  const day = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const shift = { morning: 0, afternoon: 0.25, evening: 0.55 }[now as "morning" | "afternoon" | "evening"] ?? 0;
  const step = pick ? nextStep(pick) : undefined;

  const finishedOne = (t: Task) => {
    toast(`Finished: ${t.title}`, { action: { label: "Undo", onClick: () => actions.restore(t.id) } });
    announce(`Finished: ${t.title}`);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-36 safe-t">
      <TopBar done={finished.length} total={list.length + finished.length} onSettings={onSettings} onAdd={onAdd} onHelp={onHelp} />

      <div className="mt-4 text-center">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.025em]">{day}</h1>
        <p className="t-body mt-2 text-ink-2">{date}</p>
      </div>

      {due && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onCheckin(due)}
          className={`${CHECKIN[due].hue} tile mt-6 flex w-full items-center gap-3 rounded-[20px] p-3.5 text-left`}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white/70">
            {(() => {
              const I = CHECKIN[due].icon;
              return <I className="size-5" />;
            })()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-ink">{CHECKIN[due].title}</span>
            <span className="t-small block text-ink-2">{CHECKIN[due].body}</span>
          </span>
          <ArrowRight className="size-5 shrink-0" />
        </motion.button>
      )}

      {/* The one painted moment, with the suggested task under it. */}
      {pick ? (
        <section aria-label="Start here" className="mt-6">
          <div className="relative h-[150px] overflow-hidden rounded-[26px]">
            <Art mode={0} shift={shift} />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink backdrop-blur-sm">
              {easy ? "Today is easy" : "Start here"}
            </span>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={pick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="px-1 pt-4">
              <button type="button" onClick={() => onOpen(pick)} className="flex w-full items-start gap-3 text-left">
                <Tile task={pick} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="t-title block text-[26px]">{pick.title}</span>
                  <span className="t-small mt-1 block text-ink-2">
                    {step ? (
                      <>
                        <span className="font-semibold text-signal-ink">Next: </span>
                        {step.t}
                      </>
                    ) : (
                      "No steps yet. You can add one when you start."
                    )}
                  </span>
                </span>
              </button>
              <button type="button" className="btn btn-signal mt-4 w-full text-[17px]" onClick={() => (feel("tap", "light"), onFocus(pick))}>
                Start <ArrowRight className="size-5" />
              </button>
              <div className="mt-1 flex justify-center gap-1">
                {!easy && rest.length > 0 && (
                  <button type="button" className="btn btn-quiet text-[15px]" onClick={() => (actions.pass(pick.id), feel("tap", "light"), announce("Showing another task."))}>
                    Not this one
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-quiet gap-1.5 text-[15px]"
                  onClick={() => {
                    feel(easy ? "tap" : "save", "light");
                    if (easy) {
                      actions.clearEasy();
                      announce("Showing your full day.");
                    } else {
                      actions.makeEasy(pick.id);
                      announce("Today is set to easy. One thing is enough.");
                    }
                  }}
                >
                  {easy ? "Show my full day" : (
                    <>
                      <Feather className="size-4" /> Make today easy
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      ) : (
        <section className="mt-6 overflow-hidden rounded-[26px] bg-white shadow-[0_24px_50px_-34px_rgb(6_11_43/0.5)]">
          <div className="relative h-[150px]">
            <Art mode={0} shift={shift} />
          </div>
          <div className="p-5">
            <h2 className="t-title">{finished.length ? "Today is clear." : "What is on your mind?"}</h2>
            <p className="t-body mt-2 text-ink-2">
              {finished.length ? `You finished ${finished.length === 1 ? "one task" : `${finished.length} tasks`}. You can stop here, or add something.` : "Put it here. NudgeMe holds it, then helps you start with one small step."}
            </p>
            <button type="button" className={`btn mt-5 w-full ${finished.length ? "btn-line" : "btn-signal"}`} onClick={onAdd}>
              <Plus className="size-5" /> Add a thought
            </button>
          </div>
        </section>
      )}

      {idea && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hue-lime mt-8 rounded-[20px] border border-[#dfe9c8] bg-[#f6fbe9] p-4" aria-label="An idea came back">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4d7a12]">
            <Lightbulb className="size-3.5" /> An idea came back
          </p>
          <p className="mt-2 text-[16px] leading-snug [overflow-wrap:anywhere]">{idea.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="chip"
              onClick={() => {
                const t = actions.entryToTask(idea.id);
                feel("save", "success");
                if (t) toast("Added to This week.");
              }}
            >
              <Sparkles className="mr-1 size-3.5" /> Make it a task
            </button>
            <button type="button" className="chip" onClick={() => (actions.snoozeEntry(idea.id), feel("tap", "light"), toast("It will come back later."))}>
              Not yet
            </button>
            <button type="button" className="chip" onClick={() => (actions.archiveEntry(idea.id), feel("tap", "light"), toast("Archived. You can find it in Ideas."))}>
              Let it go
            </button>
          </div>
        </motion.section>
      )}

      {!easy &&
        PARTS.map((part) => {
          const items = rest.filter((t) => t.part === part);
          if (!items.length && (part !== now || rest.length > 0)) return null;
          return (
            <section key={part} className="mt-7" aria-labelledby={`p-${part}`}>
              <div className="mb-2.5 flex items-center justify-between px-1">
                <h2 id={`p-${part}`} className={`pill pill-${part}`}>
                  {PART_NAME[part]} ({items.length})
                </h2>
                <button type="button" className="icon-btn size-9" aria-label={`Add to ${PART_NAME[part]}`} onClick={() => onAddTo(part)}>
                  <Plus className="size-4" />
                </button>
              </div>
              {items.length ? (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((t) => (
                      <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} onMenu={onMenu} onFinished={finishedOne} />
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <button type="button" onClick={() => onAddTo(part)} className="add-row flex h-14 w-full items-center justify-between px-4 text-[15px]">
                  {part === "anytime" ? "Anytime today works" : `Add something for this ${part}`}
                  <Plus className="size-4" />
                </button>
              )}
            </section>
          );
        })}

      {finished.length > 0 && (
        <section className="mt-7" aria-labelledby="done-h">
          <button type="button" className="mb-2.5 flex items-center gap-2 px-1" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
            <span id="done-h" className="pill pill-done">
              Done ({finished.length})
            </span>
            <ChevronDown className={`size-4 text-ink-3 transition-transform ${showDone ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                {finished.map((t) => (
                  <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} onMenu={onMenu} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}
