"use client";

import { useState } from "react";
import { Moon, PlayCircle, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { doneOn, type State, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Ideas } from "@/components/nudge/ideas";
import { Settings } from "@/components/nudge/settings";
import { TaskRow } from "@/components/nudge/task-row";

type Tab = "list" | "ideas" | "settings";
const byOrder = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt);

/** Everything that isn't the one thing lives here, out of sight until needed. */
export function GardenMenu({
  open,
  onOpenChange,
  state,
  actions,
  onOpenTask,
  onTour,
  onCheckin,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  state: State;
  actions: Actions;
  onOpenTask: (id: string) => void;
  onTour: () => void;
  onCheckin: (k: "morning" | "evening") => void;
}) {
  const [tab, setTab] = useState<Tab>("list");
  const today = ymd();
  const lists: [string, Task[]][] = [
    ["Today", state.tasks.filter((t) => t.bucket === "today").sort(byOrder)],
    ["This week", state.tasks.filter((t) => t.bucket === "week").sort(byOrder)],
    ["Later", state.tasks.filter((t) => t.bucket === "later").sort(byOrder)],
    ["Done today", doneOn(state, today)],
  ];
  const ideasCount = state.entries.filter((e) => e.status === "open").length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="mx-auto w-full max-w-xl bg-[#fffaf7]">
        <DrawerTitle className="sr-only">Your garden shed</DrawerTitle>
        <DrawerDescription className="sr-only">Your whole list, ideas and settings.</DrawerDescription>
        <div className="overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-1 rounded-full bg-[#f3ece9] p-1" role="tablist">
            {(
              [
                ["list", "My list"],
                ["ideas", `Ideas${ideasCount ? ` · ${ideasCount}` : ""}`],
                ["settings", "Settings"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                type="button"
                onClick={() => setTab(id)}
                className={cn("h-10 flex-1 rounded-full text-sm font-semibold transition-all", tab === id ? "bg-white text-[var(--plum)] shadow-sm" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "list" && (
            <div className="mt-2">
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onCheckin("morning")} className="candy candy-soft h-auto flex-col gap-1 rounded-2xl py-3 text-[13px]">
                  <Sun className="size-5 text-[#e8a33d]" /> Morning plan
                </button>
                <button type="button" onClick={() => onCheckin("evening")} className="candy candy-soft h-auto flex-col gap-1 rounded-2xl py-3 text-[13px]">
                  <Moon className="size-5 text-[#7c5df2]" /> Evening wrap
                </button>
                <button type="button" onClick={onTour} className="candy candy-soft h-auto flex-col gap-1 rounded-2xl py-3 text-[13px]">
                  <PlayCircle className="size-5 text-[#e8664f]" /> Show me how
                </button>
              </div>
              {lists.every(([, l]) => !l.length) && (
                <p className="mt-8 text-center text-[15px] text-muted-foreground">Nothing here yet. Tell Nudge what&apos;s on your mind.</p>
              )}
              {lists.map(([title, l]) =>
                l.length ? (
                  <section key={title} className="mt-6">
                    <h3 className="px-3 text-[13px] font-semibold text-muted-foreground">{title}</h3>
                    <div className="mt-1 rounded-3xl bg-white p-1 shadow-[0_10px_30px_-20px_rgb(120_70_90/0.35)]">
                      {l.map((t) => (
                        <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpenTask} showStar={title !== "Done today"} />
                      ))}
                    </div>
                  </section>
                ) : null
              )}
            </div>
          )}
          {tab === "ideas" && (
            <div className="mt-4">
              <Ideas state={state} actions={actions} />
            </div>
          )}
          {tab === "settings" && (
            <div className="mt-4">
              <Settings state={state} actions={actions} />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
