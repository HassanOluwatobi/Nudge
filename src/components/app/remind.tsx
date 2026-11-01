"use client";

import { Bell, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { feel } from "@/lib/feedback";
import { askNotify, remindChoices, taskEvent } from "@/lib/reminders";
import { CalendarButtons } from "./calendars";
import { type Task, addDays, prettyWhen, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";

/**
 * Reminders without a server. Shrink my day pings you while it is open or installed,
 * and one tap adds the reminder to your phone's calendar so it rings even when closed.
 * Nothing is set until the person confirms a time.
 */
export function RemindPicker({ task, actions, compact = false }: { task: Task; actions: Actions; compact?: boolean }) {
  const [picking, setPicking] = useState(false);
  const today = ymd();
  const [day, setDay] = useState<string>("");
  const [time, setTime] = useState<string>("");

  const when = day && time ? new Date(`${day}T${time}`) : null;
  const valid = !!when && when.getTime() > Date.now();

  const set = async (d: Date) => {
    actions.patch(task.id, { remindAt: d.toISOString() });
    feel("save", "success");
    setPicking(false);
    setDay("");
    setTime("");
    await askNotify();
    toast(`Reminder set for ${prettyWhen(d.toISOString())}.`);
  };

  if (task.remindAt) {
    return (
      <div className="mt-2 rounded-2xl bg-white p-3 ring-1 ring-line">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-signal-ink" />
          <span className="flex-1 text-[15px] font-medium">{prettyWhen(task.remindAt)}</span>
          <button type="button" className="btn btn-quiet min-h-9 px-2 text-[14px]" onClick={() => (actions.patch(task.id, { remindAt: undefined }), feel("tap"))}>
            Remove
          </button>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <p className="t-small mb-1 text-ink-2">{compact ? "Add it to a calendar so your phone rings." : "Add it to your calendar so your phone rings, even with Shrink my day closed."}</p>
          <CalendarButtons flat events={[taskEvent(task.title, new Date(task.remindAt!))]} file="nudgeme-reminder" label="" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-2">
        {remindChoices().map((c) => (
          <button key={c.label} type="button" className="chip" onClick={() => set(c.when)}>
            {c.label}
          </button>
        ))}
        <button type="button" className="chip" aria-expanded={picking} aria-pressed={picking} onClick={() => (setPicking((v) => !v), feel("tap"))}>
          Pick a time
        </button>
      </div>
      <AnimatePresence initial={false}>
        {picking && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.34 }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <p className="t-small font-semibold text-ink-2">Day</p>
                <button type="button" className="icon-btn size-8 text-ink-3" aria-label="Close time picker" onClick={() => setPicking(false)}>
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button type="button" className="chip" aria-pressed={day === today} onClick={() => setDay(today)}>
                  Today
                </button>
                <button type="button" className="chip" aria-pressed={day === addDays(today, 1)} onClick={() => setDay(addDays(today, 1))}>
                  Tomorrow
                </button>
                <label className="chip relative cursor-pointer" aria-pressed={!!day && day !== today && day !== addDays(today, 1)}>
                  {day && day !== today && day !== addDays(today, 1) ? new Date(day + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "Another day"}
                  <input type="date" aria-label="Pick a day" min={today} className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => e.target.value && setDay(e.target.value)} />
                </label>
              </div>
              <label htmlFor={`rt-${task.id}`} className="t-small mt-3 block font-semibold text-ink-2">
                Time
              </label>
              <input id={`rt-${task.id}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field mt-1.5 tabular-nums" />
              <button type="button" disabled={!valid} className="btn btn-signal mt-3 min-h-12 w-full" onClick={() => when && set(when)}>
                {!day || !time ? "Choose a day and time" : valid ? `Remind me ${prettyWhen(when!.toISOString())}` : "That time has passed"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
