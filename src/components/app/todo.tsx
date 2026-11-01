"use client";

import { ChevronDown, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { type Bucket, type State, type Task, BUCKET_NAME, doneEarlier, ymd } from "@/lib/tasks";
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
  dark,
  onTheme,
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
  dark?: boolean;
  onTheme?: () => void;
  announce: (s: string) => void;
}) {
  const today = ymd();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true });
  const byDue = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt);
  const groups: [Exclude<Bucket, "done">, Task[]][] = [
    ["week", state.tasks.filter((t) => t.bucket === "week").sort(byDue)],
    ["later", state.tasks.filter((t) => t.bucket === "later").sort(byDue)],
  ];
  const earlier = doneEarlier(state, today);

  const finishedOne = (t: Task) => {
    toast(`Finished: ${t.title}`, { action: { label: "Undo", onClick: () => actions.restore(t.id) } });
    announce(`Finished: ${t.title}`);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-36 safe-t">
      <TopBar onSettings={onSettings} onHelp={onHelp} dark={dark} onTheme={onTheme} title={<span className="block leading-tight"><span className="block text-[13px] font-medium text-ink-3">This week and later</span><span className="block font-serif text-[28px] leading-none tracking-[-0.02em]">Plan</span></span>} />


      {groups.map(([b, items]) => (
        <section key={b} className="mt-6 first-of-type:mt-4" aria-labelledby={`b-${b}`}>
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

      {/* Today's tasks and today's done list live on Home. Plan keeps the history. */}
      {earlier.length > 0 && (
        <section className="mt-7" aria-labelledby="b-done">
          <button type="button" className="mb-2.5 flex items-center gap-1.5 px-1" aria-expanded={!collapsed.done} onClick={() => setCollapsed((c) => ({ ...c, done: !c.done }))}>
            <span id="b-done" className="pill pill-done">
              Done before today ({earlier.length})
            </span>
            <ChevronDown className={`size-4 text-ink-3 transition-transform ${collapsed.done ? "-rotate-90" : ""}`} />
          </button>
          {!collapsed.done && <DoneList tasks={earlier.slice(0, 60)} actions={actions} onOpen={onOpen} onMenu={onMenu} />}
        </section>
      )}
    </div>
  );
}
