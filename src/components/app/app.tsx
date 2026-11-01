"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { feel, installTapHaptics, setFeedback } from "@/lib/feedback";
import { notify, setBadge } from "@/lib/reminders";
import { type Bucket, type Part, type Task, doneToday, hhmmToday, suggestion, todayTasks, ymd } from "@/lib/tasks";
import { useBackClose } from "@/lib/use-back";
import { type ExtEvent, type Source, calendlyEvents, linkEvents, extKey, notionEvents, outlookEvents } from "@/lib/sync";
import { useKeyboardInset } from "@/lib/use-keyboard";
import { useTasks } from "@/lib/use-tasks";
import { Art } from "./art";
import { Capture } from "./capture";
import { Checkin } from "./checkin";
import { Finish } from "./finish";
import { Focus } from "./focus";
import { Guide } from "./guide";
import { ImportSheet } from "./import";
import { Ideas } from "./ideas";
import { Petals } from "./petals";
import { Settings } from "./settings";
import { TabBar, type Tab } from "./tabbar";
import { TaskMenu, TaskSheet } from "./task-sheet";
import { Today } from "./today";
import { Todo } from "./todo";

type Over = { name: "finish"; task: Task } | { name: "rest" } | null;

const page = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: "spring" as const, bounce: 0, duration: 0.32 },
};

const ORDER: Tab[] = ["todo", "today", "focus", "ideas"];
// Tabs slide in the direction you moved, so the bar and the page agree.
const tabMotion = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -20 }),
};

export function NudgeApp() {
  const { state, actions } = useTasks();
  useKeyboardInset();
  const [tab, setTab] = useState<Tab>("today");
  const [over, setOver] = useState<Over>(null);
  // undefined = follow the suggestion, null = just a timer
  const [focusId, setFocusId] = useState<string | null | undefined>();
  const [capture, setCapture] = useState<{ bucket?: Exclude<Bucket, "done">; part?: Part } | null>(null);
  const [settings, setSettings] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<"morning" | "evening" | "weekly" | null>(null);
  const [said, setSaid] = useState("");
  const [guide, setGuide] = useState(false);
  const [importer, setImporter] = useState<{ source?: Source | null; preload?: ExtEvent[] | null } | null>(null);
  const [dir, setDir] = useState(0);
  const goTab = (t: Tab) => {
    if (t === tab) return;
    setDir(Math.sign(ORDER.indexOf(t) - ORDER.indexOf(tab)));
    feel("tap", "light");
    setTab(t);
  };

  const announce = useCallback((s: string) => {
    setSaid("");
    requestAnimationFrame(() => setSaid(s));
  }, []);

  useEffect(() => {
    if (state) setFeedback({ sound: state.settings.sound, haptics: state.settings.haptics });
  }, [state?.settings.sound, state?.settings.haptics]); // eslint-disable-line react-hooks/exhaustive-deps
  // First visit: show the guide once.
  const introShown = useRef(false);
  useEffect(() => {
    if (state && !state.meta.intro && !introShown.current) {
      introShown.current = true;
      setTimeout(() => setGuide(true), 500);
    }
  }, [state]);
  // Light, dark, or follow the phone. The status bar colour follows too.
  const theme = state?.settings.theme ?? "system";
  useEffect(() => {
    document.documentElement.dataset.view = over?.name === "finish" ? "finish" : "page";
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      let m = document.querySelector('meta[name="theme-color"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "theme-color");
        document.head.appendChild(m);
      }
      m.setAttribute("content", resolved === "dark" ? "#070b22" : "#f3eee4");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [over, theme]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, over]);

  useEffect(() => installTapHaptics(), []);
  useEffect(() => {
    if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Opened from a calendar reminder: go straight to the check-in.
    const from = new URLSearchParams(location.search).get("from");
    if (from === "morning" || from === "evening") setTimeout(() => setCheckin(from), 400);
  }, []);

  useBackClose(tab !== "today" || !!over, () => {
    setOver(null);
    setTab("today");
  });

  // Reminders while NudgeMe is open or installed. The calendar covers the rest.
  const fired = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!state) return;
    try {
      JSON.parse(sessionStorage.getItem("nudgeme.fired") ?? "[]").forEach((k: string) => fired.current.add(k));
    } catch {}
    const remember = (k: string) => {
      fired.current.add(k);
      try {
        sessionStorage.setItem("nudgeme.fired", JSON.stringify([...fired.current]));
      } catch {}
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();
    for (const t of state.tasks) {
      if (!t.remindAt || t.bucket === "done") continue;
      const at = Date.parse(t.remindAt);
      const key = `${t.id}@${t.remindAt}`;
      if (fired.current.has(key)) continue;
      const ring = () => {
        remember(key);
        toast(`Reminder: ${t.title}`, { duration: 10000, action: { label: "Start", onClick: () => (setFocusId(t.id), setTab("focus")) } });
        if (state.settings.notify) notify(`NudgeMe: ${t.title}`, "Time for a small step.");
      };
      if (at <= now && now - at < 12 * 3600_000) ring();
      else if (at > now && at - now < 24 * 3600_000) timers.push(setTimeout(ring, at - now));
    }
    if (state.settings.notify) {
      const today = ymd();
      (["morning", "evening"] as const).forEach((k) => {
        const at = hhmmToday(state.settings[k]).getTime();
        const key = `${k}@${today}`;
        if (at > now && !fired.current.has(key))
          timers.push(
            setTimeout(() => {
              remember(key);
              notify(k === "morning" ? "Morning kickoff" : "Evening wrap-up", k === "morning" ? "Two minutes to pick what matters today." : "See what you did and let the rest wait.", `/?from=${k}`);
            }, at - now)
          );
      });
    }
    setBadge(todayTasks(state).length);
    return () => timers.forEach(clearTimeout);
  }, [state]);

  // Quietly check connected calendars once per visit. Google needs a tap, so it gets a button instead.
  const synced = useRef(false);
  useEffect(() => {
    if (!state || synced.current) return;
    synced.current = true;
    const y = state.settings.sync;
    const jobs: Promise<ExtEvent[]>[] = [];
    if (y.outlook) jobs.push(outlookEvents(false).catch(() => []));
    if (y.notion) jobs.push(notionEvents(y.notion).catch(() => []));
    if (y.calendly) jobs.push(calendlyEvents(y.calendly).catch(() => []));
    if (y.ics) jobs.push(linkEvents(y.ics).catch(() => []));
    if (!jobs.length) return;
    Promise.all(jobs).then((lists) => {
      const known = new Set([...state.tasks.map((t) => t.ext).filter(Boolean), ...(y.skipped ?? [])] as string[]);
      const fresh = lists.flat().filter((e) => !known.has(extKey(e)));
      if (!fresh.length) return;
      actions.importEvents(fresh.map((e) => ({ key: extKey(e), title: e.title, start: e.start, end: e.end, allDay: e.allDay })));
      toast(`Added ${fresh.length} ${fresh.length === 1 ? "event" : "events"} from your calendar.`);
    });
  }, [state]);

  if (!state) {
    return <div className="min-h-dvh bg-paper" aria-busy="true" />;
  }

  const openTask = openId ? (state.tasks.find((t) => t.id === openId) ?? null) : null;
  const menuTask = menuId ? (state.tasks.find((t) => t.id === menuId) ?? null) : null;
  const doneCount = doneToday(state).length;
  const totalCount = todayTasks(state).length + doneCount;

  const startFocus = (t: Task) => {
    setOpenId(null);
    setMenuId(null);
    actions.choose(t.id);
    setFocusId(t.id);
    goTab("focus");
  };
  const finished = (t: Task) => {
    toast.dismiss();
    feel("finish", "success");
    setOpenId(null);
    setOver({ name: "finish", task: t });
    announce(`Finished: ${t.title}.`);
  };
  const common = { state, actions, announce, onHelp: () => setGuide(true), onSettings: () => setSettings(true), onAdd: () => setCapture({}), onOpen: (t: Task) => setOpenId(t.id), onMenu: (t: Task) => setMenuId(t.id) };

  return (
    <MotionConfig reducedMotion="user">
      <div aria-live="polite" className="sr-only">
        {said}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        {over?.name === "finish" ? (
          <motion.div key="finish" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Finish
              task={over.task}
              onStop={() => setOver({ name: "rest" })}
              onToday={() => (setOver(null), setTab("today"))}
              onAnother={() => (setOver(null), setTab("todo"))}
              onUndo={() => {
                actions.restore(over.task.id);
                announce("The task is open again.");
                setOver(null);
                setFocusId(over.task.id);
                setTab("focus");
              }}
            />
          </motion.div>
        ) : over?.name === "rest" ? (
          <motion.div key="rest" {...page} className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 safe-t safe-b">
            <div className="relative h-52 overflow-hidden rounded-[28px]">
              <Art mode={0} shift={0.55} />
            </div>
            <h1 className="mt-8 text-[40px] font-medium leading-[1.04] tracking-[-0.04em]">You can stop here.</h1>
            <p className="t-body mt-3 text-ink-2">Your list is saved on this device. Close NudgeMe whenever you like.</p>
            <button type="button" className="btn btn-line mt-8 self-start" onClick={() => (setOver(null), setTab("today"))}>
              Back to today
            </button>
          </motion.div>
        ) : (
          <motion.div key={tab} custom={dir} variants={tabMotion} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.34 }}>
            {tab === "today" && (
              <Today {...common} onAddTo={(part) => setCapture({ part, bucket: "today" })} onFocus={startFocus} onCheckin={setCheckin} />
            )}
            {tab === "todo" && <Todo {...common} onAddTo={(bucket) => setCapture({ bucket })} />}
            {tab === "focus" && <Focus state={state} actions={actions} announce={announce} taskId={focusId === null ? undefined : (focusId ?? suggestion(state)?.id)} onPickTask={(id) => (setFocusId(id ?? null), state.meta.timer && actions.stopTimer())} onFinished={finished} />}
            {tab === "ideas" && <Ideas state={state} actions={actions} onAdd={() => setCapture({})} onSettings={() => setSettings(true)} onHelp={() => setGuide(true)} doneCount={doneCount} totalCount={totalCount} />}
          </motion.div>
        )}
      </AnimatePresence>

      {!over && <TabBar tab={tab} onTab={goTab} dark={false} running={!!state.meta.timer} />}

      <Capture open={!!capture} preset={capture ?? undefined} onClose={() => setCapture(null)} state={state} actions={actions} announce={announce} />
      <TaskSheet task={openTask} ai={state.settings.ai} onClose={() => setOpenId(null)} actions={actions} onFocus={startFocus} onFinished={finished} announce={announce} />
      <TaskMenu task={menuTask} onClose={() => setMenuId(null)} actions={actions} onOpen={(t) => (setMenuId(null), setTimeout(() => setOpenId(t.id), 220))} onFocus={startFocus} />
      <Settings open={settings} onClose={() => setSettings(false)} state={state} actions={actions} onCheckin={(k) => setTimeout(() => setCheckin(k), 320)} onGuide={() => setTimeout(() => setGuide(true), 320)} onImport={(src) => setTimeout(() => setImporter({ source: src }), 320)} />
      <ImportSheet open={!!importer} source={importer?.source} preload={importer?.preload} onClose={() => setImporter(null)} state={state} actions={actions} />
      <Checkin kind={checkin} onClose={() => setCheckin(null)} state={state} actions={actions} onStart={(t) => setTimeout(() => startFocus(t), 220)} />
      <Guide
        open={guide}
        onClose={() => {
          setGuide(false);
          if (!state.meta.intro) actions.seenIntro();
        }}
      />
      <Petals />
    </MotionConfig>
  );
}
