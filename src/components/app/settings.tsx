"use client";

import { Bell, CalendarPlus, Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AI_NAME } from "@/lib/ai";
import { askNotify, canNotify, downloadIcs, googleLink, platform, prettyTime } from "@/lib/reminders";
import { type Settings as S, type State, sanitize, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Sheet } from "./sheet";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Reminders, check-ins, your AI, and your data. Plain words throughout. */
export function Settings({ open, onClose, state, actions, onCheckin }: { open: boolean; onClose: () => void; state: State; actions: Actions; onCheckin: (k: "morning" | "evening" | "weekly") => void }) {
  const [clear, setClear] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const s = state.settings;
  const count = state.tasks.length + state.entries.length;
  const plat = typeof window === "undefined" ? "other" : platform();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nudgeme-${ymd()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importData = async (f: File) => {
    try {
      const next = sanitize(JSON.parse(await f.text()));
      if (!next.tasks.length && !next.entries.length) return toast("That file has nothing in it. Nothing changed.");
      const before = state;
      actions.replaceAll(next);
      toast(`Loaded ${next.tasks.length} tasks and ${next.entries.length} ideas.`, { action: { label: "Undo", onClick: () => actions.replaceAll(before) } });
      onClose();
    } catch {
      toast("That file could not be read. Nothing changed.");
    }
  };

  return (
    <Sheet open={open} onClose={() => (setClear(false), onClose())} title="Settings">
      {/* Check-ins and reminders */}
      <section className="mt-2">
        <h3 className="t-label">Daily check-ins</h3>
        <div className="mt-2 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
          {(["morning", "evening"] as const).map((k) => (
            <label key={k} className="flex min-h-[56px] items-center justify-between px-4">
              <span>
                <span className="block font-medium">{k === "morning" ? "Morning kickoff" : "Evening wrap-up"}</span>
                <button type="button" className="t-small text-signal-ink underline-offset-2 hover:underline" onClick={(e) => (e.preventDefault(), onClose(), onCheckin(k))}>
                  Do it now
                </button>
              </span>
              <input type="time" value={s[k]} onChange={(e) => e.target.value && actions.setSettings({ [k]: e.target.value } as Partial<S>)} className="rounded-xl bg-paper px-3 py-2 text-[16px] font-medium tabular-nums" aria-label={`${k} check-in time`} />
            </label>
          ))}
          <label className="flex min-h-[56px] items-center justify-between px-4">
            <span>
              <span className="block font-medium">Weekly reset</span>
              <button type="button" className="t-small text-signal-ink underline-offset-2 hover:underline" onClick={(e) => (e.preventDefault(), onClose(), onCheckin("weekly"))}>
                Do it now
              </button>
            </span>
            <select value={s.weeklyDay} onChange={(e) => actions.setSettings({ weeklyDay: Number(e.target.value) })} className="rounded-xl bg-paper px-3 py-2 text-[16px] font-medium" aria-label="Weekly reset day">
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Reminders</h3>
        <div className="mt-2 rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="font-medium">Get nudged even when NudgeMe is closed</p>
          <p className="t-small mt-1 text-ink-2">
            Your phone&apos;s calendar rings at {prettyTime(s.morning)} and {prettyTime(s.evening)} every day and opens NudgeMe. Free and private.
          </p>
          {plat === "android" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["morning", "evening"] as const).map((k) => (
                <a key={k} href={googleLink(k, s[k])} target="_blank" rel="noopener noreferrer" className="btn btn-line min-h-11 gap-1.5 px-3 text-[14px]" onClick={() => actions.setSettings({ calendarAdded: ymd() })}>
                  <CalendarPlus className="size-4" /> Add {k}
                </a>
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-line mt-3 min-h-11 w-full gap-2 text-[15px]" onClick={() => (downloadIcs({ morning: s.morning, evening: s.evening }), actions.setSettings({ calendarAdded: ymd() }))}>
              <CalendarPlus className="size-4" /> {s.calendarAdded ? "Add to my calendar again" : "Add to my calendar"}
            </button>
          )}
          {s.calendarAdded && <p className="t-small mt-2 text-success">Added. If you change the times, add them again.</p>}

          {canNotify() && (
            <label className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Bell className="size-4" /> Notifications
                </span>
                <span className="t-small block text-ink-2">Task reminders and check-ins while NudgeMe is open or installed.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={s.notify}
                onChange={async (e) => {
                  if (!e.target.checked) return actions.setSettings({ notify: false });
                  const ok = await askNotify();
                  actions.setSettings({ notify: ok });
                  if (!ok) toast("Notifications are blocked in this browser's settings.");
                }}
                className="peer sr-only"
              />
              <span aria-hidden className="relative h-8 w-[52px] shrink-0 rounded-full bg-[#ddd6c8] transition-colors peer-checked:bg-signal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-signal after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Your AI helper</h3>
        <p className="t-small mt-1 text-ink-2">NudgeMe opens your own AI app to break tasks into steps. No account here, no cost.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(AI_NAME) as S["ai"][]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={s.ai === k} onClick={() => actions.setSettings({ ai: k })}>
              {AI_NAME[k]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Your data</h3>
        <div className="mt-2 rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="font-medium">Everything stays on this device</p>
          <p className="t-small mt-1 text-ink-2">No account, and nothing is sent to a server. Voice typing uses your browser&apos;s own speech feature, and some browsers send audio to their online service for it. Clearing your browser data also clears NudgeMe, so save a copy now and then.</p>
        </div>
        <div className="mt-2 grid gap-2">
          <button type="button" className="btn btn-line w-full justify-start gap-3" onClick={exportData} disabled={!count}>
            <Download className="size-[18px] text-ink-2" /> Save a copy of my data
          </button>
          <button type="button" className="btn btn-line w-full justify-start gap-3" onClick={() => file.current?.click()}>
            <Upload className="size-[18px] text-ink-2" /> Load a saved copy
          </button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => (e.target.files?.[0] && importData(e.target.files[0]), (e.target.value = ""))} />
          {clear ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-danger-soft p-2 pl-4" role="group" aria-label="Confirm clear">
              <span className="text-[15px]">Delete everything?</span>
              <div className="flex gap-1">
                <button type="button" className="btn btn-quiet min-h-11" onClick={() => setClear(false)}>
                  Keep
                </button>
                <button type="button" className="btn btn-danger min-h-11 px-4" onClick={() => (actions.clearAll(), setClear(false), onClose(), toast("Everything was cleared."))}>
                  Delete all
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-quiet w-full justify-start gap-3 text-danger" onClick={() => setClear(true)} disabled={!count}>
              <Trash2 className="size-[18px]" /> Clear everything
            </button>
          )}
        </div>
        <p className="t-small mt-4 text-ink-3">Add NudgeMe to your home screen from your browser&apos;s Share or menu button. It works offline after the first visit.</p>
      </section>
    </Sheet>
  );
}
