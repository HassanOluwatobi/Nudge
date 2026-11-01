"use client";

import { ChevronDown, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { type Bucket, type State, type Task, BUCKET_NAME, doneEarlier, doneToday, todayTasks, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { TaskRow, DoneList } from "./task-row";
import { TopBar } from "./today";

const HINT: Record<Exclude<Bucket, "done">, string> = {
  today: "Need it today? Add it here",
  week: "Sometime this week",
  later: "No rush. Park it here",
};

/** To-do: the whole list in three simple places, after Tiimo's To-do tab. */
export function Todo({
  state,
  actions,
  onAdd,
  onAddTo,
  onSettings,
  onOpen,
  onMenu,
  onHelp,
  announce,
}: {
  state: State;
  actions: Actions;
  onAdd: () => void;
  onAddTo: (b: Exclude<Bucket, "done">) => void;
  onSettings: () => void;
  onOpen: (t: Task) => void;
  onMenu: (t: Task) => void;
  onHelp: () => void;
  announce: (s: string) => void;
}) {
  const today = ymd();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true });
  const [older, setOlder] = useState(false);
  const byDue = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt);
  const groups: [Exclude<Bucket, "done">, Task[]][] = [
    ["today", state.tasks.filter((t) => t.bucket === "today").sort(byDue)],
    ["week", state.tasks.filter((t) => t.bucket === "week").sort(byDue)],
    ["later", state.tasks.filter((t) => t.bucket === "later").sort(byDue)],
  ];
  const finished = doneToday(state, today);
  const earlier = doneEarlier(state, today);
  const totalToday = todayTasks(state, today).length + finished.length;

  const finishedOne = (t: Task) => {
    toast(`Finished: ${t.title}`, { action: { label: "Undo", onClick: () => actions.restore(t.id) } });
    announce(`Finished: ${t.title}`);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-36 safe-t">
      <TopBar done={finished.length} total={totalToday} onSettings={onSettings} onAdd={onAdd} onHelp={onHelp} />
      <h1 className="mt-4 text-center font-serif text-[44px] leading-none tracking-[-0.025em]">To-do</h1>
      <p className="t-small mt-2 text-center text-ink-3">Hold a task for quick actions.</p>

      {groups.map(([b, items]) => (
        <section key={b} className="mt-7" aria-labelledby={`b-${b}`}>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <button type="button" className="flex items-center gap-1.5" aria-expanded={!collapsed[b]} onClick={() => (setCollapsed((c) => ({ ...c, [b]: !c[b] })), feel("tap"))}>
              <span id={`b-${b}`} className={`pill pill-${b}`}>
                {BUCKET_NAME[b]} ({items.length})
              </span>
              <ChevronDown className={`size-4 text-ink-3 transition-transform ${collapsed[b] ? "-rotate-90" : ""}`} />
            </button>
            <button type="button" className="icon-btn size-9" aria-label={`Add to ${BUCKET_NAME[b]}`} onClick={() => onAddTo(b)}>
              <Plus className="size-4" />
            </button>
          </div>
          <AnimatePresence initial={false}>
            {!collapsed[b] && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="-m-2 overflow-hidden p-2">
                {items.length ? (
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {items.map((t) => (
                        <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} onMenu={onMenu} onFinished={finishedOne} />
                      ))}
                    </AnimatePresence>
                  </ul>
                ) : (
                  <button type="button" onClick={() => onAddTo(b)} className="add-row flex h-14 w-full items-center justify-between px-4 text-[15px]">
                    {HINT[b]}
                    <Plus className="size-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      ))}

      {(finished.length > 0 || earlier.length > 0) && (
        <section className="mt-7" aria-labelledby="b-done">
          <button type="button" className="mb-2.5 flex items-center gap-1.5 px-1" aria-expanded={!collapsed.done} onClick={() => setCollapsed((c) => ({ ...c, done: !c.done }))}>
            <span id="b-done" className="pill pill-done">
              Done today ({finished.length})
            </span>
            <ChevronDown className={`size-4 text-ink-3 transition-transform ${collapsed.done ? "-rotate-90" : ""}`} />
          </button>
          {!collapsed.done && (
            <>
              {finished.length > 0 && <DoneList tasks={finished} actions={actions} onOpen={onOpen} onMenu={onMenu} />}
              {earlier.length > 0 && (
                <>
                  <button type="button" className="btn btn-quiet mt-2 gap-1 px-1 text-[14px]" aria-expanded={older} onClick={() => setOlder((v) => !v)}>
                    <ChevronDown className={`size-4 transition-transform ${older ? "rotate-180" : ""}`} /> Finished before today ({earlier.length})
                  </button>
                  {older && (
                    <div className="mt-1">
                      <DoneList tasks={earlier.slice(0, 60)} actions={actions} onOpen={onOpen} onMenu={onMenu} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
