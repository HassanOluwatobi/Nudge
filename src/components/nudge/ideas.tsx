"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Bell, BellOff, ListTodo, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, type Entry, NUDGE_DAYS, type State, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";

type Filter = "all" | "idea" | "note" | "archived";

const when = (iso: string) => {
  const d = new Date(iso);
  const today = ymd();
  const day = ymd(d);
  if (day === today) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (day === addDays(today, -1)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function Ideas({ state, actions }: { state: State; actions: Actions }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const list = state.entries
    .filter((e) => (filter === "archived" ? e.status === "archived" : e.status === "open"))
    .filter((e) => filter === "all" || filter === "archived" || e.kind === filter)
    .filter((e) => !q || e.text.toLowerCase().includes(q.toLowerCase()));

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "idea", label: "Ideas" },
    { id: "note", label: "Notes" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div>
      <header className="px-1">
        <p className="text-[13px] text-muted-foreground">Saved for later</p>
        <h1 className="mt-0.5 font-serif text-[30px] leading-tight tracking-tight">Ideas and notes</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Ideas come back now and then so you remember them. Notes stay quiet until you need them.
        </p>
      </header>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-card px-3.5 shadow-sm">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your ideas and notes"
          aria-label="Search"
          className="h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              filter === f.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-12 px-6 text-center">
          <p className="font-serif text-xl">{filter === "archived" ? "Nothing archived." : "Nothing here yet."}</p>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Start a thought with &ldquo;idea&rdquo; or &ldquo;note&rdquo;, or just type it below. You can move anything with one tap.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {list.map((e) => (
            <EntryCard key={e.id} entry={e} actions={actions} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryCard({ entry: e, actions }: { entry: Entry; actions: Actions }) {
  const archived = e.status === "archived";
  return (
    <li className="nm-rise rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            e.kind === "idea" ? "bg-idea text-idea-foreground" : "bg-note text-note-foreground"
          )}
        >
          {e.kind === "idea" ? "Idea" : "Note"}
        </span>
        <span className="text-xs text-muted-foreground">{when(e.createdAt)}</span>
        {e.remind && !archived && <Bell className="ml-auto size-3.5 text-muted-foreground" aria-label="Reminders on" />}
      </div>
      <textarea
        value={e.text}
        onChange={(ev) => actions.patchEntry(e.id, { text: ev.target.value })}
        rows={1}
        aria-label={`${e.kind} text`}
        className="mt-2 field-sizing-content w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!archived && (
          <button
            type="button"
            onClick={() => {
              actions.entryToTask(e.id);
              toast("Added to This week as a task.");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <ListTodo className="size-3.5" /> Make it a task
          </button>
        )}
        {!archived && (
          <button
            type="button"
            onClick={() =>
              actions.patchEntry(e.id, {
                remind: !e.remind,
                nextNudge: !e.remind ? addDays(ymd(), NUDGE_DAYS[Math.min(e.nudgeCount, NUDGE_DAYS.length - 1)]) : e.nextNudge,
              })
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {e.remind ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
            {e.remind ? "Stop reminders" : "Remind me"}
          </button>
        )}
        <button
          type="button"
          onClick={() => actions.patchEntry(e.id, { status: archived ? "open" : "archived" })}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {archived ? "Bring back" : "Archive"}
        </button>
      </div>
    </li>
  );
}
