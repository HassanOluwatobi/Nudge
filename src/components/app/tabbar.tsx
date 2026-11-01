"use client";

import { House, ListChecks, Timer } from "lucide-react";
import { motion } from "motion/react";
import { Credit } from "./settings";

export type Tab = "today" | "todo" | "focus";

const ITEMS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "today", label: "Home", icon: House },
  { id: "todo", label: "Plan", icon: ListChecks },
  { id: "focus", label: "Focus", icon: Timer },
];

/** A floating tab bar, after Tiimo. Dark on Focus so it stays quiet there. */
export function TabBar({ tab, onTab, dark, running }: { tab: Tab; onTab: (t: Tab) => void; dark: boolean; running: boolean }) {
  return (
    <>
      {/* Installed app only: a frosted strip at the very bottom. */}
      <div aria-hidden className="bottom-frost lg:hidden" />
      {/* Wide screens: the same three places, as a calm sidebar. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col xl:w-64 border-r border-line bg-paper px-4 py-6 lg:flex" aria-label="Main">
        <div className="flex items-center gap-2.5 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={28} height={28} className="size-7" />
          <span className="font-serif text-[20px] tracking-[-0.01em]">Shrink my day</span>
        </div>
        <nav className="mt-8 grid gap-1">
          {ITEMS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            return (
              <button key={id} type="button" onClick={() => onTab(id)} aria-current={on ? "page" : undefined} className={`side-item relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-semibold ${on ? "text-ink" : "text-ink-3"}`}>
                {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-[14px] bg-white ring-1 ring-line" transition={{ type: "spring", bounce: 0, duration: 0.32 }} />}
                <span className="relative">
                  <Icon className="size-5" strokeWidth={on ? 2.3 : 2} />
                  {id === "focus" && running && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-coral ring-2 ring-white" aria-label="Timer running" />}
                </span>
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto px-2">
          <p className="t-small text-ink-3">
            Press <kbd className="rounded-md bg-white px-1.5 py-0.5 text-[12px] font-semibold text-ink-2 ring-1 ring-line">N</kbd> to add a task
          </p>
          <div className="mt-4">
            <Credit compact stacked />
          </div>
        </div>
      </aside>
      {/* The bar floats above the bottom edge. In Safari, nothing full-width touches the
          bottom of the screen, so Safari lets the page run under its own toolbar. */}
      <div className="tabbar-float pointer-events-none fixed left-1/2 z-30 w-[calc(100%-2rem)] max-w-[19rem] -translate-x-1/2 lg:hidden">
      <nav
        aria-label="Main"
        className={`pointer-events-auto relative grid w-full grid-cols-3 gap-1 rounded-[26px] p-1.5 backdrop-blur-xl ${
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
    </>
  );
}
