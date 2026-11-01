"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Task } from "@/lib/tasks";
import { useBackClose } from "@/lib/use-back";
import { useTasks } from "@/lib/use-tasks";
import { Capture } from "./capture";
import { Finish } from "./finish";
import { Focus } from "./focus";
import { MyList } from "./my-list";
import { Settings } from "./settings";
import { TaskSheet } from "./task-sheet";
import { Contours, Field, Ribbon, useDaypart } from "./motifs";
import { Mark } from "./thread";
import { Today } from "./today";

type View = { name: "today" } | { name: "list"; choosing?: boolean } | { name: "focus"; id: string } | { name: "finish"; task: Task } | { name: "rest" };

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
};

export function NudgeApp() {
  const { state, actions } = useTasks();
  const [view, setView] = useState<View>({ name: "today" });
  const [capture, setCapture] = useState(false);
  const [settings, setSettings] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const part = useDaypart();

  const announce = useCallback((s: string) => {
    setSaid("");
    requestAnimationFrame(() => setSaid(s));
  }, []);

  // Status bar matches the colour at the top of each screen.
  useEffect(() => {
    const h = new Date().getHours();
    const top = view.name === "focus" ? "#060b2b" : view.name === "finish" ? "#1d4df5" : view.name === "today" ? (h < 5 || h >= 21 ? "#060b2b" : h < 17 ? "#0d2a8c" : "#101a4d") : "#f3eee4";
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "theme-color");
      document.head.appendChild(m);
    }
    m.setAttribute("content", top);
  }, [view.name]);

  useEffect(() => {
    document.documentElement.dataset.view = view.name === "finish" || view.name === "focus" ? view.name : "page";
    window.scrollTo({ top: 0 });
  }, [view.name]);

  useEffect(() => {
    if ("serviceWorker" in navigator && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Back leaves Focus, My list and Finish for Today.
  useBackClose(view.name !== "today", () => setView({ name: "today" }));

  if (!state) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <Mark className="h-6 w-auto opacity-60" />
      </div>
    );
  }

  const openTask = openId ? state.tasks.find((t) => t.id === openId) ?? null : null;
  const focusTask = view.name === "focus" ? state.tasks.find((t) => t.id === view.id) : undefined;

  const startFocus = (t: Task) => {
    setOpenId(null);
    actions.choose(t.id);
    setView({ name: "focus", id: t.id });
  };
  const finished = (t: Task) => {
    toast.dismiss();
    setOpenId(null);
    setView({ name: "finish", task: t });
    setSaid(`Finished: ${t.title}.`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div aria-live="polite" className="sr-only">
        {said}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view.name === "today" && (
          <motion.div key="today" {...fade}>
            <Today
              state={state}
              actions={actions}
              announce={announce}
              onCapture={() => setCapture(true)}
              onList={() => setView({ name: "list" })}
              onSettings={() => setSettings(true)}
              onOpen={(t) => setOpenId(t.id)}
              onFocus={startFocus}
            />
          </motion.div>
        )}

        {view.name === "list" && (
          <motion.div key="list" {...fade}>
            <MyList
              state={state}
              actions={actions}
              announce={announce}
              choosing={view.choosing}
              onBack={() => setView({ name: "today" })}
              onOpen={(t) => setOpenId(t.id)}
              onCapture={() => setCapture(true)}
            />
          </motion.div>
        )}

        {view.name === "focus" && focusTask && focusTask.bucket !== "done" && (
          <motion.div key={`focus-${focusTask.id}`} {...fade}>
            <Focus
              task={focusTask}
              state={state}
              actions={actions}
              announce={announce}
              onPause={() => {
                announce("Paused. Your progress is saved.");
                setView({ name: "today" });
              }}
              onFinished={finished}
            />
          </motion.div>
        )}

        {view.name === "focus" && (!focusTask || focusTask.bucket === "done") && (
          <motion.div key="focus-gone" {...fade} className="on-night grid min-h-dvh place-items-center bg-night p-6 text-center text-paper">
            <div>
              <p className="text-[17px]">This task is no longer open.</p>
              <button type="button" className="btn btn-white mt-5" onClick={() => setView({ name: "today" })}>
                Return to today
              </button>
            </div>
          </motion.div>
        )}

        {view.name === "finish" && (
          <motion.div key="finish" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Finish
              task={view.task}
              onStop={() => setView({ name: "rest" })}
              onToday={() => setView({ name: "today" })}
              onAnother={() => setView({ name: "list", choosing: true })}
              onUndo={() => {
                actions.restore(view.task.id);
                announce("The task is open again.");
                setView({ name: "focus", id: view.task.id });
              }}
            />
          </motion.div>
        )}

        {view.name === "rest" && (
          <motion.div key="rest" {...fade} className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 safe-t safe-b">
            <Field tone={part} className="h-48 rounded-[28px]">
              <Contours className="absolute inset-0 -z-10 h-full w-full" count={5} />
              <Ribbon tone={part} dot className="absolute inset-0 h-full w-full" />
            </Field>
            <h1 className="t-display mt-8 text-[40px]">You can stop here.</h1>
            <p className="t-body mt-3 text-ink-2">Your list is saved on this device. Close NudgeMe whenever you like.</p>
            <button type="button" className="btn btn-line mt-8 self-start" onClick={() => setView({ name: "today" })}>
              Back to today
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Capture open={capture} onClose={() => setCapture(false)} state={state} actions={actions} announce={announce} />
      <TaskSheet task={openTask} onClose={() => setOpenId(null)} actions={actions} onFocus={startFocus} onFinished={finished} announce={announce} />
      <Settings open={settings} onClose={() => setSettings(false)} state={state} actions={actions} />
    </MotionConfig>
  );
}
