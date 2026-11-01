"use client";

import { ArrowRight, ChevronRight, Feather, ListTodo, Pencil, Plus, Settings2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type State, type Task, doneToday, prettyDue, suggestion, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Contours, Dot, Field, Ribbon, useDaypart } from "./motifs";
import { Mark, Thread, pullFor } from "./thread";

const hello = () => {
  const h = new Date().getHours();
  return h < 5 ? "Hello, night owl." : h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening.";
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
  const part = useDaypart();
  const pick = suggestion(state, today);
  const easy = state.meta.easy?.date === today && !!pick && pick.id === state.meta.easy.taskId;
  const others = easy ? [] : todayTasks(state, today).filter((t) => t.id !== pick?.id);
  const finished = doneToday(state, today);
  const fromWeek = pick && pick.bucket === "week" && !(pick.due && pick.due <= today);
  const open = state.tasks.filter((t) => t.bucket !== "done").length;
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Brand moment: the field, one ribbon, one set of contours. Text sits on the calm top-left. */}
      <Field tone={part} className="on-color text-white">
        <Contours className="pointer-events-none absolute inset-0 -z-10 h-full w-full" count={6} />
        <Ribbon tone={part} className="pointer-events-none absolute -left-[6%] bottom-[2%] -z-10 h-[50%] w-[118%]" />
        <div className="mx-auto w-full max-w-md px-6 pb-48 safe-t">
          <header className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Mark light className="h-5 w-auto" />
              <span className="text-[15px] font-semibold tracking-tight">NudgeMe</span>
            </div>
            <button type="button" className="icon-btn -mr-2 text-white/90" aria-label="Settings and privacy" onClick={onSettings}>
              <Settings2 className="size-5" />
            </button>
          </header>
          <p className="t-small mt-10 font-medium text-white/75">{dateLine}</p>
          <h1 className="t-display mt-2">{hello()}</h1>
          <p className="t-body mt-3 max-w-[26ch] text-white/85">
            {!pick
              ? "Clear your head first. Then pick one small step."
              : easy
                ? "Today is set to easy. This one thing is enough."
                : fromWeek
                  ? "Nothing is set for today. Here is one from this week."
                  : "Here is a good place to start."}
          </p>
        </div>
      </Field>

      <main className="relative z-10 mx-auto -mt-20 w-full max-w-md flex-1 px-5 pb-40">
        {!pick ? (
          <Empty onCapture={onCapture} hasOthers={open > 0} onList={onList} finished={finished.length} />
        ) : (
          <>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.section
                key={pick.id}
                aria-label="Start here"
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.985 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="float-card p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="t-label">Start here</span>
                  {pick.due && <span className="t-small text-ink-3">Due {prettyDue(pick.due, today).toLowerCase()}</span>}
                </div>
                <button type="button" onClick={() => onOpen(pick)} className="mt-2 block w-full text-left">
                  <h2 className="t-title">{pick.title}</h2>
                </button>

                <Thread pull={pullFor(pick.steps)} className="mt-3 h-7 w-full max-w-[200px]" />

                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-label text-signal-ink">{pick.steps ? `Step ${pick.steps + 1}` : "First step"}</span>
                    <button type="button" className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[14px] font-medium text-signal-ink" onClick={() => onOpen(pick)}>
                      <Pencil className="size-3.5" /> {pick.step ? "Edit" : "Add"}
                    </button>
                  </div>
                  <p className={`mt-1 text-[18px] leading-snug [overflow-wrap:anywhere] ${pick.step ? "text-ink" : "text-ink-3"}`}>
                    {pick.step || "No step yet. You can choose one when you start."}
                  </p>
                </div>

                <button type="button" className="btn btn-signal mt-6 w-full text-[17px]" onClick={() => onFocus(pick)}>
                  Start <ArrowRight className="size-5" />
                </button>
              </motion.section>
            </AnimatePresence>

            {/* Secondary actions live on the page, not in another card. */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1">
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

            {others.length > 0 && (
              <section className="mt-10" aria-labelledby="also">
                <div className="flex items-baseline justify-between border-b border-ink/80 pb-2">
                  <h3 id="also" className="t-heading">
                    Also today
                  </h3>
                  <span className="t-small text-ink-3">{others.length}</span>
                </div>
                <ul>
                  {others.slice(0, 3).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          actions.choose(t.id);
                          announce(`${t.title} is now your place to start.`);
                        }}
                        className="row"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px]">{t.title}</span>
                          {t.step && <span className="t-small block truncate text-ink-3">{t.step}</span>}
                        </span>
                        <span className="t-small shrink-0 font-medium text-signal-ink">Start here</span>
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
              <p className="t-small mt-8 flex items-center gap-2 text-ink-3">
                <Dot /> Finished today: <span className="text-ink-2">{finished.length === 1 ? finished[0].title : `${finished.length} tasks`}</span>
              </p>
            )}
          </>
        )}
      </main>

      {pick && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-paper via-paper/90 to-paper/0 pt-12 safe-b">
          <nav aria-label="Main" className="dock pointer-events-auto mx-auto flex w-[calc(100%-2.5rem)] max-w-[24rem] items-center gap-1 rounded-full p-1.5">
            <button type="button" onClick={onCapture} className="btn btn-white min-h-[50px] flex-1 text-[16px]">
              <Plus className="size-5" /> Add a thought
            </button>
            <button type="button" onClick={onList} className="btn min-h-[50px] gap-1.5 px-4 text-[15px] text-white/90">
              <ListTodo className="size-[18px]" /> My list
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

function Empty({ onCapture, hasOthers, onList, finished }: { onCapture: () => void; hasOthers: boolean; onList: () => void; finished: number }) {
  return (
    <section className="float-card p-6">
      <Thread pull={finished ? 1 : 0} done={finished > 0} className="h-9 w-full max-w-[200px]" />
      {finished ? (
        <>
          <h2 className="t-title mt-4">Today is clear.</h2>
          <p className="t-body mt-2 text-ink-2">You finished {finished === 1 ? "one task" : `${finished} tasks`}. You can stop here.</p>
        </>
      ) : (
        <>
          <h2 className="t-title mt-4">Put what is on your mind here.</h2>
          <p className="t-body mt-2 text-ink-2">NudgeMe holds it, then helps you start with one small step.</p>
        </>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" className={`btn w-full ${finished ? "btn-line" : "btn-signal"}`} onClick={onCapture}>
          <Plus className="size-5" /> {finished || hasOthers ? "Add a thought" : "Add your first thought"}
        </button>
        {hasOthers && (
          <button type="button" className="btn btn-quiet w-full" onClick={onList}>
            Choose from My list
          </button>
        )}
      </div>
    </section>
  );
}
