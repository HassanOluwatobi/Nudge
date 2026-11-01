"use client";

import { motion } from "motion/react";
import { toast } from "sonner";
import { type CalEvent, downloadIcs, googleUrl, open, outlookUrl } from "@/lib/calendar";
import { feel } from "@/lib/feedback";

/* Simple marks so people recognise where each button goes. */
export function GoogleMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect x="3" y="3" width="26" height="26" rx="5" fill="#fff" />
      <path d="M3 8a5 5 0 0 1 5-5h16v6H3z" fill="#4285F4" />
      <path d="M3 9h6v20H8a5 5 0 0 1-5-5z" fill="#4285F4" opacity=".85" />
      <path d="M9 23h14v6H9z" fill="#34A853" />
      <path d="M23 23h6v1a5 5 0 0 1-5 5h-1z" fill="#EA4335" />
      <path d="M23 9h6v14h-6z" fill="#FBBC04" />
      <text x="16" y="20.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="9.5" fill="#1a73e8">
        31
      </text>
    </svg>
  );
}
export function AppleMark() {
  const d = new Date();
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect x="2.5" y="2.5" width="27" height="27" rx="6.5" fill="#fff" stroke="#e5e5e5" />
      <text x="16" y="11" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="6" fill="#ff3b30" letterSpacing=".3">
        {d.toLocaleDateString("en", { weekday: "short" }).toUpperCase()}
      </text>
      <text x="16" y="24.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="300" fontSize="13" fill="#111">
        {d.getDate()}
      </text>
    </svg>
  );
}
export function OutlookMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect x="11" y="6" width="18" height="20" rx="2.5" fill="#28A8EA" />
      <path d="M11 15h18v9a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z" fill="#0078D4" />
      <rect x="3" y="9" width="14" height="14" rx="2.5" fill="#0A5CB8" />
      <ellipse cx="10" cy="16" rx="3.6" ry="4.3" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

type Props = { events: CalEvent[]; file: string; onAdded?: () => void; label?: string };

/** Three round buttons with marks, then one line of context. */
export function CalendarButtons({ events, file, onAdded, label }: Props) {
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
    { name: "Google Calendar", mark: <GoogleMark />, fn: google },
    { name: "Apple Calendar", mark: <AppleMark />, fn: apple },
    { name: "Outlook", mark: <OutlookMark />, fn: outlook },
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        {items.map((it, i) => (
          <motion.button
            key={it.name}
            type="button"
            onClick={it.fn}
            aria-label={`Add to ${it.name}`}
            title={it.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", bounce: 0.35, duration: 0.5 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-14 place-items-center rounded-full bg-white shadow-[0_1px_2px_rgb(6_11_43/0.08),0_8px_18px_-10px_rgb(6_11_43/0.35)] ring-1 ring-line"
          >
            {it.mark}
          </motion.button>
        ))}
      </div>
      <p className="t-small mt-2.5 text-ink-2">{label ?? "Add to Google, Apple or Outlook. Your calendar rings even when NudgeMe is closed."}</p>
    </div>
  );
}
