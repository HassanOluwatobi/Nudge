"use client";

import { Bell, ChevronDown, CircleHelp, Download, Trash2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AI_NAME } from "@/lib/ai";
import { feel } from "@/lib/feedback";
import { askNotify, canNotify, dailyEvents, platform, prettyTime } from "@/lib/reminders";
import { type Settings as S, type State, sanitize, ymd } from "@/lib/tasks";
import type { Source } from "@/lib/sync";
import type { Actions } from "@/lib/use-tasks";
import { CalendarButtons } from "./calendars";
import { SourceButtons } from "./import";
import { InstallButton } from "./install";
import { downloadBackup } from "@/lib/backup";
import { Sheet } from "./sheet";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const X_URL = "https://x.com/Art_sassin";

function Switch({ label, hint, checked, onChange, icon }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-4">
      <span>
        <span className="flex items-center gap-1.5 font-medium">
          {icon}
          {label}
        </span>
        <span className="t-small block text-ink-2">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="switch-track" />
    </label>
  );
}

const XMark = () => (
  <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden>
    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
  </svg>
);

const SUPPORT_URL = "https://selar.com/showlove/hassanx";

/** Made by Hassan. Shown at the top of Settings and the foot of Today. */
export function Credit({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white ring-1 ring-line ${compact ? "p-3" : "p-3.5"}`}>
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hassan.jpg" alt="Hassan" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover ring-1 ring-line" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Made by Hassan</span>
          <span className="t-small block truncate whitespace-nowrap text-ink-2">Say hi or share feedback</span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={X_URL} target="_blank" rel="noopener noreferrer" onClick={() => feel("tap", "light")} className="btn btn-ink min-h-10 gap-1.5 px-3 text-[13px]">
          <XMark /> @Art_sassin
        </a>
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" onClick={() => feel("save", "light")} className="btn btn-line min-h-10 gap-1.5 px-3 text-[13px]">
          <span aria-hidden>☕</span> Buy me a coffee
        </a>
      </div>
    </div>
  );
}

/** Reminders, check-ins, your AI, and your data. Plain words throughout. */
export function Settings({ open, onClose, state, actions, onCheckin, onGuide, onImport }: { open: boolean; onClose: () => void; state: State; actions: Actions; onCheckin: (k: "morning" | "evening" | "weekly") => void; onGuide: () => void; onImport: (s: Source) => void }) {
  const [clear, setClear] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const s = state.settings;
  const count = state.tasks.length + state.entries.length;

  const exportData = () => {
    downloadBackup(state);
    feel("save", "medium");
    actions.setSettings({ lastBackup: new Date().toISOString() });
    toast("Backup downloaded. Keep it somewhere safe.");
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
    <Sheet open={open} onClose={() => (setClear(false), setDataOpen(false), onClose())} title="Settings">
      <div className="mt-2">
        <Credit compact />
      </div>
      <div className="mt-3">
        <InstallButton variant="row" />
      </div>

      <section className="mt-4">
        <h3 className="t-label">Daily check-ins</h3>
        <div className="mt-2 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
          {(["morning", "evening"] as const).map((k) => (
            <div key={k} className="flex min-h-[72px] items-center justify-between px-4 py-2.5">
              <span>
                <span className="block font-medium">{k === "morning" ? "Morning kickoff" : "Evening wrap-up"}</span>
                <button type="button" className="t-small text-signal-ink" onClick={() => (onClose(), onCheckin(k))}>
                  Do it now
                </button>
              </span>
              <input type="time" value={s[k]} onChange={(e) => e.target.value && actions.setSettings({ [k]: e.target.value } as Partial<S>)} className="rounded-xl bg-white px-3 py-2 text-[16px] font-medium tabular-nums ring-1 ring-line" aria-label={`${k} check-in time`} />
            </div>
          ))}
          <div className="flex min-h-[72px] items-center justify-between px-4 py-2.5">
            <span>
              <span className="block font-medium">Weekly reset</span>
              <button type="button" className="t-small text-signal-ink" onClick={() => (onClose(), onCheckin("weekly"))}>
                Do it now
              </button>
            </span>
            <label className="relative inline-flex h-11 items-center gap-1.5 rounded-xl bg-white pl-3.5 pr-2.5 text-[16px] font-medium ring-1 ring-line">
              <span>{s.weeklyDay < 0 ? "Never" : DAYS[s.weeklyDay]}</span>
              <ChevronDown className="size-4 text-ink-3" />
              <select value={s.weeklyDay} onChange={(e) => (actions.setSettings({ weeklyDay: Number(e.target.value) }), feel("tick", "light"))} className="absolute inset-0 cursor-pointer appearance-none opacity-0" aria-label="Weekly reset day">
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
                <option value={-1}>Never</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Reminders</h3>
        <p className="t-small mb-3 mt-1 text-ink-2">
          Add your check-ins to a calendar. It rings every day at {prettyTime(s.morning)} and {prettyTime(s.evening)}, even when NudgeMe is closed.
        </p>
        <CalendarButtons events={dailyEvents({ morning: s.morning, evening: s.evening })} file="nudgeme-check-ins" onAdded={() => actions.setSettings({ calendarAdded: ymd() })} label={s.calendarAdded ? "Added. If you change the times, add them again." : ""} />
        <div className="mt-3 rounded-2xl bg-white px-4 ring-1 ring-line">
          {canNotify() ? (
            <Switch
              icon={<Bell className="size-4" />}
              label="Notifications"
              hint="Phone alerts for task reminders and check-ins while NudgeMe is open or in the background. For alerts when it is fully closed, add them to your calendar above."
              checked={s.notify}
              onChange={async (v) => {
                if (!v) return actions.setSettings({ notify: false });
                const ok = await askNotify();
                actions.setSettings({ notify: ok });
                if (!ok) toast("Notifications are blocked in this browser's settings.");
                else feel("save", "success");
              }}
            />
          ) : (
            <div className="py-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Bell className="size-4" /> Notifications
              </span>
              <span className="t-small mt-0.5 block text-ink-2">
                {platform() === "ios" ? "On iPhone, add NudgeMe to your Home Screen first. Then open it from there and turn this on." : "This browser does not offer notifications. Calendar reminders above still work."}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Bring in your calendar</h3>
        <p className="t-small mb-3 mt-1 text-ink-2">Turn your events into tasks with reminders. NudgeMe only reads your calendar, it never edits it.</p>
        <SourceButtons state={state} onPick={(src) => (onClose(), onImport(src))} />
      </section>

      <section className="mt-6">
        <h3 className="t-label">Sound and touch</h3>
        <div className="mt-2 rounded-2xl bg-white px-4 ring-1 ring-line">
          <Switch label="Sounds" hint="A soft little sound when you finish something." checked={s.sound} onChange={(v) => (actions.setSettings({ sound: v }), v && setTimeout(() => feel("done"), 50))} />
          <div className="border-t border-line" />
          <Switch label="Haptics" hint="A gentle buzz when you tick things off." checked={s.haptics} onChange={(v) => (actions.setSettings({ haptics: v }), v && setTimeout(() => feel("tick", "success"), 50))} />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Your AI helper</h3>
        <p className="t-small mt-1 text-ink-2">Pick the AI you already use. When a task feels too big, tap Break it down. It opens your AI with the question ready, and you paste the steps back. Free.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(AI_NAME) as S["ai"][]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={s.ai === k} onClick={() => (actions.setSettings({ ai: k }), feel("tap", "light"), toast(`Done. Break it down now opens ${AI_NAME[k]}.`))}>
              {AI_NAME[k]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white ring-1 ring-line">
        <button type="button" aria-expanded={dataOpen} onClick={() => (setDataOpen((v) => !v), feel("tap", "light"))} className="flex min-h-[72px] w-full items-center justify-between px-4 py-3 text-left">
          <span>
            <span className="block font-medium">Your data</span>
            <span className="t-small text-ink-2">
              Stays on this device.{" "}
              <span className={!s.lastBackup || Date.now() - Date.parse(s.lastBackup) > 14 * 864e5 ? "font-semibold text-danger" : ""}>
                {s.lastBackup ? `Last backup ${new Date(s.lastBackup).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.` : "No backup yet."}
              </span>
            </span>
          </span>
          <motion.span animate={{ rotate: dataOpen ? 180 : 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
            <ChevronDown className="size-5 text-ink-3" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {dataOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.36 }} className="overflow-hidden">
              <div className="border-t border-line px-4 pb-4 pt-3">
                <ol className="space-y-2">
                  {[
                    "There's no account. Everything you add lives on this phone.",
                    "Nothing goes to a server. I never see your tasks.",
                    "If you connect Calendly or an Apple calendar link, the token or link is saved on this phone as plain text. It passes through a NudgeMe relay that stores nothing. You can remove it any time.",
                    "Voice typing uses your browser's speech feature. Some browsers send the audio to their own online service.",
                    "If you clear your browser data, NudgeMe gets cleared too. Download a backup first.",
                  ].map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink-2">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-semibold tabular-nums text-ink">{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 grid gap-2">
                  <button type="button" className="btn btn-line w-full justify-start gap-3 px-4" onClick={exportData} disabled={!count}>
                    <Download className="size-[18px] text-ink-2" />
                    <span className="text-left">
                      <span className="block">Download a backup</span>
                    </span>
                  </button>
                  <p className="t-small -mt-1 px-1 text-ink-3">Saves one file with all your tasks, ideas and settings.</p>
                  <button type="button" className="btn btn-line w-full justify-start gap-3 px-4" onClick={() => file.current?.click()}>
                    <Upload className="size-[18px] text-ink-2" /> Restore from a backup
                  </button>
                  <p className="t-small -mt-1 px-1 text-ink-3">Loads that file back, for example on a new phone. You can undo.</p>
                  <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => (e.target.files?.[0] && importData(e.target.files[0]), (e.target.value = ""))} />
                  {clear ? (
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-danger-soft p-2 pl-4" role="group" aria-label="Confirm clear">
                      <span className="text-[15px]">Delete everything?</span>
                      <div className="flex gap-1">
                        <button type="button" className="btn btn-quiet min-h-11" onClick={() => setClear(false)}>
                          Keep
                        </button>
                        <button type="button" className="btn btn-danger min-h-11 px-4" onClick={() => (actions.clearAll(), feel("undo", "warning"), setClear(false), onClose(), toast("Everything was cleared."))}>
                          Delete all
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-quiet w-full justify-start gap-3 px-4 text-danger" onClick={() => (setClear(true), feel("tap", "warning"))} disabled={!count}>
                      <Trash2 className="size-[18px]" /> Clear everything
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="mt-6">
        <h3 className="t-label">Help</h3>
        <button type="button" className="btn btn-line mt-2 w-full gap-2" onClick={() => (onClose(), onGuide())}>
          <CircleHelp className="size-[18px]" /> How NudgeMe works
        </button>
      </section>
    </Sheet>
  );
}
