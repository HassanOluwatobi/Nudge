"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Bucket,
  type Entry,
  type EntryKind,
  type Settings,
  type State,
  type Task,
  MAX_STEP,
  MAX_TITLE,
  RESURFACE_DAYS,
  addDays,
  freshState,
  makeTask,
  readThought,
  sanitize,
  step,
  todayTasks,
  uid,
  weekStart,
  ymd,
} from "./tasks";
import { noteChange } from "./link";

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
    try {
      localStorage.setItem(`${KEY}.broken.${Date.now()}`, raw);
    } catch {}
    setTimeout(() => toast("Something in your saved list looked off. I kept a copy, and you're fine to carry on."), 300);
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
      toast("This browser won't save your list. Keep this tab open so you don't lose anything.", { duration: 8000 });
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

  // Counts changes made on this device, so sync knows when to send them.
  const [localRev, setLocalRev] = useState(0);
  const revRef = useRef(0);

  const update = useCallback((fn: (s: State) => State) => {
    const prev = ref.current ?? freshState();
    const next = fn(prev);
    if (next === prev) return;
    ref.current = next;
    save(next);
    setState(next);
    if (noteChange(prev, next)) {
      revRef.current += 1;
      setLocalRev(revRef.current);
    }
  }, []);

  /** Changes that came from another device. Saved, but not sent back. */
  const applySynced = useCallback((next: State) => {
    ref.current = next;
    save(next);
    setState(next);
  }, []);
  const getState = useCallback(() => ref.current ?? freshState(), []);
  const getRev = useCallback(() => revRef.current, []);

  const mapTask = useCallback(
    (id: string, fn: (t: Task) => Task) =>
      update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...fn(t), updatedAt: new Date().toISOString() } : t)) })),
    [update]
  );

  const actions = {
    // ---------- tasks ----------
    capture(raw: string, extra: Partial<Task> = {}): Task | null {
      const text = raw.trim();
      if (!text) return null;
      const r = readThought(text);
      const task = makeTask(r.title, r.bucket, { due: r.due, ...extra, part: "anytime" });
      update((s) => ({ ...s, tasks: [...s.tasks, task] }));
      return task;
    },
    captureMany(lines: string[], extra: Partial<Task> = {}): Task[] {
      const made = lines.map((l) => {
        const r = readThought(l);
        return makeTask(r.title, r.bucket, { due: r.due, ...extra, part: "anytime" });
      });
      if (made.length) update((s) => ({ ...s, tasks: [...s.tasks, ...made] }));
      return made;
    },
    patch(id: string, p: Partial<Task>) {
      const clean: Partial<Task> = { ...p };
      if (p.title !== undefined) {
        if (!p.title.trim()) delete clean.title;
        else clean.title = p.title.trim().slice(0, MAX_TITLE);
      }
      mapTask(id, (t) => ({ ...t, ...clean }));
    },
    move(id: string, bucket: Exclude<Bucket, "done">) {
      mapTask(id, (t) => ({ ...t, bucket, doneAt: undefined, prevBucket: undefined }));
    },
    tomorrow(id: string) {
      mapTask(id, (t) => ({ ...t, bucket: "week", due: addDays(ymd(), 1) }));
    },
    duplicate(id: string) {
      const t = ref.current?.tasks.find((x) => x.id === id);
      if (!t) return;
      const now = new Date().toISOString();
      update((s) => ({ ...s, tasks: [...s.tasks, { ...t, id: uid(), steps: t.steps.map((x) => ({ ...x, id: uid(), d: false })), createdAt: now, updatedAt: now, doneAt: undefined, bucket: t.bucket === "done" ? "today" : t.bucket }] }));
    },
    addStep(id: string, text: string) {
      if (!text.trim()) return;
      mapTask(id, (t) => ({ ...t, steps: [...t.steps, step(text)] }));
    },
    addSteps(id: string, texts: string[]) {
      mapTask(id, (t) => ({ ...t, steps: [...t.steps, ...texts.filter((x) => x.trim()).map(step)] }));
    },
    editStep(id: string, stepId: string, text: string) {
      mapTask(id, (t) => ({ ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, t: text.slice(0, MAX_STEP) } : s)).filter((s) => s.t.trim()) }));
    },
    removeStep(id: string, stepId: string) {
      mapTask(id, (t) => ({ ...t, steps: t.steps.filter((s) => s.id !== stepId) }));
    },
    /** Tick a step. Never finishes the task. */
    toggleStep(id: string, stepId: string) {
      mapTask(id, (t) => ({ ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, d: !s.d } : s)) }));
    },
    replaceStep(id: string, stepId: string, text: string) {
      mapTask(id, (t) => ({ ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, t: text.trim().slice(0, MAX_STEP) } : s)) }));
    },
    /** Finish the whole task. Always its own action. */
    finish(id: string) {
      update((s) => ({
        ...s,
        meta: { ...s.meta, timer: s.meta.timer?.taskId === id ? undefined : s.meta.timer },
        tasks: s.tasks.map((t) =>
          t.id === id && t.bucket !== "done" ? { ...t, prevBucket: t.bucket as Task["prevBucket"], bucket: "done", doneAt: new Date().toISOString(), remindAt: undefined } : t
        ),
      }));
    },
    restore(id: string) {
      mapTask(id, (t) => ({ ...t, bucket: t.prevBucket ?? "today", doneAt: undefined, prevBucket: undefined }));
    },
    remove(id: string): Task | undefined {
      const t = ref.current?.tasks.find((x) => x.id === id);
      update((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
      return t;
    },
    put(task: Task) {
      update((s) => ({ ...s, tasks: s.tasks.some((t) => t.id === task.id) ? s.tasks : [...s.tasks, task] }));
    },

    // ---------- choosing ----------
    pass(id: string) {
      const today = ymd();
      update((s) => {
        const ids = s.meta.passed?.date === today ? s.meta.passed.ids : [];
        let next = [...ids.filter((x) => x !== id), id];
        if (todayTasks(s, today).every((t) => next.includes(t.id))) next = [id];
        return { ...s, meta: { ...s.meta, pinned: s.meta.pinned?.id === id ? undefined : s.meta.pinned, passed: { date: today, ids: next } } };
      });
    },
    choose(id: string) {
      const today = ymd();
      update((s) => ({
        ...s,
        meta: {
          ...s.meta,
          easy: s.meta.easy?.date === today ? { date: today, taskId: id } : s.meta.easy,
          pinned: { date: today, id },
          passed: { date: today, ids: s.meta.passed?.date === today ? s.meta.passed.ids.filter((x) => x !== id) : [] },
        },
      }));
    },
    makeEasy(taskId?: string) {
      update((s) => ({ ...s, meta: { ...s.meta, easy: { date: ymd(), taskId } } }));
    },
    clearEasy() {
      update((s) => ({ ...s, meta: { ...s.meta, easy: undefined } }));
    },

    // ---------- timer ----------
    startTimer(mins: number, taskId?: string) {
      update((s) => ({ ...s, meta: { ...s.meta, timer: { taskId, mins, end: Date.now() + mins * 60_000 } } }));
    },
    addMinute(n = 1) {
      update((s) => {
        const t = s.meta.timer;
        if (!t) return s;
        const ms = n * 60_000;
        return { ...s, meta: { ...s.meta, timer: t.pausedLeft !== undefined ? { ...t, mins: t.mins + n, pausedLeft: t.pausedLeft + ms } : { ...t, mins: t.mins + n, end: Math.max(t.end, Date.now()) + ms } } };
      });
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

    // ---------- ideas and notes ----------
    addEntry(text: string, kind: EntryKind): Entry | null {
      if (!text.trim()) return null;
      const e: Entry = { id: uid(), text: text.trim().slice(0, 2000), kind, seen: 0, status: "open", createdAt: new Date().toISOString(), resurfaceAt: kind === "idea" ? addDays(ymd(), RESURFACE_DAYS[0]) : undefined };
      update((s) => ({ ...s, entries: [e, ...s.entries] }));
      return e;
    },
    editEntry(id: string, text: string) {
      if (!text.trim()) return;
      update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, text: text.trim().slice(0, 2000) } : e)) }));
    },
    /** "Not yet": the idea comes back later, a little further out each time. */
    snoozeEntry(id: string) {
      update((s) => ({
        ...s,
        entries: s.entries.map((e) => {
          if (e.id !== id) return e;
          const seen = e.seen + 1;
          return { ...e, seen, resurfaceAt: addDays(ymd(), RESURFACE_DAYS[Math.min(seen, RESURFACE_DAYS.length - 1)]) };
        }),
      }));
    },
    archiveEntry(id: string) {
      update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, status: "archived" as const } : e)) }));
    },
    reopenEntry(id: string) {
      update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, status: "open" as const } : e)) }));
    },
    removeEntry(id: string): Entry | undefined {
      const e = ref.current?.entries.find((x) => x.id === id);
      update((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== id) }));
      return e;
    },
    putEntry(e: Entry) {
      update((s) => ({ ...s, entries: s.entries.some((x) => x.id === e.id) ? s.entries : [e, ...s.entries] }));
    },
    entryToTask(id: string): Task | null {
      const e = ref.current?.entries.find((x) => x.id === id);
      if (!e) return null;
      const r = readThought(e.text.split("\n")[0]);
      const task = makeTask(r.title, "week");
      update((s) => ({ ...s, tasks: [...s.tasks, task], entries: s.entries.map((x) => (x.id === id ? { ...x, status: "task" as const } : x)) }));
      return task;
    },

    // ---------- check-ins ----------
    finishCheckin(kind: "morning" | "evening" | "weekly") {
      const today = ymd();
      update((s) => ({
        ...s,
        meta: {
          ...s.meta,
          ...(kind === "morning" ? { morningDone: today } : kind === "evening" ? { eveningDone: today } : { weeklyDone: weekStart(today, s.settings.weeklyDay) }),
        },
      }));
    },
    setEnergy(level: "low" | "ok") {
      update((s) => ({ ...s, meta: { ...s.meta, energy: { date: ymd(), level } } }));
    },
    planToday(ids: string[]) {
      update((s) => ({ ...s, tasks: s.tasks.map((t) => (ids.includes(t.id) && t.bucket !== "done" ? { ...t, bucket: "today" } : t)) }));
    },

    // ---------- calendar import ----------
    /** Turn approved calendar events into tasks. Skips anything already imported. */
    importEvents(events: { key: string; title: string; start: Date; end?: Date; allDay: boolean }[]) {
      const today = ymd();
      let added = 0;
      update((s) => {
        const have = new Set(s.tasks.map((t) => t.ext).filter(Boolean));
        const fresh = events
          .filter((e) => !have.has(e.key))
          .map((e) => {
            const day = ymd(e.start);
            const reminder = !e.allDay && e.start.getTime() - 10 * 60000 > Date.now() ? new Date(e.start.getTime() - 10 * 60000).toISOString() : undefined;
            return makeTask(e.title, day === today ? "today" : day <= addDays(today, 6) ? "week" : "later", {
              due: day,
              part: "anytime",
              remindAt: reminder,
              emoji: "🗓️",
              ext: e.key,
            });
          });
        added = fresh.length;
        return { ...s, tasks: [...s.tasks, ...fresh], settings: { ...s.settings, sync: { ...s.settings.sync, last: new Date().toISOString() } } };
      });
      return added;
    },
    skipEvents(keys: string[]) {
      update((s) => ({ ...s, settings: { ...s.settings, sync: { ...s.settings.sync, skipped: [...(s.settings.sync.skipped ?? []), ...keys].slice(-500) } } }));
    },
    setSync(p: Partial<State["settings"]["sync"]>) {
      update((s) => ({ ...s, settings: { ...s.settings, sync: { ...s.settings.sync, ...p } } }));
    },

    // ---------- settings and data ----------
    setSettings(p: Partial<Settings>) {
      update((s) => ({ ...s, settings: { ...s.settings, ...p } }));
    },
    seenIntro() {
      update((s) => ({ ...s, meta: { ...s.meta, intro: true } }));
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

  return { state, actions, sync: { localRev, applySynced, getState, getRev } };
}

export type Actions = ReturnType<typeof useTasks>["actions"];
