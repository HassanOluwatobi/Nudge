"use client";

import { Bell, CalendarPlus, X } from "lucide-react";
import { toast } from "sonner";
import { askNotify, remindChoices, remindOnce } from "@/lib/reminders";
import { type Task, prettyWhen } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";

const localInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Reminders without a server. NudgeMe pings you while it is open or installed,
 * and one tap adds the reminder to your phone's calendar so it rings even when closed.
 */
export function RemindPicker({ task, actions, compact = false }: { task: Task; actions: Actions; compact?: boolean }) {
  const set = async (when: Date) => {
    actions.patch(task.id, { remindAt: when.toISOString() });
    await askNotify();
    toast(`Reminder set for ${prettyWhen(when.toISOString())}.`);
  };

  if (task.remindAt) {
    return (
      <div className="mt-2 rounded-2xl bg-white p-3 ring-1 ring-line">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-signal-ink" />
          <span className="flex-1 text-[15px] font-medium">{prettyWhen(task.remindAt)}</span>
          <button type="button" className="icon-btn size-9" aria-label="Remove reminder" onClick={() => actions.patch(task.id, { remindAt: undefined })}>
            <X className="size-4" />
          </button>
        </div>
        <button type="button" className="btn btn-line mt-2 min-h-11 w-full gap-2 text-[15px]" onClick={() => remindOnce(task.title, new Date(task.remindAt!))}>
          <CalendarPlus className="size-4" /> Add to my calendar too
        </button>
        {!compact && <p className="t-small mt-2 text-ink-3">Your calendar rings even when NudgeMe is closed. NudgeMe also pings you while it is open.</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {remindChoices().map((c) => (
        <button key={c.label} type="button" className="chip" onClick={() => set(c.when)}>
          {c.label}
        </button>
      ))}
      <label className="chip relative cursor-pointer">
        Pick a time
        <input
          type="datetime-local"
          aria-label="Pick a reminder time"
          className="absolute inset-0 cursor-pointer opacity-0"
          min={localInput(new Date())}
          onChange={(e) => e.target.value && set(new Date(e.target.value))}
        />
      </label>
    </div>
  );
}
