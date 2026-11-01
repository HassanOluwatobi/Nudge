"use client";

import { useEffect } from "react";
import { Feather, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { candidates, doneOn, isDuplicate, type State, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { CaptureBar } from "@/components/nudge/capture-bar";
import { Companion } from "./companion";
import { EmptyCard, OneThingCard, PickCard, WinCard } from "./one-thing";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening.";
};

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
  /** A line Nudge just said (after a win). Overrides the default. */
  say?: string;
  timeUp?: boolean;
  onStepDone: () => void;
  onAllDone: () => void;
  onOpenTask: (id: string) => void;
  onMenu: () => void;
  onReminders: () => void;
}) {
  const today = ymd();
  const gentle = state.meta.lowEnergy?.date === today;
  const must = state.tasks.find((t) => t.must && t.bucket === "today");
  const won = !must && state.meta.win?.date === today ? state.meta.win : undefined;
  const options = candidates(state, 3);
  const grown = state.tasks.filter((t) => t.bucket === "done").length + (state.meta.stepWins ?? 0);
  const weekWins = state.tasks.filter((t) => t.bucket === "done" && t.doneAt && Date.now() - Date.parse(t.doneAt) < 7 * 864e5).length;
  const doneToday = doneOn(state, today).length;
  const empty = !must && !won && !options.length;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const openCount = state.tasks.filter((t) => t.bucket !== "done").length;

  // Always show the garden and headline after a change, so a win is never missed.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [must?.id, won?.title]);

  const [line1, pre, em, post] = gentle
    ? ["Easy day.", "Just ", "one", " small thing."]
    : won
      ? ["You did it.", "Look what ", "grew", "."]
      : empty
        ? [greeting(), "Let's start ", "small", "."]
        : [greeting(), "Let's grow ", "one", " thing."];

  const bubble =
    say ??
    (gentle
      ? "Small is perfect today. I've got you."
      : won
        ? options.length
          ? "You did the big one! Rest, or do one more."
          : "You did it! Everything is done. Rest now."
        : empty
          ? "Hi! Type what you need to do and I'll make it small."
          : state.meta.yesterdayWins?.length && doneToday === 0 && new Date().getHours() < 12
            ? `Yesterday you finished ${state.meta.yesterdayWins.length}. Nice work.`
            : weekWins > 0
              ? `${weekWins} ${weekWins === 1 ? "thing" : "things"} done this week. Look how your garden grew!`
              : "One small step. I'm right here with you.");

  return (
    <div className="relative z-10 mx-auto min-h-dvh w-full max-w-md pb-36">
      <header className="px-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-muted-foreground">{date}</p>
          <button
            type="button"
            onClick={onMenu}
            data-tour="menu"
            aria-label={`My list, ${openCount} things`}
            className="candy candy-soft h-11 gap-2 rounded-full px-4 text-[15px]"
          >
            <ListTodo className="size-[18px]" /> My list
            {openCount > 0 && <span className="rounded-full bg-[#f3ece9] px-2 py-0.5 text-[12px] tabular-nums">{openCount}</span>}
          </button>
        </div>
        <h1 className="nm-spring-in mt-1.5 font-serif text-[31px] leading-[1.06] tracking-tight text-[var(--plum)] min-[400px]:text-[36px]">
          <span className="[@media(max-height:740px)]:hidden">
            {line1}
            <br />
          </span>
          {pre}
          <em className="serif-em">{em}</em>
          {post}
        </h1>
      </header>

      <div className="relative -mt-1">
        <div key={bubble} className="bubble nm-pop absolute top-1 right-4 z-10 max-w-[56%] px-3.5 py-2 text-[13.5px] leading-snug min-[400px]:text-[14.5px] text-[var(--plum)] after:right-auto after:left-8" aria-live="polite">
          {bubble}
        </div>
        <Companion plants={grown} cheer={cheer} mood={gentle ? "sleepy" : "happy"} className="h-[clamp(150px,calc(100dvh-490px),270px)] w-full" />
      </div>

      <div className="relative -mt-4 px-4">
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
          <WinCard
            title={won.title}
            canPick={options.length > 0}
            onPick={() => actions.setMeta({ win: undefined })}
            askReminders={!state.meta.reminders}
            onReminders={onReminders}
          />
        ) : options.length ? (
          <PickCard options={options} onPick={(id) => actions.setMust(id)} onMore={onMenu} />
        ) : (
          <EmptyCard />
        )}

        {(must || gentle) && (
          <div className="mt-4 flex justify-center">
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
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors",
                gentle ? "bg-[#efe9ff] text-[#6b4fd8]" : "bg-white/70 text-muted-foreground hover:bg-white"
              )}
            >
              <Feather className="size-4" />
              {gentle ? "Easy mode is on · turn it off" : "Tired? Make today easy"}
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <CaptureBar actions={actions} exists={(t) => isDuplicate(state, t)} />
        </div>
      </div>
    </div>
  );
}
