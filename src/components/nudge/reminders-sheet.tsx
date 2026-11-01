"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarPlus, Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { ymd, type State } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { DEFAULT_TIMES, downloadIcs, googleLink, platform, prettyTime, type Platform, type ReminderTimes } from "@/lib/reminders";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

const MORNINGS = ["07:00", "08:00", "08:30", "09:00"];
const EVENINGS = ["19:00", "20:00", "21:00", "22:00"];

function Chips({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "h-11 flex-1 rounded-full px-2 text-[15px] font-semibold whitespace-nowrap transition-colors",
            value === o ? "bg-[var(--plum)] text-white" : "bg-[#f3ece9] text-[var(--plum)] hover:bg-[#ebe1dd]"
          )}
        >
          {prettyTime(o)}
        </button>
      ))}
    </div>
  );
}

/** Daily nudges through the phone's own calendar. Works when NudgeMe is closed. */
export function RemindersSheet({ open, onClose, state, actions }: { open: boolean; onClose: () => void; state: State; actions: Actions }) {
  const saved = state.meta.reminders;
  const [times, setTimes] = useState<ReminderTimes>(saved ? { morning: saved.morning, evening: saved.evening } : DEFAULT_TIMES);
  const [os, setOs] = useState<Platform>("other");
  const [added, setAdded] = useState<{ morning?: boolean; evening?: boolean }>({});
  useEffect(() => setOs(platform()), []);
  useEffect(() => {
    if (open) setAdded({});
  }, [open]);

  const save = () => actions.setMeta({ reminders: { ...times, added: ymd() } });
  const google = (kind: "morning" | "evening") => {
    window.open(googleLink(kind, times[kind]), "_blank", "noopener");
    setAdded((a) => ({ ...a, [kind]: true }));
    save();
  };
  const ics = () => {
    downloadIcs(times);
    setAdded({ morning: true, evening: true });
    save();
  };

  const both = added.morning && added.evening;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} showSwipeHandle>
      <DrawerContent className="mx-auto w-full max-w-xl bg-[#fffaf7]">
        <div className="overflow-y-auto px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <span className="grid size-12 place-items-center rounded-full bg-[#efe9ff] text-[#6b4fd8]">
            <BellRing className="size-6" />
          </span>
          <DrawerTitle className="mt-3 font-serif text-[28px] leading-tight font-normal tracking-tight text-[var(--plum)]">Get a reminder every day</DrawerTitle>
          <DrawerDescription className="mt-1 text-left text-[15px] text-muted-foreground text-pretty">
            Your phone&apos;s calendar will remind you, even when NudgeMe is closed. Two short reminders a day. Nothing else.
          </DrawerDescription>

          <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_10px_30px_-20px_rgb(120_70_90/0.35)]">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--plum)]">
              <Sun className="size-4 text-[#e8a33d]" /> Morning: choose your one thing
            </p>
            <Chips label="Morning time" value={times.morning} options={MORNINGS} onChange={(v) => setTimes((t) => ({ ...t, morning: v }))} />
            <p className="mt-5 flex items-center gap-2 text-[15px] font-semibold text-[var(--plum)]">
              <Moon className="size-4 text-[#7c5df2]" /> Evening: tick off your day
            </p>
            <Chips label="Evening time" value={times.evening} options={EVENINGS} onChange={(v) => setTimes((t) => ({ ...t, evening: v }))} />
          </div>

          {both ? (
            <div className="mt-5 rounded-3xl bg-[#e3f5eb] p-4 text-[15px] text-[#235f40]">
              <p className="flex items-center gap-2 font-semibold">
                <Check className="size-5" strokeWidth={3} /> Done. See you at {prettyTime(times.morning)}.
              </p>
              <p className="mt-1 text-[14px]">
                {os === "ios" ? "If your calendar asked, tap Add All." : "Check that your calendar saved both reminders."} To stop them, delete them in your calendar.
              </p>
              <button type="button" onClick={onClose} className="candy mt-4 h-[52px] w-full text-[16px]">
                Close
              </button>
            </div>
          ) : os === "android" ? (
            <div className="mt-5 space-y-2.5">
              <button type="button" onClick={() => google("morning")} disabled={added.morning} className="candy h-[56px] w-full text-[16px]">
                {added.morning ? <Check className="size-5" strokeWidth={3} /> : <CalendarPlus className="size-5" />}
                {added.morning ? "Morning reminder added" : "1. Add morning reminder"}
              </button>
              <button type="button" onClick={() => google("evening")} disabled={!added.morning} className={cn("candy h-[56px] w-full text-[16px]", !added.morning && "candy-soft")}>
                <CalendarPlus className="size-5" /> 2. Add evening reminder
              </button>
              <p className="pt-1 text-center text-[13px] text-muted-foreground">Google Calendar opens. Tap Save, then come back here.</p>
            </div>
          ) : os === "ios" ? (
            <div className="mt-5">
              <button type="button" onClick={ics} className="candy h-[56px] w-full text-[16px]">
                <CalendarPlus className="size-5" /> Add to my calendar
              </button>
              <p className="pt-2 text-center text-[13px] text-muted-foreground">Your calendar opens. Tap Add All.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              <button type="button" onClick={ics} className="candy h-[56px] w-full text-[16px]">
                <CalendarPlus className="size-5" /> Add to my calendar
              </button>
              <p className="text-center text-[13px] text-muted-foreground">Works with Apple Calendar and Outlook.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={() => google("morning")} className="candy candy-soft h-12 text-[14px]">
                  {added.morning && <Check className="size-4" />} Google: morning
                </button>
                <button type="button" onClick={() => google("evening")} className="candy candy-soft h-12 text-[14px]">
                  {added.evening && <Check className="size-4" />} Google: evening
                </button>
              </div>
            </div>
          )}

          {saved && !both && (
            <p className="mt-4 text-center text-[13px] text-muted-foreground">
              You added reminders on {saved.added}. Adding them again makes a second copy, so delete the old ones in your calendar first.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
