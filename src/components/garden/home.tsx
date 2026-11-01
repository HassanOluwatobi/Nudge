"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Feather, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { candidates, isDuplicate, type State, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { CaptureBar } from "@/components/nudge/capture-bar";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useBackClose } from "@/lib/use-back";
import { EmptyShell, FocusCard, PickShell, RestShell } from "./focus";

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Still up?" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** Finished things this week, one dot each. Grows, never resets with guilt. */
export function Wins({ count, pulse }: { count: number; pulse?: boolean }) {
  const reduce = useReducedMotion();
  const shown = Math.min(count, 14);
  return (
    <div className="flex items-center gap-2" aria-label={`${count} done this week`}>
      <div className="flex items-center gap-[5px]">
        {Array.from({ length: Math.max(shown, 1) }).map((_, i) => (
          <motion.span
            key={i}
            initial={pulse && i === shown - 1 && !reduce ? { scale: 0.3, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5, delay: 0.15 }}
            className={cn("size-[7px] rounded-full", count ? "bg-[var(--hot)]" : "bg-[var(--hair)]")}
          />
        ))}
      </div>
      <span className="t-label whitespace-nowrap tabular-nums">{count ? `${count} done this week` : "Fresh week"}</span>
    </div>
  );
}

/** One screen. A quiet header, and the one thing in the middle, like an object in your hand. */
export function Home({
  state,
  actions,
  say,
  timeUp,
  onStepDone,
  onAllDone,
  onOpenTask,
  onMenu,
}: {
  state: State;
  actions: Actions;
  cheer?: number;
  say?: string;
  timeUp?: boolean;
  onStepDone: () => void;
  onAllDone: () => void;
  onOpenTask: (id: string) => void;
  onMenu: () => void;
  onReminders?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  useBackClose(adding, () => setAdding(false));
  const today = ymd();
  const gentle = state.meta.lowEnergy?.date === today;
  const must = state.tasks.find((t) => t.must && t.bucket === "today");
  const won = !must && state.meta.win?.date === today ? state.meta.win : undefined;
  const options = candidates(state, 3);
  const weekWins = state.tasks.filter((t) => t.bucket === "done" && t.doneAt && Date.now() - Date.parse(t.doneAt) < 7 * 864e5).length;
  const openCount = state.tasks.filter((t) => t.bucket !== "done").length;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [must?.id, won?.title]);

  const line = say ?? (gentle ? "Small is perfect today." : must ? "One small step. That's all." : won ? "That counts." : "Let's find one thing.");

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <header className="sticky top-0 z-30 -mx-5 flex items-center justify-between gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <Wins count={weekWins} pulse />
        <div className="flex items-center gap-2">
          <button type="button" onClick={onMenu} data-tour="menu" aria-label={`My list, ${openCount} things`} className="btn chrome h-10 gap-2 pr-1.5 pl-3.5 text-[14px] whitespace-nowrap text-[var(--ink)]">
            My list
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--ink)] px-1.5 text-[12px] text-[var(--bg)] tabular-nums">{openCount}</span>
          </button>
          <button type="button" onClick={() => setAdding(true)} data-tour="capture" aria-label="Add something you need to do" className="btn btn-primary size-10 p-0">
            <Plus className="size-5" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-5 px-1">
          <p className="t-label">{greeting()}</p>
          <motion.p key={line} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="t-title mt-1" aria-live="polite">
            {line}
          </motion.p>
        </div>

        {must ? (
          <FocusCard
            key={must.id}
            task={must}
            actions={actions}
            gentle={gentle}
            timer={state.meta.timer}
            timeUp={timeUp}
            onStepDone={onStepDone}
            onAllDone={onAllDone}
            onOpen={() => onOpenTask(must.id)}
          />
        ) : won ? (
          <RestShell title={won.title} canPick={options.length > 0} onPick={() => actions.setMeta({ win: undefined })} />
        ) : options.length ? (
          <PickShell options={options} onPick={(id) => actions.setMust(id)} onMore={onMenu} />
        ) : (
          <EmptyShell onAdd={() => setAdding(true)} />
        )}

        {(must || gentle) && (
          <button
            type="button"
            onClick={() => {
              if (gentle) actions.setMeta({ lowEnergy: undefined });
              else {
                actions.setMeta({ lowEnergy: { date: today, taskId: must?.id } });
                if (must) actions.shrink(must.id);
              }
            }}
            aria-pressed={gentle}
            className={cn("btn mx-auto mt-8 h-9 px-3.5 text-[13px]", gentle ? "bg-[#8b7cf6]/15 text-[#6d5ce0]" : "text-[var(--ink-3)]")}
          >
            <Feather className="size-3.5" />
            {gentle ? "Easy mode is on · turn off" : "Low on energy? Make today easy"}
          </button>
        )}
      </main>

      <Drawer open={adding} onOpenChange={setAdding} showSwipeHandle>
        <DrawerContent className="mx-auto w-full max-w-xl bg-[var(--surface)]">
          <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <DrawerTitle className="t-display text-[var(--ink)]">What do you need to do?</DrawerTitle>
            <DrawerDescription className="t-body mt-1 text-left text-[var(--ink-2)]">Type it or say it. Add as many as you like.</DrawerDescription>
            <div className="mt-5">
              <CaptureBar actions={actions} exists={(t) => isDuplicate(state, t)} autoFocus />
            </div>
            <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost mt-3 h-11 w-full text-[15px]">
              Done
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
