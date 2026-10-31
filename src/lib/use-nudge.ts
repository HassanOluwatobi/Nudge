"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDays,
  type Bucket,
  type Entry,
  type EntryKind,
  freshState,
  makeEntry,
  makeTask,
  NUDGE_DAYS,
  type Parsed,
  rollover,
  shrinkStep,
  type State,
  type Task,
  ymd,
} from "./nudge";

const KEY = "nudgeme.v1";

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      // Older subtasks may be plain strings.
      s.tasks = (s.tasks ?? []).map((t) => ({
        ...t,
        subs: (t.subs ?? []).map((x: unknown) =>
          typeof x === "string" ? { t: x, d: false } : (x as Task["subs"][number])
        ),
      }));
      s.entries = s.entries ?? [];
      s.meta = { ...s.meta, eveningHour: s.meta?.eveningHour ?? 18 };
      return s;
    }
  } catch {}
  return freshState();
}

export function useNudge() {
  const [state, setState] = useState<State | null>(null);
  const memory = useRef<State | null>(null);

  useEffect(() => {
    const s = rollover(read(), ymd());
    memory.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    if (!state) return;
    memory.current = state;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const update = useCallback((fn: (s: State) => State) => {
    setState((s) => (s ? fn(s) : s));
  }, []);

  const patchTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    [update]
  );

  const actions = {
    addParsed(p: Parsed): { type: "task" | EntryKind; id: string } {
      const today = ymd();
      if (p.kind === "task") {
        const t = makeTask(p);
        update((s) => ({ ...s, tasks: [...s.tasks, t] }));
        return { type: "task", id: t.id };
      }
      const e = makeEntry(p.kind, p.text, today);
      update((s) => ({ ...s, entries: [e, ...s.entries] }));
      return { type: p.kind, id: e.id };
    },

    /** Change what a fresh capture became. One tap fixes a wrong guess. */
    convert(ref: { type: "task" | EntryKind; id: string }, to: "task" | EntryKind, bucket?: Bucket) {
      let newId = ref.id;
      update((s) => {
        const today = ymd();
        if (ref.type === "task") {
          const t = s.tasks.find((x) => x.id === ref.id);
          if (!t) return s;
          if (to === "task") {
            return { ...s, tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, bucket: bucket ?? x.bucket } : x)) };
          }
          const e = makeEntry(to, t.title, today);
          newId = e.id;
          return { ...s, tasks: s.tasks.filter((x) => x.id !== t.id), entries: [e, ...s.entries] };
        }
        const e = s.entries.find((x) => x.id === ref.id);
        if (!e) return s;
        if (to === "task") {
          const t = makeTask({ kind: "task", title: e.text, bucket: bucket ?? "week", step: "Set a 10 minute timer and just begin." });
          newId = t.id;
          return { ...s, entries: s.entries.filter((x) => x.id !== e.id), tasks: [...s.tasks, t] };
        }
        return {
          ...s,
          entries: s.entries.map((x) =>
            x.id === e.id
              ? { ...x, kind: to, remind: to === "idea", nextNudge: to === "idea" ? addDays(today, NUDGE_DAYS[0]) : undefined }
              : x
          ),
        };
      });
      return { type: to, id: newId };
    },

    patchTask,

    setMust(id: string) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, must: true, bucket: "today" } : { ...t, must: false }
        ),
      }));
    },

    clearMust() {
      update((s) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t, must: false })) }));
    },

    move(id: string, bucket: Bucket) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, bucket, must: bucket === "today" ? t.must : false } : t
        ),
      }));
    },

    complete(id: string) {
      update((s) => ({
        ...s,
        meta: (() => {
          const t = s.tasks.find((x) => x.id === id);
          return t?.must ? { ...s.meta, win: { date: ymd(), title: t.title } } : s.meta;
        })(),
        tasks: s.tasks.map((t) =>
          t.id === id && t.bucket !== "done"
            ? { ...t, prevBucket: t.bucket, bucket: "done", must: false, doneAt: new Date().toISOString() }
            : t
        ),
      }));
    },

    restore(id: string) {
      update((s) => ({
        ...s,
        meta: s.meta.win && s.tasks.find((x) => x.id === id)?.title === s.meta.win.title ? { ...s.meta, win: undefined } : s.meta,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, bucket: t.prevBucket ?? "today", doneAt: undefined, must: s.meta.win?.title === t.title && !s.tasks.some((x) => x.must) }
            : t
        ),
      }));
    },

    shrink(id: string) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, step: shrinkStep(t) } : t)),
      }));
    },

    toggleSub(id: string, i: number) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, subs: t.subs.map((x, j) => (j === i ? { ...x, d: !x.d } : x)) } : t
        ),
      }));
    },

    addSub(id: string, text: string) {
      update((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, subs: [...t.subs, { t: text, d: false }] } : t)),
      }));
    },

    removeTask(id: string) {
      let removed: Task | undefined;
      update((s) => {
        removed = s.tasks.find((t) => t.id === id);
        return { ...s, tasks: s.tasks.filter((t) => t.id !== id) };
      });
      return () => removed && update((s) => ({ ...s, tasks: [...s.tasks, removed!] }));
    },

    // ---- entries ----
    patchEntry(id: string, patch: Partial<Entry>) {
      update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    },

    keepEntry(id: string) {
      const today = ymd();
      update((s) => ({
        ...s,
        entries: s.entries.map((e) => {
          if (e.id !== id) return e;
          const count = e.nudgeCount + 1;
          return { ...e, nudgeCount: count, nextNudge: addDays(today, NUDGE_DAYS[Math.min(count, NUDGE_DAYS.length - 1)]) };
        }),
      }));
    },

    entryToTask(id: string) {
      update((s) => {
        const e = s.entries.find((x) => x.id === id);
        if (!e) return s;
        const t = makeTask({ kind: "task", title: e.text, bucket: "week", step: "Set a 10 minute timer and just begin." });
        return {
          ...s,
          tasks: [...s.tasks, t],
          entries: s.entries.map((x) => (x.id === id ? { ...x, status: "task", linkedTaskId: t.id } : x)),
        };
      });
    },

    // ---- meta ----
    setMeta(patch: Partial<State["meta"]>) {
      update((s) => ({ ...s, meta: { ...s.meta, ...patch } }));
    },

    finishOnboarding(tasks: Task[], entries: Entry[], mustId?: string) {
      const today = ymd();
      update((s) => ({
        ...s,
        tasks: [
          ...s.tasks,
          ...tasks.map((t) => (t.id === mustId ? { ...t, must: true, bucket: "today" as Bucket } : t)),
        ],
        entries: [...entries, ...s.entries],
        meta: { ...s.meta, onboarded: true, lastOpen: today, morningSeen: today, eveningSeen: today },
      }));
    },

    importState(s: State) {
      setState(rollover(s, ymd()));
    },

    reset() {
      setState({ ...freshState(), meta: { ...freshState().meta, lastOpen: ymd() } });
    },
  };

  return { state, actions };
}

export type Actions = ReturnType<typeof useNudge>["actions"];
