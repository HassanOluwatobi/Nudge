"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WIN_LINES, ymd } from "@/lib/nudge";
import { useNudge } from "@/lib/use-nudge";
import { useBackClose } from "@/lib/use-back";
import { chime } from "@/lib/chime";
import { notify, setBadge } from "@/lib/reminders";
import { GardenMenu } from "@/components/garden/menu";
import { Guide } from "@/components/garden/guide";
import { Home } from "@/components/garden/home";
import { HOME_TOUR, Tour } from "@/components/garden/tour";
import { finish } from "./task-row";
import { CheckinSheet } from "./checkin-sheet";
import { RemindersSheet } from "./reminders-sheet";
import { TaskSheet } from "./task-sheet";
import { Splash } from "./splash";

const STEP_LINES = ["That step counts!", "Nice. Look, a new sprout!", "Small steps add up.", "You started. That's the hard part."];

export function NudgeApp() {
  const { state, actions } = useNudge();
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [checkin, setCheckin] = useState<"morning" | "evening" | null>(null);
  const [reminders, setReminders] = useState(false);
  const [touring, setTouring] = useState(false);
  const [cheer, setCheer] = useState(0);
  const [say, setSay] = useState<string | undefined>();
  const [timeUp, setTimeUp] = useState(false);
  const lastDone = useRef<number | null>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((line: string | undefined, ms = 6000) => {
    if (sayTimer.current) clearTimeout(sayTimer.current);
    setSay(line);
    if (line) sayTimer.current = setTimeout(() => setSay(undefined), ms);
  }, []);

  useBackClose(menu, () => setMenu(false));
  useBackClose(!!openId, () => setOpenId(null));
  useBackClose(!!checkin, () => setCheckin(null));
  useBackClose(reminders, () => setReminders(false));

  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Opened from a calendar reminder: go straight to the matching check-in.
  useEffect(() => {
    if (!state?.meta.onboarded) return;
    const from = new URLSearchParams(location.search).get("from");
    if (from === "morning" || from === "evening") {
      history.replaceState(null, "", "/");
      setTimeout(() => setCheckin(from), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.meta.onboarded]);

  const must = state?.tasks.find((t) => t.must && t.bucket === "today");

  // The number on the home-screen icon: 1 while a one thing is waiting.
  useEffect(() => {
    if (state) setBadge(must ? 1 : 0);
  }, [state, must]);

  // First visit after the guide: show the short tour once, when there is a card to explain.
  useEffect(() => {
    if (state?.meta.onboarded && !state.meta.toured && must) {
      const t = setTimeout(() => setTouring(true), 900);
      return () => clearTimeout(t);
    }
  }, [state?.meta.onboarded, state?.meta.toured, must]);

  // Step timer: chime when it ends, even if the card changed.
  const timer = state?.meta.timer;
  useEffect(() => {
    if (!timer) return;
    setTimeUp(false);
    const left = timer.end - Date.now();
    const done = () => {
      actions.setMeta({ timer: undefined });
      setTimeUp(true);
      chime();
      speak("Time is up! Did you do the step?", 10000);
      if (document.hidden) notify("Time is up", "Did you do the step? Open NudgeMe to tick it off.");
    };
    if (left <= 0) {
      done();
      return;
    }
    const t = setTimeout(done, left);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.end]);

  // Something finished anywhere (list, sheet, card): Nudge cheers and a plant grows.
  const doneCount = state?.tasks.filter((t) => t.bucket === "done").length ?? 0;
  useEffect(() => {
    if (!state) return;
    const prev = lastDone.current;
    lastDone.current = doneCount;
    if (prev !== null && doneCount > prev) {
      setCheer((c) => c + 1);
      speak(WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)] + " Look, a flower grew!");
    } else if (prev !== null && doneCount < prev) speak(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, !!state]);

  const endTour = useCallback(() => {
    setTouring(false);
    actions.setMeta({ toured: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [actions]);

  if (!state) return <Splash />;
  if (!state.meta.onboarded) return <Guide actions={actions} />;

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
        timeUp={timeUp}
        onStepDone={() => {
          if (!must) return;
          actions.stepDone(must.id);
          setTimeUp(false);
          setCheer((c) => c + 1);
          speak(STEP_LINES[Math.floor(Math.random() * STEP_LINES.length)]);
        }}
        onAllDone={() => must && finish(actions, must, gentle)}
        onOpenTask={setOpenId}
        onMenu={() => setMenu(true)}
        onReminders={() => setReminders(true)}
      />
      <GardenMenu
        open={menu}
        onOpenChange={setMenu}
        state={state}
        actions={actions}
        onOpenTask={(id) => {
          setMenu(false);
          setTimeout(() => setOpenId(id), 300);
        }}
        onTour={() => {
          setMenu(false);
          setTimeout(() => setTouring(true), 400);
        }}
        onCheckin={(k) => {
          setMenu(false);
          setTimeout(() => setCheckin(k), 300);
        }}
        onReminders={() => {
          setMenu(false);
          setTimeout(() => setReminders(true), 300);
        }}
      />
      <TaskSheet task={openTask} actions={actions} onClose={() => setOpenId(null)} />
      <CheckinSheet kind={checkin} state={state} actions={actions} onClose={closeCheckin} />
      <RemindersSheet open={reminders} onClose={() => setReminders(false)} state={state} actions={actions} />
      {touring && <Tour steps={HOME_TOUR} onDone={endTour} />}
    </>
  );
}
