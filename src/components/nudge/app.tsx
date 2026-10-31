"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Settings2, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { ymd } from "@/lib/nudge";
import { useNudge } from "@/lib/use-nudge";
import { Board } from "./board";
import { CaptureBar } from "./capture-bar";
import { CheckinSheet } from "./checkin-sheet";
import { Ideas } from "./ideas";
import { Onboarding } from "./onboarding";
import { Settings } from "./settings";
import { TaskSheet } from "./task-sheet";

type Tab = "today" | "ideas" | "settings";

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export function NudgeApp() {
  const { state, actions } = useNudge();
  const [tab, setTab] = useState<Tab>("today");
  const [openId, setOpenId] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<"morning" | "evening" | null>(null);

  // Offer one check-in when the app opens: morning first, evening after the set hour.
  useEffect(() => {
    if (!state?.meta.onboarded) return;
    const today = ymd();
    const t = setTimeout(() => {
      if (state.meta.morningSeen !== today && new Date().getHours() < state.meta.eveningHour) setCheckin("morning");
      else if (state.meta.eveningSeen !== today && new Date().getHours() >= state.meta.eveningHour) setCheckin("evening");
    }, 600);
    return () => clearTimeout(t);
    // Only on first load of a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.meta.onboarded]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!state) return <div className="min-h-dvh" />;
  if (!state.meta.onboarded) return <Onboarding actions={actions} />;

  const closeCheckin = () => {
    const today = ymd();
    if (checkin === "morning") actions.setMeta({ morningSeen: today });
    if (checkin === "evening") actions.setMeta({ eveningSeen: today });
    setCheckin(null);
  };

  const openTask = state.tasks.find((t) => t.id === openId);

  return (
    <div className="min-h-dvh">
      <main className="mx-auto w-full max-w-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-48 sm:px-6 sm:pt-10">
        {tab === "today" && <Board state={state} actions={actions} onOpen={setOpenId} onCheckin={setCheckin} />}
        {tab === "ideas" && <Ideas state={state} actions={actions} />}
        {tab === "settings" && <Settings state={state} actions={actions} />}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="h-10 bg-gradient-to-t from-background to-transparent" />
        <div className="pointer-events-auto bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-backdrop-filter:bg-background/80">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            {tab !== "settings" && (
              <CaptureBar actions={actions} placeholder={tab === "ideas" ? "Jot an idea or a note" : "What's on your mind?"} />
            )}
            <nav aria-label="Main" className="mt-2 grid grid-cols-3">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors",
                    tab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-5", tab === id && "text-primary")} strokeWidth={tab === id ? 2.2 : 1.8} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <TaskSheet task={openTask} actions={actions} onClose={() => setOpenId(null)} />
      <CheckinSheet kind={checkin} state={state} actions={actions} onClose={closeCheckin} />
    </div>
  );
}
