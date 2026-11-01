"use client";

import { Bell, CalendarPlus, CircleHelp, Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AI_NAME } from "@/lib/ai";
import { askNotify, canNotify, downloadIcs, googleLink, platform, prettyTime } from "@/lib/reminders";
import { type Settings as S, type State, sanitize, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { Art } from "./art";
import { Sheet } from "./sheet";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Reminders, check-ins, your AI, and your data. Plain words throughout. */
// Fill in to show a support button in the credit card.
const SUPPORT_URL = "";
const X_URL = "https://x.com/Art_sassin";

function Switch({ label, hint, checked, onChange, icon }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
      <span>
        <span className="flex items-center gap-1.5 font-medium">
          {icon}
          {label}
        </span>
        <span className="t-small block text-ink-2">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-8 w-[52px] shrink-0 rounded-full bg-[#ddd6c8] transition-colors duration-200 peer-checked:bg-signal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:shadow-[0_2px_4px_rgb(6_11_43/0.25)] after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.32,0.72,0,1)] peer-checked:after:translate-x-5" />
    </label>
  );
}

export function Settings({ open, onClose, state, actions, onCheckin, onGuide }: { open: boolean; onClose: () => void; state: State; actions: Actions; onCheckin: (k: "morning" | "evening" | "weekly") => void; onGuide: () => void }) {
  const [clear, setClear] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const s = state.settings;
  const count = state.tasks.length + state.entries.length;
  const plat = typeof window === "undefined" ? "other" : platform();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nudgeme-backup-${ymd()}.json`;
    a.click();
    feel("save", "light");
    toast("Backup downloaded. Keep the file somewhere safe.");
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importData = async (f: File) => {
    try {
      const next = sanitize(JSON.parse(await f.text()));
      if (!next.tasks.length && !next.entries.length) return toast("That file has nothing in it. Nothing changed.");
      const before = state;
      actions.replaceAll(next);
      feel("save", "success");
      toast(`Restored ${next.tasks.length} tasks and ${next.entries.length} ideas.`, { action: { label: "Undo", onClick: () => actions.replaceAll(before) } });
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
              <input type="time" value={s[k]} onChange={(e) => e.target.value && actions.setSettings({ [k]: e.target.value } as Partial<S>)} className="rounded-xl bg-[#f4efe6] px-3 py-2 text-[16px] font-medium tabular-nums" aria-label={`${k} check-in time`} />
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
            <div className="mt-3 border-t border-line">
              <Switch
                icon={<Bell className="size-4" />}
                label="Notifications"
                hint="Task reminders and check-ins while NudgeMe is open or installed."
                checked={s.notify}
                onChange={async (v) => {
                  if (!v) return actions.setSettings({ notify: false });
                  const ok = await askNotify();
                  actions.setSettings({ notify: ok });
                  if (!ok) toast("Notifications are blocked in this browser's settings.");
                  else feel("save", "success");
                }}
              />
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Sound and touch</h3>
        <div className="mt-2 rounded-2xl bg-white px-4 ring-1 ring-line">
          <Switch label="Sounds" hint="Soft wooden taps and chimes when you get things done." checked={s.sound} onChange={(v) => (actions.setSettings({ sound: v }), v && setTimeout(() => feel("done"), 50))} />
          <div className="border-t border-line" />
          <Switch label="Haptics" hint="Small vibrations on taps and wins, where your phone supports it." checked={s.haptics} onChange={(v) => (actions.setSettings({ haptics: v }), v && setTimeout(() => feel("tick", "success"), 50))} />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Your AI helper</h3>
        <p className="t-small mt-1 text-ink-2">Pick the AI app you already use. In any task, tap “Break it down” and NudgeMe opens it with the question ready. You paste the steps back. No account here, no cost.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(AI_NAME) as S["ai"][]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={s.ai === k} onClick={() => (actions.setSettings({ ai: k }), feel("tap", "light"), toast(`Break it down will now open ${AI_NAME[k]}.`))}>
              {AI_NAME[k]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Your data</h3>
        <div className="mt-2 rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="font-medium">Everything stays on this device</p>
          <p className="t-small mt-1 text-ink-2">No account, and nothing is sent to a server. Voice typing uses your browser&apos;s own speech feature, and some browsers send audio to their online service for it. Clearing your browser data also clears NudgeMe.</p>
          <p className="t-small mt-2 text-ink-2">
            <span className="font-semibold text-ink">Download a backup</span> saves one file with all your tasks, ideas and settings. Keep it somewhere safe.{" "}
            <span className="font-semibold text-ink">Restore from a backup</span> loads that file back, for example on a new phone or after clearing your browser. It replaces what is here now, and you can undo.
          </p>
        </div>
        <div className="mt-2 grid gap-2">
          <button type="button" className="btn btn-line w-full justify-start gap-3" onClick={exportData} disabled={!count}>
            <Download className="size-[18px] text-ink-2" /> Download a backup
          </button>
          <button type="button" className="btn btn-line w-full justify-start gap-3" onClick={() => file.current?.click()}>
            <Upload className="size-[18px] text-ink-2" /> Restore from a backup
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

      <section className="mt-6">
        <button type="button" className="btn btn-line w-full gap-2" onClick={() => (onClose(), onGuide())}>
          <CircleHelp className="size-[18px]" /> How NudgeMe works
        </button>
      </section>

      <section className="mt-6 overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
        <div className="relative h-20">
          <Art mode={0} shift={0.25} />
        </div>
        <div className="p-4">
          <p className="t-label">Made by</p>
          <p className="mt-1 text-[19px] font-semibold tracking-[-0.01em]">Hassan</p>
          <p className="t-small mt-1 text-ink-2">A designer in Lagos building calm tools for busy minds. Say hi, share feedback, or follow along as NudgeMe grows.</p>
          <div className={`mt-3 grid gap-2 ${SUPPORT_URL ? "grid-cols-2" : ""}`}>
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ink min-h-11 gap-2 text-[15px]">
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
              </svg>
              @Art_sassin
            </a>
            {SUPPORT_URL && (
              <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-line min-h-11 gap-2 text-[15px]">
                ☕ Buy me a coffee
              </a>
            )}
          </div>
        </div>
      </section>
    </Sheet>
  );
}
