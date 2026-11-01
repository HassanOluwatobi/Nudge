"use client";

import { House, ListChecks, Timer } from "lucide-react";
import { motion } from "motion/react";

export type Tab = "today" | "todo" | "focus";

const ITEMS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "today", label: "Home", icon: House },
  { id: "todo", label: "Plan", icon: ListChecks },
  { id: "focus", label: "Focus", icon: Timer },
];

/** A floating tab bar, after Tiimo. Dark on Focus so it stays quiet there. */
export function TabBar({ tab, onTab, dark, running }: { tab: Tab; onTab: (t: Tab) => void; dark: boolean; running: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 safe-b">
      <div aria-hidden className="bottom-frost" />
      <nav
        aria-label="Main"
        className={`pointer-events-auto relative mx-auto grid w-[calc(100%-2rem)] max-w-[19rem] grid-cols-3 gap-1 rounded-[26px] p-1.5 backdrop-blur-xl ${
          dark ? "bg-white/[0.08] ring-1 ring-white/10" : "bg-white/75 shadow-[0_1px_0_var(--hi)_inset,0_16px_40px_-18px_rgb(6_11_43/0.35)] ring-1 ring-line/60"
        }`}
      >
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const on = tab === id;
          return (
            <button key={id} type="button" onClick={() => onTab(id)} aria-current={on ? "page" : undefined} className={`relative flex h-[56px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[12px] font-semibold ${dark ? (on ? "text-white" : "text-white/55") : on ? "text-ink" : "text-ink-3"}`}>
              {on && <motion.span layoutId="tab-pill" className={`absolute inset-0 rounded-[20px] ${dark ? "bg-white/[0.12]" : "bg-[#efe9dd]"}`} transition={{ type: "spring", bounce: 0, duration: 0.38 }} />}
              <span className="relative">
                <Icon className="size-[22px]" strokeWidth={on ? 2.3 : 2} />
                {id === "focus" && running && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-coral ring-2 ring-white" aria-label="Timer running" />}
              </span>
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
