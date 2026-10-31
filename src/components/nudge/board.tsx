"use client";

import { useState } from "react";
import { BatteryLow, ChevronDown, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { doneOn, type State, type Task, ymd } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { OneThingCard, PickOneCard, WinCard } from "./one-thing-card";
import { TaskRow } from "./task-row";

const byOrder = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt);

function Section({
  title,
  hint,
  children,
  collapsible,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!collapsible)
    return (
      <section className="mt-8">
        <h2 className="px-3 text-[13px] font-medium text-muted-foreground">{title}</h2>
        <div className="mt-1">{children}</div>
      </section>
    );
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-8">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-xl px-3 py-1 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40">
        {title}
        {hint && !open && <span className="font-normal text-muted-foreground/70">{hint}</span>}
        <ChevronDown className={cn("ml-auto size-4 transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-250 ease-out data-ending-style:h-0 data-starting-style:h-0">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Board({
  state,
  actions,
  onOpen,
  onCheckin,
}: {
  state: State;
  actions: Actions;
  onOpen: (id: string) => void;
  onCheckin: (k: "morning" | "evening") => void;
}) {
  const today = ymd();
  const lowEnergy = state.meta.lowEnergy?.date === today;
  const must = state.tasks.find((t) => t.must && t.bucket === "today");
  const todayTasks = state.tasks.filter((t) => t.bucket === "today" && !t.must).sort(byOrder);
  const week = state.tasks.filter((t) => t.bucket === "week").sort(byOrder);
  const later = state.tasks.filter((t) => t.bucket === "later").sort(byOrder);
  const doneToday = doneOn(state, today);
  const won = !must && state.meta.win?.date === today ? state.meta.win : undefined;
  const evening = new Date().getHours() >= state.meta.eveningHour;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <header className="flex items-start justify-between gap-4 px-1">
        <div>
          <p className="text-[13px] text-muted-foreground">{dateLabel}</p>
          <h1 className="mt-0.5 font-serif text-[30px] leading-tight tracking-tight">
            {lowEnergy ? "Gentle day." : doneToday.length ? `${doneToday.length} done today.` : "Today"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onCheckin(evening ? "evening" : "morning")}
          aria-label={evening ? "Open the evening wrap-up" : "Open the morning check-in"}
          className="mt-1 grid size-10 place-items-center rounded-full bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          {evening ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </button>
      </header>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-card">
        <BatteryLow className="size-[18px] text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-medium">Low energy day</span>
          <span className="block text-xs text-muted-foreground">Just your one thing. Everything else waits.</span>
        </span>
        <Switch
          checked={lowEnergy}
          onCheckedChange={(on) => actions.setMeta({ lowEnergy: on ? { date: today, taskId: must?.id } : undefined })}
          aria-label="Low energy day"
        />
      </label>

      <div className="mt-3">
        {must ? (
          <OneThingCard key={must.id} task={must} actions={actions} lowEnergy={lowEnergy} onOpen={onOpen} />
        ) : won ? (
          <WinCard title={won.title} />
        ) : (
          <PickOneCard hasTasks={state.tasks.some((t) => t.bucket === "today" || t.bucket === "week")} />
        )}
      </div>

      {lowEnergy ? (
        <div className="mt-6 px-3 text-center">
          <p className="text-sm text-muted-foreground text-pretty">
            {must
              ? "Just this one today. Everything else is safe."
              : won
                ? "Rest now. You did what you set out to do."
                : "Pick one thing from Today below, or rest. Both are fine."}
          </p>
          {!must && !won && todayTasks.length > 0 && (
            <div className="mt-3 text-left">
              {todayTasks.map((t) => (
                <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {todayTasks.length > 0 && (
            <Section title="Also today">
              {todayTasks.map((t) => (
                <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} />
              ))}
            </Section>
          )}

          {week.length > 0 && (
            <Section title="This week">
              {week.map((t) => (
                <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} />
              ))}
            </Section>
          )}

          {later.length > 0 && (
            <Section title="Later" hint="Safe here until you need it" collapsible defaultOpen={false}>
              {later.map((t) => (
                <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} />
              ))}
            </Section>
          )}

          {doneToday.length > 0 && (
            <Section title="Done today" collapsible defaultOpen>
              {doneToday.map((t) => (
                <TaskRow key={t.id} task={t} actions={actions} onOpen={onOpen} showStar={false} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
