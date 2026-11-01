"use client";

import { useEffect, useState } from "react";
import { Feather, ListTodo, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { candidates, doneOn, isDuplicate, type State, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { CaptureBar } from "@/components/nudge/capture-bar";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useBackClose } from "@/lib/use-back";
import { Companion } from "./companion";
import { EmptyCard, OneThingCard, PickCard, WinCard } from "./one-thing";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** One screen. The garden on top, one calm slab with the one thing below. */
export function Home({
  state,
  actions,
  cheer,
  say,
  timeUp,
  onStepDone,
  onAllDone,
  onOpenTask,
  onMenu,
  onReminders,
}: {
  state: State;
  actions: Actions;
  cheer: number;
  say?: string;
  timeUp?: boolean;
  onStepDone: () => void;
  onAllDone: () => void;
  onOpenTask: (id: string) => void;
  onMenu: () => void;
  onReminders: () => void;
}) {
  const [adding, setAdding] = useState(false);
  useBackClose(adding, () => setAdding(false));
  const today = ymd();
  const gentle = state.meta.lowEnergy?.date === today;
  const must = state.tasks.find((t) => t.must && t.bucket === "today");
  const won = !must && state.meta.win?.date === today ? state.meta.win : undefined;
  const options = candidates(state, 3);
  const grown = state.tasks.filter((t) => t.bucket === "done").length + (state.meta.stepWins ?? 0);
  const weekWins = state.tasks.filter((t) => t.bucket === "done" && t.doneAt && Date.now() - Date.parse(t.doneAt) < 7 * 864e5).length;
  const doneToday = doneOn(state, today).length;
  const empty = !must && !won && !options.length;
  const openCount = state.tasks.filter((t) => t.bucket !== "done").length;
  const timing = !!must && state.meta.timer?.taskId === must.id && state.meta.timer.end > Date.now();
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [must?.id, won?.title]);

  const [pre, em, post] = timing
    ? ["Just ", "this", ", for now."]
    : gentle
      ? ["An ", "easy", " day."]
      : won
        ? ["Look what ", "grew", "."]
        : empty
          ? ["Let's start ", "small", "."]
          : ["Let's grow ", "one", " thing."];

  const caption =
    say ??
    (timing
      ? "I'll keep you company. Just this one step."
      : gentle
        ? "Small is perfect today. I've got you."
        : won
          ? options.length
            ? "You did the big one. Rest, or do one more."
            : "Everything is done. Rest now."
          : empty
            ? "Tap + and tell me what you need to do."
            : state.meta.yesterdayWins?.length && doneToday === 0 && new Date().getHours() < 12
              ? `Yesterday you finished ${state.meta.yesterdayWins.length}. Nice work.`
              : weekWins > 0
                ? `${weekWins} ${weekWins === 1 ? "thing" : "things"} done this week. Your garden is growing.`
                : `${greeting()}. One small step. I'm right here.`);

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Calm the sky while a timer runs. */}
      <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10 bg-[#24192a] transition-opacity duration-1000", timing ? "opacity-[0.07]" : "opacity-0")} />

      <header className="flex items-center justify-between gap-3 px-5 pt-[max(0.9rem,env(safe-area-inset-top))]">
        <p className="eyebrow">{date}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenu}
            data-tour="menu"
            aria-label={`My list, ${openCount} things`}
            className="glass press flex h-11 items-center gap-2 rounded-full pr-2 pl-4 text-[15px] font-semibold text-[var(--ink)]"
          >
            <ListTodo className="size-[18px]" /> My list
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--ink)] px-1.5 text-[12px] font-semibold text-white tabular-nums">{openCount}</span>
          </button>
          <button type="button" onClick={() => setAdding(true)} data-tour="capture" aria-label="Add something you need to do" className="candy grid size-11 place-items-center p-0">
            <Plus className="size-5" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <section className="relative flex flex-1 flex-col items-center justify-end px-5 pt-3">
        <h1 key={pre + em} className="nm-fade-in text-center font-serif text-[34px] leading-[1.04] tracking-[-0.03em] text-balance text-[var(--ink)] min-[400px]:text-[38px]">
          {pre}
          <em className="serif-em">{em}</em>
          {post}
        </h1>
        <Companion plants={grown} cheer={cheer} mood={gentle || timing ? "sleepy" : "happy"} className="h-[clamp(150px,calc(100dvh-520px),290px)] w-full" />
        <p key={caption} className="nm-rise mt-1 mb-3 max-w-[30ch] text-center text-[15px] leading-snug text-[var(--ink-2)] text-pretty" aria-live="polite">
          {caption}
        </p>
        {(must || gentle) && !timing && (
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
            className={cn("press mb-3 flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold", gentle ? "bg-[#ece6ff] text-[#3f2aa6]" : "glass text-[var(--ink-2)]")}
          >
            <Feather className="size-3.5" />
            {gentle ? "Easy mode is on · turn off" : "Tired? Make today easy"}
          </button>
        )}
      </section>

      <div className="slab nm-slab-in sticky bottom-0 z-20 px-5 pt-5 pb-[max(1.1rem,env(safe-area-inset-bottom))]">
        {must ? (
          <OneThingCard
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
          <WinCard title={won.title} canPick={options.length > 0} onPick={() => actions.setMeta({ win: undefined })} askReminders={!state.meta.reminders} onReminders={onReminders} />
        ) : options.length ? (
          <PickCard options={options} onPick={(id) => actions.setMust(id)} onMore={onMenu} />
        ) : (
          <EmptyCard onAdd={() => setAdding(true)} />
        )}
      </div>

      <Drawer open={adding} onOpenChange={setAdding} showSwipeHandle>
        <DrawerContent className="mx-auto w-full max-w-xl bg-[#fffaf7]">
          <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <DrawerTitle className="font-serif text-[28px] leading-tight font-normal tracking-[-0.02em] text-[var(--ink)]">What do you need to do?</DrawerTitle>
            <DrawerDescription className="mt-1 text-left text-[15px] text-[var(--ink-2)]">Type it or speak it. Add as many as you like. I&apos;ll sort them.</DrawerDescription>
            <div className="mt-4">
              <CaptureBar actions={actions} exists={(t) => isDuplicate(state, t)} autoFocus onAdded={() => {}} />
            </div>
            <button type="button" onClick={() => setAdding(false)} className="mt-3 h-11 w-full text-[15px] font-medium text-[var(--ink-2)]">
              Done
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
