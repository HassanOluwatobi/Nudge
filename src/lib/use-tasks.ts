"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Bucket, type State, type Task, MAX_STEP, MAX_TITLE, freshState, makeTask, readThought, sanitize, todayTasks, ymd } from "./tasks";

export const KEY = "nudgeme.v11";
export const DRAFT_KEY = "nudgeme.v11.draft";

function load(): State {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return freshState();
  }
  if (!raw) return freshState();
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    // Keep the broken copy so nothing is lost, then start clean.
    try {
      localStorage.setItem(`${KEY}.broken.${Date.now()}`, raw);
    } catch {}
    setTimeout(() => toast("Some saved data could not be read. A copy was kept, and you can keep going."), 300);
    return freshState();
  }
}

let warned = false;
function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    warned = false;
  } catch {
    if (!warned) {
      warned = true;
      toast("This browser would not save your list. Your changes stay while this tab is open.", { duration: 8000 });
    }
  }
}

export function useTasks() {
  const [state, setState] = useState<State | null>(null);
  const ref = useRef<State | null>(null);

  useEffect(() => {
    const s = load();
    ref.current = s;
    setState(s);
    // Another tab changed the list: follow it.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const next = sanitize(JSON.parse(e.newValue));
        ref.current = next;
        setState(next);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (s: State) => State) => {
    const cur = ref.current ?? freshState();
    const next = fn(cur);
    ref.current = next;
    save(next);
    setState(next);
  }, []);

  const patch = useCallback(
    (id: string, p: Partial<Task>) =>
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p, updatedAt: new Date().toISOString() } : t)),
      })),
    [update]
  );

  const actions = {
    /** Save the raw thought first. Returns the new task. */
    capture(raw: string): Task | null {
      const text = raw.trim();
      if (!text) return null;
      const r = readThought(text);
      const task = makeTask(r.title, r.bucket, r.due);
      update((s) => ({ ...s, tasks: [...s.tasks, task] }));
      return task;
    },
    edit(id: string, p: { title?: string; step?: string; due?: string | null }) {
      const next: Partial<Task> = {};
      if (p.title !== undefined && p.title.trim()) next.title = p.title.trim().slice(0, MAX_TITLE);
      if (p.step !== undefined) next.step = p.step.trim().slice(0, MAX_STEP);
      if (p.due !== undefined) next.due = p.due || undefined;
      patch(id, next);
    },
    move(id: string, bucket: Exclude<Bucket, "done">) {
      patch(id, { bucket, doneAt: undefined, prevBucket: undefined });
    },
    /** Finish one step. The task stays open. */
    stepDone(id: string, nextStep = "") {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, steps: t.steps + 1, step: nextStep.trim().slice(0, MAX_STEP), updatedAt: new Date().toISOString() } : t
        ),
      }));
    },
    undoStep(id: string, step: string) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, steps: Math.max(0, t.steps - 1), step } : t)),
      }));
    },
    /** Finish the whole task. Always its own, separate action. */
    finish(id: string) {
      update((s) => ({
        ...s,
        meta: { ...s.meta, timer: s.meta.timer?.taskId === id ? undefined : s.meta.timer },
        tasks: s.tasks.map((t) =>
          t.id === id && t.bucket !== "done"
            ? { ...t, prevBucket: t.bucket as Exclude<Bucket, "done">, bucket: "done", doneAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : t
        ),
      }));
    },
    restore(id: string) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, bucket: t.prevBucket ?? "today", doneAt: undefined, prevBucket: undefined } : t)),
      }));
    },
    remove(id: string): Task | undefined {
      const t = ref.current?.tasks.find((x) => x.id === id);
      update((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
      return t;
    },
    put(task: Task) {
      update((s) => ({ ...s, tasks: s.tasks.some((t) => t.id === task.id) ? s.tasks : [...s.tasks, task] }));
    },
    /** "Not this one": move the suggestion on, for today only. */
    pass(id: string) {
      const today = ymd();
      update((s) => {
        const ids = s.meta.passed?.date === today ? s.meta.passed.ids : [];
        const pinned = s.meta.pinned?.id === id ? undefined : s.meta.pinned;
        let next = [...ids.filter((x) => x !== id), id];
        // Went round the whole list: start the loop again after this one.
        if (todayTasks(s, today).every((t) => next.includes(t.id))) next = [id];
        return { ...s, meta: { ...s.meta, pinned, passed: { date: today, ids: next } } };
      });
    },
    choose(id: string) {
      // The chosen task becomes today's place to start.
      const today = ymd();
      update((s) => {
        const ids = s.meta.passed?.date === today ? s.meta.passed.ids.filter((x) => x !== id) : [];
        const easy = s.meta.easy?.date === today ? { date: today, taskId: id } : s.meta.easy;
        return { ...s, meta: { ...s.meta, easy, pinned: { date: today, id }, passed: { date: today, ids } } };
      });
    },
    makeEasy(taskId: string) {
      update((s) => ({ ...s, meta: { ...s.meta, easy: { date: ymd(), taskId } } }));
    },
    clearEasy() {
      update((s) => ({ ...s, meta: { ...s.meta, easy: undefined } }));
    },
    startTimer(taskId: string, mins: number) {
      update((s) => ({ ...s, meta: { ...s.meta, timer: { taskId, mins, end: Date.now() + mins * 60_000 } } }));
    },
    pauseTimer() {
      update((s) => {
        const t = s.meta.timer;
        if (!t || t.pausedLeft !== undefined) return s;
        return { ...s, meta: { ...s.meta, timer: { ...t, pausedLeft: Math.max(0, t.end - Date.now()) } } };
      });
    },
    resumeTimer() {
      update((s) => {
        const t = s.meta.timer;
        if (!t || t.pausedLeft === undefined) return s;
        return { ...s, meta: { ...s.meta, timer: { taskId: t.taskId, mins: t.mins, end: Date.now() + t.pausedLeft } } };
      });
    },
    stopTimer() {
      update((s) => ({ ...s, meta: { ...s.meta, timer: undefined } }));
    },
    replaceAll(next: State) {
      update(() => next);
    },
    clearAll() {
      update(() => freshState());
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    },
  };

  return { state, actions };
}

export type Actions = ReturnType<typeof useTasks>["actions"];
