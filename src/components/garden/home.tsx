"use client";

import { Feather, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { candidates, dayNumber, doneOn, type State, ymd } from "@/lib/nudge";
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
  onDone,
  onOpenTask,
  onMenu,
}: {
  state: State;
  actions: Actions;
  cheer: number;
  /** A line Nudge just said (after a win). Overrides the default. */
  say?: string;
  onDone: () => void;
  onOpenTask: (id: string) => void;
  onMenu: () => void;
}) {
  const today = ymd();
  const gentle = state.meta.lowEnergy?.date === today;
  const must = state.tasks.find((t) => t.must && t.bucket === "today");
  const won = !must && state.meta.win?.date === today ? state.meta.win : undefined;
  const options = candidates(state, 3);
  const grown = state.tasks.filter((t) => t.bucket === "done").length;
  const weekWins = state.tasks.filter((t) => t.bucket === "done" && t.doneAt && Date.now() - Date.parse(t.doneAt) < 7 * 864e5).length;
  const doneToday = doneOn(state, today).length;
  const empty = !must && !won && !options.length;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const [line1, pre, em, post] = gentle
    ? ["Gentle day.", "Just ", "one", " small thing."]
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
        ? "That was the big one. Rest, or pick another."
        : empty
          ? "Hi! Tell me what's on your mind and I'll find the one thing."
          : state.meta.yesterdayWins?.length && doneToday === 0 && new Date().getHours() < 12
            ? `Yesterday you finished ${state.meta.yesterdayWins.length}. Nice work.`
            : weekWins > 0
              ? `${weekWins} ${weekWins === 1 ? "win" : "wins"} this week. Look, ${grown > 1 ? "a flower!" : "a sprout!"}`
              : "One small step. I'm right here with you.");

  return (
    <div className="relative z-10 mx-auto min-h-dvh w-full max-w-md pb-36">
      <header className="px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-muted-foreground">{date}</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--plum)] shadow-[0_8px_20px_-12px_rgb(120_70_90/0.4)]">
              <span className="size-2 rounded-full bg-[#ff8f8f]" /> Day {dayNumber(state, today)}
            </span>
            <button type="button" onClick={onMenu} data-tour="menu" aria-label="Open your list, ideas and settings" className="candy candy-soft grid size-11 place-items-center rounded-full p-0">
              <LayoutGrid className="size-[18px]" />
            </button>
          </div>
        </div>
        <h1 className="nm-spring-in mt-2 font-serif text-[34px] leading-[1.06] tracking-tight text-[var(--plum)] min-[400px]:text-[37px]">
          {line1}
          <br />
          {pre}
          <em className="serif-em">{em}</em>
          {post}
        </h1>
      </header>

      <div className="relative -mt-1">
        <div key={bubble} className="bubble nm-pop absolute top-2 right-5 z-10 max-w-[60%] px-4 py-2.5 text-[14.5px] leading-snug text-[var(--plum)] after:right-auto after:left-8" aria-live="polite">
          {bubble}
        </div>
        <Companion plants={grown} cheer={cheer} mood={gentle ? "sleepy" : "happy"} className="h-[232px] w-full min-[400px]:h-[260px]" />
      </div>

      <div className="relative -mt-4 px-4">
        {must ? (
          <OneThingCard key={must.id} task={must} actions={actions} gentle={gentle} onDone={onDone} onOpen={() => onOpenTask(must.id)} />
        ) : won ? (
          <WinCard title={won.title} canPick={options.length > 0} onPick={() => actions.setMeta({ win: undefined })} />
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
                "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors",
                gentle ? "bg-[#efe9ff] text-[#6b4fd8]" : "bg-white/70 text-muted-foreground hover:bg-white"
              )}
            >
              <Feather className="size-4" />
              {gentle ? "Gentle mode is on · tap to turn off" : "Low on energy? Make today gentle"}
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <CaptureBar actions={actions} />
        </div>
      </div>
    </div>
  );
}
