"use client";

import { ArrowRight, CalendarSync, ChevronRight, Download, ChevronDown, CircleHelp, Lightbulb, Moon, Plus, Settings2, Sun } from "lucide-react";
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
import { backupDue, downloadBackup } from "@/lib/backup";

const round = "btn btn-line btn-icon size-10 text-ink-2";

export function TopBar({ title, onSettings, onAdd, onHelp, dark, onTheme }: { title?: React.ReactNode; onSettings: () => void; onAdd?: () => void; onHelp?: () => void; dark?: boolean; onTheme?: () => void }) {
  return (
    <header className="flex min-h-[56px] items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">{title}</div>
      <div className="flex items-center gap-2">
        {onTheme && (
          <button type="button" className={round} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => (onTheme(), feel("tick", "light"))}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={dark ? "moon" : "sun"} initial={{ rotate: -60, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 60, opacity: 0, scale: 0.6 }} transition={{ type: "spring", bounce: 0.3, duration: 0.35 }} className="grid place-items-center">
                {dark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
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
  dark,
  onTheme,
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
  dark?: boolean;
  onTheme?: () => void;
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
  const ideasBack = dueIdeas(state, today).length;
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
      <TopBar dark={dark} onTheme={onTheme} title={<span className="block leading-tight"><span className="block text-[13px] font-medium text-ink-3">{date}</span><span className="block font-serif text-[28px] leading-none tracking-[-0.02em]">{day}</span></span>} onSettings={onSettings} onHelp={onHelp} />

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

      {due === "morning" && <MorningPick state={state} actions={actions} announce={announce} />}

      {due && due !== "morning" && (
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
        <section aria-label="Start here" className="start-card relative isolate mt-6 overflow-hidden rounded-[24px]">
          {/* Calm light: three faded blue glows drifting slowly around the card. */}
          <span aria-hidden className="glow glow-a" />
          <span aria-hidden className="glow glow-b" />
          <span aria-hidden className="glow glow-c" />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={pick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="relative px-5 pb-4 pt-6">
              <button type="button" {...pickHold.bind} onClick={() => onOpen(pick)} className="block w-full text-left" aria-label={`Start here: ${pick.title}. Open details. Hold for options.`}>
                <span className="block">
                  <span className="t-title block text-[28px] leading-tight">{pick.title}</span>
                  <span className="t-small mt-1 block text-ink-2">
                    {step ? (
                      <>
                        <span className="font-semibold text-signal-ink">Next: </span>
                        {step.t}
                      </>
                    ) : pick.steps.length ? (
                      "Every subtask is done. Finish it when you are ready."
                    ) : (
                      "Tap Start. You can add subtasks as you go."
                    )}
                  </span>
                </span>
              </button>
              <button type="button" className="btn btn-signal mt-5 w-full text-[17px]" onClick={() => (feel("tap", "light"), onFocus(pick))}>
                Start <ArrowRight className="size-5" />
              </button>
              {rest.length > 0 && (
                <div className="mt-1 flex justify-center">
                  <button type="button" className="btn btn-quiet text-[15px]" onClick={() => (actions.pass(pick.id), feel("tap", "light"), announce("Showing another task."))}>
                    Not this one
                  </button>
                </div>
              )}
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

      {ideasBack > 0 && (
        <button type="button" onClick={() => (onView("idea"), feel("tap"))} className="mt-3 flex min-h-[52px] w-full items-center gap-3 rounded-[18px] bg-white px-3 text-left ring-1 ring-line">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-signal-soft text-signal-ink">
            <Lightbulb className="size-[18px]" />
          </span>
          <span className="flex-1 text-[15px] font-semibold">{ideasBack === 1 ? "An idea came back" : `${ideasBack} ideas came back`}</span>
          <span className="text-[13px] text-ink-3">Review</span>
          <ChevronRight className="size-4 text-ink-3" />
        </button>
      )}

      <BackupNudge state={state} actions={actions} />

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

      <MiniCredit />

    </div>
  );
}

/** Morning check-in, right on Home: pick your one thing, or skip. */
function MorningPick({ state, actions, announce }: { state: State; actions: Actions; announce: (s: string) => void }) {
  const today = ymd();
  const onToday = todayTasks(state, today);
  const soon = state.tasks.filter((t) => t.bucket === "week").sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const options = [...onToday, ...soon].slice(0, 4);
  const pick = (t: Task) => {
    if (t.bucket !== "today") actions.planToday([t.id]);
    actions.choose(t.id);
    actions.finishCheckin("morning");
    feel("save", "success");
    announce(`${t.title} is your one thing today.`);
    toast("Your one thing is set. Start when you are ready.");
  };
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-[20px] bg-white p-4 ring-1 ring-line" aria-label="Morning check-in">
      <p className="t-label flex items-center gap-1.5 text-signal-ink">
        <Sun className="size-3.5" /> Good morning
      </p>
      <p className="mt-1.5 text-[17px] font-semibold">What is your one thing today?</p>
      {options.length ? (
        <ul className="mt-3 grid gap-1.5">
          {options.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => pick(t)} className="flex min-h-[48px] w-full items-center gap-3 rounded-[14px] px-2 text-left ring-1 ring-line transition-colors active:bg-[rgb(6_11_43/0.04)]">
                <Tile task={t} size={30} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t.title}</span>
                {t.bucket !== "today" && <span className="text-[12px] text-ink-3">This week</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-small mt-1 text-ink-3">Nothing planned yet. Add something in the field above.</p>
      )}
      <button type="button" className="btn btn-quiet mt-1 min-h-10 w-full text-[14px]" onClick={() => (actions.finishCheckin("morning"), feel("tap"))}>
        Skip for today
      </button>
    </motion.section>
  );
}

/** One quiet line at the very bottom of Home. */
function MiniCredit() {
  return (
    <p className="mt-12 flex items-center justify-center gap-2 text-[13px] text-ink-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hassan.jpg" alt="" width={20} height={20} className="size-5 rounded-full object-cover" />
      <span>Made by Hassan</span>
      <span aria-hidden>·</span>
      <a href="https://x.com/Art_sassin" target="_blank" rel="noopener noreferrer" className="font-medium text-ink-2 underline-offset-2 hover:underline">
        Say hi
      </a>
      <span aria-hidden>·</span>
      <a href="https://selar.com/showlove/hassanx" target="_blank" rel="noopener noreferrer" className="font-medium text-ink-2 underline-offset-2 hover:underline">
        Buy me a coffee
      </a>
    </p>
  );
}

/** Every couple of weeks, once there is something worth keeping. */
function BackupNudge({ state, actions }: { state: State; actions: Actions }) {
  const [hidden, setHidden] = useState(false);
  if (hidden || !backupDue(state)) return null;
  return (
    <div className="mt-3 flex min-h-[52px] items-center gap-3 rounded-[18px] bg-white px-3 ring-1 ring-line">
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-signal-soft text-signal-ink">
        <Download className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 text-[14px] font-medium">{state.settings.lastBackup ? "Time for a fresh backup" : "Save a backup of your tasks"}</span>
      <button type="button" className="text-[13px] text-ink-3" onClick={() => (actions.setSettings({ lastBackup: new Date(Date.now() - 7 * 864e5).toISOString() }), setHidden(true))}>
        Later
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center rounded-full bg-signal px-3.5 text-[13px] font-semibold text-white"
        onClick={() => {
          downloadBackup(state);
          actions.setSettings({ lastBackup: new Date().toISOString() });
          feel("save", "success");
          toast("Backup saved to your downloads.");
        }}
      >
        Save
      </button>
    </div>
  );
}
