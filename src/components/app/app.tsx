"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { feel, setFeedback } from "@/lib/feedback";
import { notify, setBadge } from "@/lib/reminders";
import { type Bucket, type Part, type Task, doneToday, hhmmToday, suggestion, todayTasks, ymd } from "@/lib/tasks";
import { type PushItem, enablePush, pushOn, pushSupported, syncPush } from "@/lib/push";
import { useBackClose } from "@/lib/use-back";
import { type ExtEvent, type Source, calendlyEvents, extKey, googleEvents, googleLinkEvents, googleReady, linkEvents, noteSync, notionEvents, outlookEvents } from "@/lib/sync";
import { useKeyboardInset } from "@/lib/use-keyboard";
import { useTasks } from "@/lib/use-tasks";
import { Art } from "./art";
import { Capture } from "./capture";
import { Checkin } from "./checkin";
import { Finish } from "./finish";
import { Focus } from "./focus";
import { Guide } from "./guide";
import { ImportSheet } from "./import";
import { Petals } from "./petals";
import { Settings } from "./settings";
import { TabBar, type Tab } from "./tabbar";
import { TaskMenu, TaskSheet } from "./task-sheet";
import { Today } from "./today";
import type { Kind } from "./quick-capture";
import { Todo } from "./todo";

type Over = { name: "finish"; task: Task } | { name: "rest" } | null;

const page = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: "spring" as const, bounce: 0, duration: 0.32 },
};

const ORDER: Tab[] = ["today", "todo", "focus"];
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
  // Home shows Tasks, Ideas or Notes. It stays where you left it while the app is open.
  const [homeView, setHomeView] = useState<Kind>("task");
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
    if (state) setFeedback({ haptics: state.settings.haptics });
  }, [state?.settings.haptics]); // eslint-disable-line react-hooks/exhaustive-deps
  // First visit: show the guide once.
  const introShown = useRef(false);
  useEffect(() => {
    if (state && !state.meta.intro && !introShown.current) {
      introShown.current = true;
      setTimeout(() => setGuide(true), (window as unknown as { __splashAt?: number }).__splashAt ? 2500 : 500);
    }
  }, [state]);
  // Light, dark, or follow the phone. The status bar colour follows too.
  const theme = state?.settings.theme ?? "light";
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const resolvedDark = theme === "dark" || (theme === "auto" && systemDark);
  useEffect(() => {
    document.documentElement.dataset.view = over?.name === "finish" ? "finish" : "page";
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "auto" ? (mq.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      // Safari on iPhone paints its toolbars with theme-color and stops the page
      // flowing under them, so it only gets one where it was added at load (not Safari tabs).
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#08090a" : "#f3eee4");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [over, theme]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, over]);

  // Ask the browser to keep NudgeMe's data instead of clearing it to save space.
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Opened from a calendar reminder: go straight to the check-in.
    const from = new URLSearchParams(location.search).get("from");
    // Morning lives on Home now. Evening still opens its short sheet.
    if (from === "evening" || from === "morning") setTimeout(() => setCheckin(from), 400);
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
        if (state.settings.notify && !pushOn()) notify(`NudgeMe: ${t.title}`, "Time for a small step.");
      };
      if (at <= now && now - at < 12 * 3600_000) ring();
      else if (at > now && at - now < 24 * 3600_000) timers.push(setTimeout(ring, at - now));
    }
    if (state.settings.notify && !pushOn()) {
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

  // Let the splash finish drawing, then fade it once the app is ready.
  const loaded = !!state;
  useEffect(() => {
    if (!loaded) return;
    const at = (window as unknown as { __splashAt?: number }).__splashAt;
    const wait = at ? Math.max(0, 2000 - (Date.now() - at)) : 0;
    const id = setTimeout(() => document.documentElement.classList.add("splash-done"), wait);
    return () => clearTimeout(id);
  }, [loaded]);

  // People who already allowed notifications move to closed-app reminders quietly. No new prompt.
  const notifyOn = !!state?.settings.notify;
  useEffect(() => {
    if (notifyOn && pushSupported() && !pushOn() && Notification.permission === "granted") enablePush().catch(() => {});
  }, [notifyOn]);

  // Hand the next two weeks of reminders to the reminder sender, sealed on this phone,
  // so they ring even when NudgeMe is closed.
  useEffect(() => {
    if (!state || !state.settings.notify || !pushOn()) return;
    const id = setTimeout(() => {
      const now = Date.now();
      const until = now + 14 * 864e5;
      const items: PushItem[] = [];
      for (const t of state.tasks) {
        if (!t.remindAt || t.bucket === "done") continue;
        const at = Date.parse(t.remindAt);
        if (at > now && at < until) items.push({ at, title: t.title, body: "Time for a small step.", url: "/", tag: `task-${t.id}` });
      }
      for (let d = 0; d < 14; d++) {
        const day = new Date(now + d * 864e5);
        (["morning", "evening"] as const).forEach((k) => {
          const [h, m] = state.settings[k].split(":").map(Number);
          const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
          if (at > now) items.push({ at, title: k === "morning" ? "Morning kickoff" : "Evening wrap-up", body: k === "morning" ? "Two minutes to pick what matters today." : "See what you did and let the rest wait.", url: `/?from=${k}`, tag: `${k}-${ymd(day)}` });
        });
      }
      syncPush(items.sort((a, b) => a.at - b.at).slice(0, 250)).catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
  }, [state]);

  // Quietly check connected calendars when the app opens, and again when you come back to it.
  // New events land as tasks on their own. Google checks too while its sign-in is still good.
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastPull = useRef(0);
  const pull = useCallback(() => {
    const st = stateRef.current;
    if (!st || Date.now() - lastPull.current < 10 * 60_000) return;
    lastPull.current = Date.now();
    const y = st.settings.sync;
    type Job = Promise<{ src: Source; list: ExtEvent[]; error?: string }>;
    const jobs: Job[] = [];
    const run = (src: Source, p: Promise<ExtEvent[]>) => jobs.push(p.then((list) => ({ src, list })).catch((e) => ({ src, list: [], error: e instanceof Error ? e.message : "It didn't answer." })));
    if (y.gics) run("google", googleLinkEvents(y.gics));
    else if (y.google && googleReady()) run("google", googleEvents(false));
    if (y.outlook) run("outlook", outlookEvents(false));
    if (y.calendly) run("calendly", calendlyEvents(y.calendly));
    if (y.notion) run("notion", notionEvents(y.notion));
    if (y.ics) run("ics", linkEvents(y.ics));
    if (!jobs.length) return;
    Promise.all(jobs).then((results) => {
      const now = stateRef.current ?? st;
      const known = new Set([...now.tasks.map((t) => t.ext).filter(Boolean), ...(now.settings.sync.skipped ?? [])] as string[]);
      const seen = new Set<string>();
      const fresh: ExtEvent[] = [];
      for (const r of results) {
        let added = 0;
        for (const e of r.list) {
          const k = extKey(e);
          if (known.has(k) || seen.has(k)) continue;
          seen.add(k);
          fresh.push(e);
          added++;
        }
        noteSync(r.src, { at: Date.now(), added, error: r.error });
      }
      if (!fresh.length) return;
      actions.importEvents(fresh.map((e) => ({ key: extKey(e), title: e.title, start: e.start, end: e.end, allDay: e.allDay })));
      toast(`Added ${fresh.length} ${fresh.length === 1 ? "event" : "events"} from your calendar.`);
    });
  }, [actions]);
  const ready = !!state;
  useEffect(() => {
    if (!ready) return;
    pull();
    const onShow = () => document.visibilityState === "visible" && pull();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [ready, pull]);

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
  const themeProps = { dark: resolvedDark, onTheme: () => actions.setSettings({ theme: resolvedDark ? "light" : "dark" }) };
  const common = { state, actions, announce, onHelp: () => setGuide(true), onSettings: () => setSettings(true), onAdd: () => setCapture({}), onOpen: (t: Task) => setOpenId(t.id), onMenu: (t: Task) => setMenuId(t.id) };

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.38 }}>
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
              <Today {...common} {...themeProps} onGoogleSetup={() => setImporter({ source: "google" })} view={homeView} onView={setHomeView} onAddTo={(part) => setCapture({ part, bucket: "today" })} onFocus={startFocus} onCheckin={setCheckin} />
            )}
            {tab === "todo" && <Todo {...common} {...themeProps} onAddTo={(bucket) => setCapture({ bucket })} />}
            {tab === "focus" && <Focus {...themeProps} onSettings={() => setSettings(true)} onHelp={() => setGuide(true)} state={state} actions={actions} announce={announce} taskId={focusId === null ? undefined : (focusId ?? suggestion(state)?.id)} onPickTask={(id) => (setFocusId(id ?? null), state.meta.timer && actions.stopTimer())} onFinished={finished} />}
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
