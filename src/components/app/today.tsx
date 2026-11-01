"use client";

import { ArrowRight, CalendarSync, ChevronRight, ChevronDown, CircleHelp, Feather, Lightbulb, Moon, Plus, Settings2, Sparkles, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { type Part, type State, type Task, PARTS, PART_NAME, checkinDue, doneToday, dueIdeas, nextStep, partNow, suggestion, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { Credit } from "./settings";
import { QuickCapture } from "./quick-capture";
import { TaskRow, Tile, DoneList } from "./task-row";
import { useHold } from "@/lib/use-hold";

export function Counter({ done, total }: { done: number; total: number }) {
  return (
    <span className="inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-full bg-white px-3.5 text-[14px] font-semibold tabular-nums ring-1 ring-line" aria-label={`${done} of ${total} done today`}>
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

const round = "btn btn-line btn-icon size-10 text-ink-2";

export function TopBar({ done, total, onSettings, onAdd, onHelp }: { done: number; total: number; onSettings: () => void; onAdd?: () => void; onHelp?: () => void }) {
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
        {onAdd && (
          <button type="button" className="btn btn-ink btn-icon size-10" aria-label="Add a thought" onClick={onAdd}>
            <Plus className="size-5" />
          </button>
        )}
      </div>
    </header>
  );
}

const CHECKIN = {
  morning: { icon: Sun, title: "Morning kickoff", body: "2 min", hue: "hue-peach" },
  evening: { icon: Moon, title: "Evening wrap-up", body: "2 min", hue: "hue-lilac" },
  weekly: { icon: CalendarSync, title: "Weekly reset", body: "5 min", hue: "hue-blue" },
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
  const step = pick ? nextStep(pick) : undefined;

  const pickHold = useHold(() => {
    if (!pick) return;
    feel("open");
    onMenu(pick);
  });
  const finishedOne = (t: Task) => {
    toast(`Finished: ${t.title}`, { action: { label: "Undo", onClick: () => actions.restore(t.id) } });
    announce(`Finished: ${t.title}`);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-36 safe-t">
      <TopBar done={finished.length} total={list.length + finished.length} onSettings={onSettings} onHelp={onHelp} />

      <div className="mt-4 text-center">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.025em]">{day}</h1>
        <p className="t-body mt-2 text-ink-2">{date}</p>
      </div>

      <QuickCapture state={state} actions={actions} announce={announce} onOpen={onOpen} />

      {due && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onCheckin(due)}
          className="mt-3 flex min-h-[56px] w-full items-center gap-3 rounded-[18px] bg-white px-3 text-left ring-1 ring-line transition-transform active:scale-[0.99]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-signal-soft text-signal-ink">
            {(() => {
              const I = CHECKIN[due].icon;
              return <I className="size-[18px]" />;
            })()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{CHECKIN[due].title}</span>
          <span className="text-[13px] text-ink-3">{CHECKIN[due].body}</span>
          <ChevronRight className="size-4 shrink-0 text-ink-3" />
        </motion.button>
      )}


      {/* The one painted moment, with the suggested task under it. */}
      {pick ? (
        <section aria-label="Start here" className="mt-6 overflow-hidden rounded-[24px] bg-white ring-1 ring-line">
          <p className="t-label px-4 pt-4 text-signal-ink">{easy ? "Today is easy" : "Start here"}</p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={pick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="px-4 pb-3 pt-3">
              <button type="button" {...pickHold.bind} onClick={() => onOpen(pick)} className="flex w-full items-start gap-3 text-left" aria-label={`${pick.title}. Open details. Hold for options.`}>
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
                      pick.steps.length ? "Every step is done. Finish it when you are ready." : "No steps yet. You can add one when you start."
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
        <section className="mt-6 overflow-hidden rounded-[24px] bg-white ring-1 ring-line">
          <div className="p-5">
            <h2 className="t-title">{finished.length ? "Today is clear." : "Nothing on today yet."}</h2>
            <p className="t-body mt-2 text-ink-2">
              {finished.length ? `You finished ${finished.length === 1 ? "one task" : `${finished.length} tasks`}. You can stop here, or add something above.` : "Type it in the field above. NudgeMe holds it, then helps you start with one small step."}
            </p>
          </div>
        </section>
      )}

      {idea && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-[20px] bg-white p-4 ring-1 ring-line" aria-label="An idea came back">
          <p className="t-label flex items-center gap-1.5 text-signal-ink">
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
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.36 }} className="overflow-hidden">
                <DoneList tasks={finished} actions={actions} onOpen={onOpen} onMenu={onMenu} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      <div className="mt-10">
        <Credit />
      </div>
    </div>
  );
}
