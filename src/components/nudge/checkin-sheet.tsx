"use client";

import { Archive, ArrowRight, Moon, Sparkles, Star, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { doneOn, dueNudges, isoDay, type State, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { CaptureBar } from "./capture-bar";

const listJoin = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

export function CheckinSheet({
  kind,
  state,
  actions,
  onClose,
}: {
  kind: "morning" | "evening" | null;
  state: State;
  actions: Actions;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!kind} onOpenChange={(o) => !o && onClose()} showSwipeHandle>
      <DrawerContent className="mx-auto w-full max-w-xl">
        <div className="overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {kind === "morning" && <Morning state={state} actions={actions} onClose={onClose} />}
          {kind === "evening" && <Evening state={state} actions={actions} onClose={onClose} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Morning({ state, actions, onClose }: { state: State; actions: Actions; onClose: () => void }) {
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening.";
  const wins = state.meta.yesterdayWins ?? [];
  const nudges = dueNudges(state);
  const candidates = state.tasks
    .filter((t) => t.bucket === "today" || t.bucket === "week")
    .sort((a, b) => (a.bucket === b.bucket ? (a.due ?? "9") .localeCompare(b.due ?? "9") : a.bucket === "today" ? -1 : 1))
    .slice(0, 5);
  const must = state.tasks.find((t) => t.must);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Sun className="size-3.5" /> Morning check-in
      </p>
      <DrawerTitle className="mt-1.5 font-serif text-[28px] leading-tight font-normal tracking-tight">{hello}</DrawerTitle>
      <DrawerDescription className="mt-1 text-[15px] text-muted-foreground text-left text-pretty">
        {wins.length
          ? `Yesterday you finished ${listJoin(wins.slice(0, 3))}${wins.length > 3 ? ` and ${wins.length - 3} more` : ""}. That counts.`
          : "A fresh day. Let's pick one thing and make it small."}
      </DrawerDescription>

      {nudges.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" /> Ideas worth a second look
          </p>
          <ul className="space-y-2">
            {nudges.map((e) => (
              <li key={e.id} className="rounded-2xl bg-idea/60 p-3">
                <p className="text-[15px] leading-snug">{e.text}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => actions.entryToTask(e.id)} className="h-8 rounded-full bg-card px-3 text-xs font-medium hover:bg-accent">
                    Make it a task
                  </button>
                  <button type="button" onClick={() => actions.keepEntry(e.id)} className="h-8 rounded-full bg-card px-3 text-xs font-medium hover:bg-accent">
                    Keep for later
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.patchEntry(e.id, { status: "archived" })}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-card"
                  >
                    <Archive className="size-3.5" /> Archive
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Choose today&apos;s one thing</p>
          <ul className="space-y-1.5">
            {candidates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => actions.setMust(t.id)}
                  aria-pressed={t.must}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                    t.must ? "border-primary/40 bg-accent" : "bg-card hover:border-primary/30"
                  )}
                >
                  <Star className={cn("size-4 shrink-0", t.must ? "fill-primary text-primary" : "text-muted-foreground/60")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-snug font-medium">{t.title}</span>
                    <span className="block text-[13px] text-muted-foreground">{t.step}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-medium text-primary-foreground hover:bg-primary/90"
      >
        {must ? "Start my day" : candidates.length ? "Start without picking" : "Let's go"}
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

function Evening({ state, actions, onClose }: { state: State; actions: Actions; onClose: () => void }) {
  const today = ymd();
  const wins = doneOn(state, today).map((t) => t.title);
  const rolling = state.tasks.filter((t) => t.bucket === "today");
  const notes = state.entries.filter((e) => e.kind === "note" && isoDay(e.createdAt) === today);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Moon className="size-3.5" /> Evening check
      </p>
      <DrawerTitle className="mt-1.5 font-serif text-[28px] leading-tight font-normal tracking-tight text-balance">
        {wins.length === 0
          ? "Today counts, even the quiet parts."
          : wins.length === 1
            ? "You finished something today."
            : `You finished ${wins.length} things today.`}
      </DrawerTitle>
      <DrawerDescription className="mt-1 text-[15px] text-muted-foreground text-left text-pretty">
        {wins.length ? `${listJoin(wins.slice(0, 4))}${wins.length > 4 ? " and more" : ""}. Well done.` : "Rest is part of the plan. Tomorrow is ready."}
      </DrawerDescription>

      <div className="mt-5 space-y-2 rounded-2xl bg-muted/70 p-4 text-[15px] leading-snug">
        {rolling.length > 0 ? (
          <p>
            {rolling.length === 1 ? `${rolling[0].title} stays` : `${rolling.length} tasks stay`} in Today for tomorrow, with a smaller first step.
          </p>
        ) : (
          <p>Today is clear. Tomorrow starts fresh.</p>
        )}
        {notes.length > 0 && <p className="text-muted-foreground">{notes.length === 1 ? "You saved 1 note today. It's safe in Ideas." : `You saved ${notes.length} notes today. They're safe in Ideas.`}</p>}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Anything on your mind? Put it here and let it go.</p>
        <CaptureBar actions={actions} placeholder="Add it for tomorrow" />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-[15px] font-medium text-background hover:opacity-90"
      >
        Good night
      </button>
    </div>
  );
}
