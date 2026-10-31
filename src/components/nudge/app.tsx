"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WIN_LINES, ymd } from "@/lib/nudge";
import { useNudge } from "@/lib/use-nudge";
import { GardenMenu } from "@/components/garden/menu";
import { Guide } from "@/components/garden/guide";
import { Home } from "@/components/garden/home";
import { HOME_TOUR, Tour } from "@/components/garden/tour";
import { finish } from "./task-row";
import { CheckinSheet } from "./checkin-sheet";
import { TaskSheet } from "./task-sheet";

export function NudgeApp() {
  const { state, actions } = useNudge();
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [checkin, setCheckin] = useState<"morning" | "evening" | null>(null);
  const [touring, setTouring] = useState(false);
  const [cheer, setCheer] = useState(0);
  const [say, setSay] = useState<string | undefined>();
  const lastDone = useRef<number | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // First visit after the guide: show the tour once.
  useEffect(() => {
    if (state?.meta.onboarded && !state.meta.toured) {
      const t = setTimeout(() => setTouring(true), 900);
      return () => clearTimeout(t);
    }
  }, [state?.meta.onboarded, state?.meta.toured]);

  // Something finished anywhere (list, sheet, card): Nudge cheers and a plant grows.
  const doneCount = state?.tasks.filter((t) => t.bucket === "done").length ?? 0;
  useEffect(() => {
    if (!state) return;
    const prev = lastDone.current;
    lastDone.current = doneCount;
    if (prev !== null && doneCount > prev) {
      setCheer((c) => c + 1);
      setSay(WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)] + " Look, something grew!");
      const t = setTimeout(() => setSay(undefined), 6000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, !!state]);

  const endTour = useCallback(() => {
    setTouring(false);
    actions.setMeta({ toured: true });
  }, [actions]);

  if (!state) return <div className="min-h-dvh" />;
  if (!state.meta.onboarded) return <Guide actions={actions} />;

  const must = state.tasks.find((t) => t.must && t.bucket === "today");
  const gentle = state.meta.lowEnergy?.date === ymd();
  const openTask = state.tasks.find((t) => t.id === openId);

  const closeCheckin = () => {
    const today = ymd();
    if (checkin === "morning") actions.setMeta({ morningSeen: today });
    if (checkin === "evening") actions.setMeta({ eveningSeen: today });
    setCheckin(null);
  };

  return (
    <>
      <Home
        state={state}
        actions={actions}
        cheer={cheer}
        say={say}
        onDone={() => must && finish(actions, must, gentle)}
        onOpenTask={setOpenId}
        onMenu={() => setMenu(true)}
      />
      <GardenMenu
        open={menu}
        onOpenChange={setMenu}
        state={state}
        actions={actions}
        onOpenTask={(id) => {
          setMenu(false);
          setTimeout(() => setOpenId(id), 250);
        }}
        onTour={() => {
          setMenu(false);
          setTimeout(() => setTouring(true), 400);
        }}
        onCheckin={(k) => {
          setMenu(false);
          setTimeout(() => setCheckin(k), 300);
        }}
      />
      <TaskSheet task={openTask} actions={actions} onClose={() => setOpenId(null)} />
      <CheckinSheet kind={checkin} state={state} actions={actions} onClose={closeCheckin} />
      {touring && <Tour steps={HOME_TOUR} onDone={endTour} />}
    </>
  );
}
