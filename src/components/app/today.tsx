"use client";

import { ArrowRight, ChevronRight, Feather, ListTodo, Pencil, Plus, Settings2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type State, type Task, doneToday, prettyDue, suggestion, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Mark, Thread, pullFor } from "./thread";

const hello = () => {
  const h = new Date().getHours();
  return h < 5 ? "Good evening." : h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening.";
};

export function Today({
  state,
  actions,
  onCapture,
  onList,
  onSettings,
  onOpen,
  onFocus,
  announce,
}: {
  state: State;
  actions: Actions;
  onCapture: () => void;
  onList: () => void;
  onSettings: () => void;
  onOpen: (t: Task) => void;
  onFocus: (t: Task) => void;
  announce: (s: string) => void;
}) {
  const today = ymd();
  const pick = suggestion(state, today);
  const easy = state.meta.easy?.date === today && !!pick && pick.id === state.meta.easy.taskId;
  const others = easy ? [] : todayTasks(state, today).filter((t) => t.id !== pick?.id);
  const finished = doneToday(state, today);
  const fromWeek = pick && pick.bucket === "week" && !(pick.due && pick.due <= today);
  const open = state.tasks.filter((t) => t.bucket !== "done").length;
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-t">
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Mark className="h-5 w-auto" />
          <span className="text-[15px] font-semibold tracking-tight">NudgeMe</span>
        </div>
        <div className="flex items-center">
          <button type="button" className="btn btn-quiet gap-1.5" onClick={onList}>
            <ListTodo className="size-[18px]" />
            My list
          </button>
          <button type="button" className="icon-btn -mr-2" aria-label="Settings and privacy" onClick={onSettings}>
            <Settings2 className="size-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-36">
        <p className="mt-6 text-[15px] text-ink-3">{dateLine}</p>
        <h1 className="mt-1 font-serif text-[38px] leading-[1.05] tracking-[-0.02em]">{hello()}</h1>

        {!pick ? (
          <Empty onCapture={onCapture} hasOthers={open > 0} onList={onList} finished={finished.length} />
        ) : (
          <>
            <p className="mt-2 text-[16px] text-ink-2">
              {easy ? "Today is set to easy. This one thing is enough." : fromWeek ? "Nothing is set for today. Here is one from this week." : "Here is a good place to start."}
            </p>

            <AnimatePresence mode="popLayout" initial={false}>
              <motion.section
                key={pick.id}
                aria-label="Start here"
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.985 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="mt-6 rounded-[28px] bg-sheet p-5 shadow-[0_1px_0_rgb(255_255_255)_inset,0_24px_48px_-32px_rgb(29_27_38/0.35)] ring-1 ring-line/70"
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Start here</span>
                  {pick.due && <span className="text-[13px] text-ink-3">Due {prettyDue(pick.due, today).toLowerCase()}</span>}
                </div>
                <button type="button" onClick={() => onOpen(pick)} className="mt-2 block w-full text-left">
                  <h2 className="font-serif text-[27px] leading-[1.15] tracking-[-0.015em] [overflow-wrap:anywhere]">{pick.title}</h2>
                </button>

                <Thread pull={pullFor(pick.steps)} className="mt-3 h-8 w-full max-w-[220px]" />

                <div className="mt-3 rounded-2xl bg-signal-soft/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-signal-ink">{pick.steps ? "Next step" : "First step"}</span>
                    <button type="button" className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-signal-ink" onClick={() => onOpen(pick)}>
                      <Pencil className="size-3.5" /> {pick.step ? "Edit" : "Add"}
                    </button>
                  </div>
                  <p className={`mt-1 text-[17px] leading-snug [overflow-wrap:anywhere] ${pick.step ? "text-ink" : "text-ink-3"}`}>
                    {pick.step || "No step yet. You can choose one when you start."}
                  </p>
                </div>

                <button type="button" className="btn btn-signal mt-4 w-full text-[17px]" onClick={() => onFocus(pick)}>
                  Start <ArrowRight className="size-5" />
                </button>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1">
                  {!easy && others.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-quiet text-[15px]"
                      onClick={() => {
                        actions.pass(pick.id);
                        announce("Showing another task.");
                      }}
                    >
                      Not this one
                    </button>
                  )}
                  {easy ? (
                    <button
                      type="button"
                      className="btn btn-quiet text-[15px]"
                      onClick={() => {
                        actions.clearEasy();
                        announce("Showing your full day.");
                      }}
                    >
                      Show my full day
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-quiet gap-1.5 text-[15px]"
                      onClick={() => {
                        actions.makeEasy(pick.id);
                        announce("Today is set to easy. One thing is enough.");
                      }}
                    >
                      <Feather className="size-4" /> Make today easy
                    </button>
                  )}
                </div>
              </motion.section>
            </AnimatePresence>

            {others.length > 0 && (
              <section className="mt-8" aria-labelledby="also">
                <h3 id="also" className="eyebrow px-1">
                  Also today
                </h3>
                <ul className="mt-2 divide-y divide-line/80 overflow-hidden rounded-3xl bg-sheet/60 ring-1 ring-line/60">
                  {others.slice(0, 3).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          actions.choose(t.id);
                          announce(`${t.title} is now your place to start.`);
                        }}
                        className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-ink/[0.04]"
                      >
                        <span className="size-2 shrink-0 rounded-full bg-ink-3/50" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px]">{t.title}</span>
                          {t.step && <span className="block truncate text-[13.5px] text-ink-3">{t.step}</span>}
                        </span>
                        <span className="text-[13px] text-ink-3">Start here</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {others.length > 3 && (
                  <button type="button" onClick={onList} className="btn btn-quiet mt-1 w-full gap-1 text-[15px]">
                    {others.length - 3} more in My list <ChevronRight className="size-4" />
                  </button>
                )}
              </section>
            )}

            {finished.length > 0 && (
              <p className="mt-8 px-1 text-[15px] text-ink-3">
                Finished today: <span className="text-ink-2">{finished.length === 1 ? finished[0].title : `${finished.length} tasks`}</span>
              </p>
            )}
          </>
        )}
      </main>

      {pick && <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-paper via-paper/95 to-paper/0 pt-10 safe-b">
        <div className="pointer-events-auto mx-auto w-full max-w-md px-5">
          <button type="button" onClick={onCapture} className="btn btn-ink w-full text-[17px] shadow-[0_18px_40px_-20px_rgb(29_27_38/0.7)]">
            <Plus className="size-5" /> Add a thought
          </button>
        </div>
      </div>}
    </div>
  );
}

function Empty({ onCapture, hasOthers, onList, finished }: { onCapture: () => void; hasOthers: boolean; onList: () => void; finished: number }) {
  return (
    <section className="mt-6 rounded-[28px] bg-sheet p-6 ring-1 ring-line/70">
      <Thread pull={finished ? 1 : 0} done={finished > 0} className="h-10 w-full max-w-[220px]" />
      {finished ? (
        <>
          <h2 className="mt-4 font-serif text-[26px] leading-tight">Today is clear.</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-2">You finished {finished === 1 ? "one task" : `${finished} tasks`}. You can stop here.</p>
        </>
      ) : (
        <>
          <h2 className="mt-4 font-serif text-[26px] leading-tight">Put what is on your mind here.</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-2">NudgeMe holds it, then helps you start with one small step.</p>
        </>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" className={`btn w-full ${finished ? "btn-line" : "btn-signal"}`} onClick={onCapture}>
          <Plus className="size-5" /> {finished || hasOthers ? "Add a thought" : "Add your first thought"}
        </button>
        {hasOthers && (
          <button type="button" className="btn btn-line w-full" onClick={onList}>
            Choose from My list
          </button>
        )}
      </div>
    </section>
  );
}
