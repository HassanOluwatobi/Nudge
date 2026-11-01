"use client";

import { ArrowLeft, ChevronDown, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { type Bucket, type State, type Task, BUCKET_NAME, doneEarlier, doneToday, prettyDue, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";

const EMPTY: Record<Bucket, string> = {
  today: "Nothing set for today. That is fine.",
  week: "Nothing here for this week.",
  later: "Things you want to do some day can wait here.",
  done: "Finished tasks show up here.",
};

/** My list: four simple places to find things. Not a board to keep tidy. */
export function MyList({
  state,
  actions,
  onBack,
  onOpen,
  onCapture,
  announce,
  choosing,
}: {
  state: State;
  actions: Actions;
  onBack: () => void;
  onOpen: (t: Task) => void;
  onCapture: () => void;
  announce: (s: string) => void;
  choosing?: boolean;
}) {
  const today = ymd();
  const [older, setOlder] = useState(false);
  const open = (b: Bucket) =>
    state.tasks
      .filter((t) => t.bucket === b)
      .sort((a, b2) => (a.due ?? "9999").localeCompare(b2.due ?? "9999") || a.createdAt.localeCompare(b2.createdAt));
  const groups: [Bucket, Task[]][] = [
    ["today", open("today")],
    ["week", open("week")],
    ["later", open("later")],
    ["done", doneToday(state, today)],
  ];
  const earlier = doneEarlier(state, today);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-t">
      <header className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-paper/90 px-3 py-2 backdrop-blur-md">
        <button type="button" className="btn btn-quiet gap-1.5" onClick={onBack}>
          <ArrowLeft className="size-[18px]" /> Today
        </button>
        <button type="button" className="icon-btn" aria-label="Add a thought" onClick={onCapture}>
          <Plus className="size-5" />
        </button>
      </header>

      <h1 className="t-display mt-6">My list</h1>
      <p className="t-body mt-2 text-ink-2">{choosing ? "Pick what you want to do next, or nothing at all." : "Tap a task to change it, move it, or start it."}</p>

      <div className="mt-8 space-y-10 pb-16">
        {groups.map(([b, list]) => (
          <section key={b} aria-labelledby={`g-${b}`}>
            <h2 id={`g-${b}`} className="flex items-baseline justify-between border-b border-ink/80 pb-2">
              <span className="t-heading">{BUCKET_NAME[b]}</span>
              <span className="t-small text-ink-3">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="t-small border-b border-line px-1 py-4 text-ink-3">{EMPTY[b]}</p>
            ) : (
              <ul>
                {list.map((t) => (
                  <Row key={t.id} t={t} today={today} onOpen={onOpen} actions={actions} announce={announce} />
                ))}
              </ul>
            )}
            {b === "done" && earlier.length > 0 && (
              <div className="mt-2">
                <button type="button" className="btn btn-quiet gap-1 px-1 text-[14px]" aria-expanded={older} onClick={() => setOlder((v) => !v)}>
                  <ChevronDown className={`size-4 transition-transform ${older ? "rotate-180" : ""}`} /> Finished before today ({earlier.length})
                </button>
                {older && (
                  <ul>
                    {earlier.slice(0, 50).map((t) => (
                      <Row key={t.id} t={t} today={today} onOpen={onOpen} actions={actions} announce={announce} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Row({ t, today, onOpen, actions, announce }: { t: Task; today: string; onOpen: (t: Task) => void; actions: Actions; announce: (s: string) => void }) {
  const done = t.bucket === "done";
  return (
    <li className="flex items-center border-b border-line">
      <button type="button" onClick={() => onOpen(t)} className="row min-w-0 flex-1 border-b-0">
        <span className={`size-2 shrink-0 rounded-full ${done ? "bg-coral" : t.bucket === "today" ? "bg-signal" : "bg-ink-3/40"}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={`block text-[16px] [overflow-wrap:anywhere] ${done ? "text-ink-3 line-through decoration-ink-3/50" : ""}`}>{t.title}</span>
          {!done && (t.step || t.due) && (
            <span className="t-small mt-0.5 block truncate text-ink-3">
              {t.due && <span className="text-ink-2">{prettyDue(t.due, today)}</span>}
              {t.due && t.step && " · "}
              {t.step}
            </span>
          )}
        </span>
      </button>
      {done && (
        <button
          type="button"
          className="icon-btn"
          aria-label={`Put back: ${t.title}`}
          onClick={() => {
            actions.restore(t.id);
            announce(`${t.title} is back on your list.`);
          }}
        >
          <RotateCcw className="size-4" />
        </button>
      )}
    </li>
  );
}
