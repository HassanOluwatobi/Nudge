"use client";

import { ArrowRight, CalendarSync, ChevronRight, ChevronDown, CircleHelp, Lightbulb, Moon, Plus, Settings2, Sparkles, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Part, type State, type Task, checkinDue, doneToday, dueIdeas, nextStep, suggestion, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { InstallCard } from "./install";
import { type Kind, QuickCapture } from "./quick-capture";
import { EntryList } from "./ideas";
import { TaskRow, Tile, DoneList } from "./task-row";
import { useHold } from "@/lib/use-hold";

const round = "btn btn-line btn-icon size-10 text-ink-2";

export function TopBar({ title, onSettings, onAdd, onHelp }: { title?: React.ReactNode; onSettings: () => void; onAdd?: () => void; onHelp?: () => void }) {
  return (
    <header className="flex min-h-[56px] items-center justify-between gap-3 py-2">
      <div className="min-w-0">{title}</div>
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
          <button type="button" className="btn btn-ink btn-icon size-10" aria-label="Add a task" onClick={onAdd}>
            <Plus className="size-5" />
          </button>
        )}
      </div>
    </header>
  );
}

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -24 }),
};

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
  view,
  onView,
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
  view: Kind;
  onView: (v: Kind) => void;
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
  // Up next: anything with a reminder time comes first, in time order.
  const at = (t: Task) => (t.remindAt ? Date.parse(t.remindAt) : Number.POSITIVE_INFINITY);
  const rest = list.filter((t) => t.id !== pick?.id).sort((a, b) => at(a) - at(b));
  const [showNext, setShowNext] = useState(!easy);
  const day = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const step = pick ? nextStep(pick) : undefined;

  // Slide the content toward the side of the toggle you tapped.
  const ORDER: Kind[] = ["task", "idea", "note"];
  const prev = useRef(view);
  const dir = Math.sign(ORDER.indexOf(view) - ORDER.indexOf(prev.current));
  useEffect(() => {
    prev.current = view;
  }, [view]);
  const openIdeas = state.entries.filter((e) => e.kind === "idea" && e.status === "open").length;
  const openNotes = state.entries.filter((e) => e.kind === "note" && e.status === "open").length;
  const VIEWS: [Kind, string, number][] = [
    ["task", "Tasks", list.length],
    ["idea", "Ideas", openIdeas],
    ["note", "Notes", openNotes],
  ];
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
      <TopBar title={<span className="block leading-tight"><span className="block text-[13px] font-medium text-ink-3">{date}</span><span className="block font-serif text-[28px] leading-none tracking-[-0.02em]">{day}</span></span>} onSettings={onSettings} onHelp={onHelp} />

      {/* One toggle for everything. What you type lands in the list you are looking at. */}
      <div className="seg mt-6 grid grid-cols-3 p-1" role="tablist" aria-label="Show">
        {VIEWS.map(([k, name, count]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => (onView(k), feel("tick", "light"))} className="relative h-11 rounded-full text-[15px] font-semibold">
            {view === k && <motion.span layoutId="home-seg" className="seg-knob absolute inset-0" transition={{ type: "spring", bounce: 0, duration: 0.32 }} />}
            <span className={`relative ${view === k ? "text-ink" : "text-ink-3"}`}>
              {name}
              {count > 0 && <span className="ml-1.5 text-[13px] font-medium tabular-nums text-ink-3">{count}</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        <QuickCapture kind={view} state={state} actions={actions} announce={announce} onOpen={onOpen} />
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
      {view !== "task" ? (
        <motion.div key={view} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.28 }}>
          <EntryList kind={view} state={state} actions={actions} />
        </motion.div>
      ) : (
      <motion.div key="task" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.28 }}>

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
          <p className="t-label px-4 pt-4 text-signal-ink">Start here</p>
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
                      pick.steps.length ? "Every subtask is done. Finish it when you are ready." : "Tap Start. You can add subtasks as you go."
                    )}
                  </span>
                </span>
              </button>
              <button type="button" className="btn btn-signal mt-4 w-full text-[17px]" onClick={() => (feel("tap", "light"), onFocus(pick))}>
                Start <ArrowRight className="size-5" />
              </button>
              <div className="mt-1 flex justify-center gap-1">
                {rest.length > 0 && (
                  <button type="button" className="btn btn-quiet text-[15px]" onClick={() => (actions.pass(pick.id), feel("tap", "light"), announce("Showing another task."))}>
                    Not this one
                  </button>
                )}

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

      <InstallCard />

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
            <button type="button" className="chip" onClick={() => (actions.archiveEntry(idea.id), feel("tap", "light"), toast("Archived. Find it under Ideas."))}>
              Let it go
            </button>
          </div>
        </motion.section>
      )}

      {rest.length > 0 && (
        <section className="mt-7" aria-labelledby="next-h">
          <button type="button" className="mb-2.5 flex items-center gap-2 px-1" aria-expanded={showNext} onClick={() => (setShowNext((v) => !v), feel("tap"))}>
            <span id="next-h" className="pill pill-anytime">
              Up next ({rest.length})
            </span>
            <ChevronDown className={`size-4 text-ink-3 transition-transform ${showNext ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {showNext && (
              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.36 }} className="space-y-2 overflow-hidden">
                <AnimatePresence initial={false}>
                  {rest.map((t) => (
                    <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} onMenu={onMenu} onFinished={finishedOne} />
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

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

      </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
