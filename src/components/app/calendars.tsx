"use client";

import { motion } from "motion/react";
import { toast } from "sonner";
import { type CalEvent, downloadIcs, googleUrl, open, outlookUrl } from "@/lib/calendar";
import { feel } from "@/lib/feedback";

export { AppleMark, GoogleMark, OutlookMark } from "./brands";
import { AppleMark, GoogleMark, LogoTile, OutlookMark } from "./brands";

type Props = { events: CalEvent[]; file: string; onAdded?: () => void; label?: string; flat?: boolean };

/** Three round buttons with marks, then one line of context. */
export function CalendarButtons({ events, file, onAdded, label, flat }: Props) {
  const repeating = events.some((e) => e.daily);

  const google = () => {
    feel("save", "medium");
    open(googleUrl(events[0]));
    // Google takes one event per page, so offer the next one right away.
    events.slice(1).forEach((e, i) =>
      setTimeout(() => toast(`Next: add “${e.title}” to Google`, { duration: 12000, action: { label: "Add", onClick: () => open(googleUrl(e)) } }), 600 + i * 200)
    );
    onAdded?.();
  };
  const apple = () => {
    feel("save", "medium");
    downloadIcs(events, file);
    toast(events.length > 1 ? "Opening Calendar. Tap Add All." : "Opening Calendar. Tap Add.");
    onAdded?.();
  };
  const outlook = () => {
    feel("save", "medium");
    if (repeating) {
      downloadIcs(events, file);
      toast("Open the file with Outlook to add the daily reminders.");
    } else open(outlookUrl(events[0]));
    onAdded?.();
  };

  const items = [
    { name: "Google Calendar", mark: <GoogleMark className="size-5" />, bleed: false, fn: google },
    { name: "Apple Calendar", mark: <AppleMark className="size-full" />, bleed: true, fn: apple },
    { name: "Outlook", mark: <OutlookMark className="size-[26px]" />, bleed: false, fn: outlook },
  ];

  return (
    <div>
      <ul className={flat ? "-mx-1" : "overflow-hidden rounded-[18px] bg-white ring-1 ring-line"}>
        {items.map((it, i) => (
          <motion.li key={it.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, type: "spring", bounce: 0, duration: 0.45 }} className={i ? "border-t border-line/70" : ""}>
            <button type="button" onClick={it.fn} aria-label={`Add to ${it.name}`} className={`flex min-h-[64px] w-full items-center gap-3 text-left ${flat ? "rounded-xl px-1" : "px-4"} transition-colors active:bg-[rgb(6_11_43/0.04)]`}>
              <LogoTile bleed={it.bleed} size={34}>{it.mark}</LogoTile>
              <span className="flex-1 text-[15px] font-semibold text-ink">{it.name}</span>
              <span className="inline-flex h-8 items-center rounded-full bg-paper px-3.5 text-[13px] font-semibold text-ink">Add</span>
            </button>
          </motion.li>
        ))}
      </ul>
      {label !== "" && <p className="t-small mt-2.5 text-ink-2">{label ?? "Your calendar rings even when NudgeMe is closed."}</p>}
    </div>
  );
}
