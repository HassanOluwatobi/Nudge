// NudgeMe core: data model, rule-based sorting, rollover. No AI needed.

export type Bucket = "today" | "week" | "later" | "done";
export type Est = "15m" | "30m" | "1h" | "2h" | "half day" | "day";
export type Sub = { t: string; d: boolean };

export type Task = {
  id: string;
  title: string;
  bucket: Bucket;
  must: boolean;
  step: string;
  est?: Est;
  due?: string; // YYYY-MM-DD
  subs: Sub[];
  doneAt?: string;
  prevBucket?: Bucket;
  createdAt: string;
};

export type EntryKind = "idea" | "note";
export type Entry = {
  id: string;
  text: string;
  kind: EntryKind;
  remind: boolean;
  nextNudge?: string;
  nudgeCount: number;
  status: "open" | "archived" | "task";
  linkedTaskId?: string;
  createdAt: string;
};

export type Meta = {
  onboarded: boolean;
  lastOpen?: string;
  morningSeen?: string;
  eveningSeen?: string;
  lowEnergy?: { date: string; taskId?: string };
  eveningHour: number;
  yesterdayWins?: string[];
  win?: { date: string; title: string };
};

export type State = { v: 1; tasks: Task[]; entries: Entry[]; meta: Meta };

export const EST_OPTIONS: Est[] = ["15m", "30m", "1h", "2h", "half day", "day"];
export const NUDGE_DAYS = [3, 7, 14, 30];

export const freshState = (): State => ({
  v: 1,
  tasks: [],
  entries: [],
  meta: { onboarded: false, eveningHour: 18 },
});

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

// ---------- dates (local time) ----------
export const ymd = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
};

export const isoDay = (iso?: string) => (iso ? ymd(new Date(iso)) : undefined);

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const prettyDue = (due: string, today = ymd()) => {
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  if (due < today) return "Earlier";
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const diff = Math.round((date.getTime() - new Date(today + "T00:00").getTime()) / 864e5);
  if (diff < 7) return DAY_NAMES[date.getDay()].replace(/^./, (c) => c.toUpperCase());
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// ---------- rule-based capture ----------
export type Parsed =
  | { kind: "task"; title: string; bucket: Bucket; due?: string; est?: Est; step: string }
  | { kind: "idea" | "note"; text: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function suggestStep(title: string): string {
  const t = title.toLowerCase();
  if (/^(call|phone|ring)\b/.test(t)) return "Find the number and press call.";
  if (/^(email|reply|message|text|dm|send|follow up)\b/.test(t))
    return "Open a blank message and write the first line.";
  if (/^(buy|order|get|pick up)\b/.test(t)) return "Open the shop or app and add it to your cart.";
  if (/^(pay|transfer)\b/.test(t)) return "Open your banking app.";
  if (/^(write|draft|outline|blog)\b/.test(t)) return "Open a blank page and write one rough sentence.";
  if (/^(design|redesign|sketch|mock)\b/.test(t)) return "Open the file and screenshot what's there now.";
  if (/^(fix|review|check|update|edit|clean)\b/.test(t)) return "Open it and list what needs changing.";
  if (/^(book|schedule|plan)\b/.test(t)) return "Open your calendar and pick a day.";
  if (/^(read|watch|learn|study)\b/.test(t)) return "Open it and do the first 5 minutes.";
  if (/^(build|make|create|set up|setup)\b/.test(t)) return "Write down the very first thing it needs.";
  return "Set a 10 minute timer and just begin.";
}

function nextWeekday(name: string, today: string) {
  const target = DAY_NAMES.indexOf(name);
  const [y, m, d] = today.split("-").map(Number);
  const now = new Date(y, m - 1, d);
  let diff = (target - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(today, diff);
}

export function parseCapture(raw: string, today = ymd()): Parsed | null {
  let text = raw.trim().replace(/^[-*•\d.)\s]+/, "").trim();
  if (!text) return null;
  const low = text.toLowerCase();

  if (/^(idea|what if|maybe|could we|imagine)\b/.test(low)) {
    return { kind: "idea", text: cap(text.replace(/^idea\s*[:\-]?\s*/i, "")) };
  }
  if (/^(note|remember that|fyi|nb)\b/.test(low) || /https?:\/\//.test(low)) {
    return { kind: "note", text: cap(text.replace(/^note\s*[:\-]?\s*/i, "")) };
  }

  let bucket: Bucket = "week";
  let due: string | undefined;
  if (/\b(today|tonight|asap|right now)\b/.test(low)) {
    bucket = "today";
    due = today;
  } else if (/\btomorrow\b/.test(low)) {
    due = addDays(today, 1);
  } else if (/\b(someday|one day|eventually|sometime)\b/.test(low)) {
    bucket = "later";
  } else {
    const day = DAY_NAMES.find((n) => new RegExp(`\\b(on |by |this |next )?${n}\\b`).test(low));
    if (day) due = nextWeekday(day, today);
  }

  // Tidy the title: drop filler and the date words we already captured.
  text = text
    .replace(/^(i need to|i have to|i should|i must|need to|have to|remember to|remind me to|don't forget to|dont forget to|todo:?|to do:?)\s+/i, "")
    .replace(/\s+\b(today|tonight|tomorrow|asap|right now|someday|eventually|sometime)\b\.?$/i, "")
    .replace(/\s+\b(on |by |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b\.?$/i, "")
    .replace(/[.]+$/, "")
    .trim();
  const title = cap(text);

  let est: Est | undefined;
  if (/^(call|email|reply|text|message|pay|buy|send|book|dm)\b/i.test(title)) est = "15m";

  return { kind: "task", title, bucket, due, est, step: suggestStep(title) };
}

/** Split a brain dump into separate thoughts. */
export function splitDump(raw: string): string[] {
  return raw
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z])|;\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function makeTask(p: Extract<Parsed, { kind: "task" }>): Task {
  return {
    id: uid(),
    title: p.title,
    bucket: p.bucket,
    must: false,
    step: p.step,
    est: p.est,
    due: p.due,
    subs: [],
    createdAt: new Date().toISOString(),
  };
}

export function makeEntry(kind: EntryKind, text: string, today = ymd(), linkedTaskId?: string): Entry {
  return {
    id: uid(),
    text,
    kind,
    remind: kind === "idea",
    nextNudge: kind === "idea" ? addDays(today, NUDGE_DAYS[0]) : undefined,
    nudgeCount: 0,
    status: "open",
    linkedTaskId,
    createdAt: new Date().toISOString(),
  };
}

/** A smaller first step, used by "Make it smaller" and nightly rollover. */
export function shrinkStep(task: Task): string {
  const next = task.subs.find((s) => !s.d);
  if (next) return `Start with: ${next.t}`;
  if (/^Set a (5|2) minute timer/.test(task.step)) return "Just open it. That's the whole step.";
  if (/timer/.test(task.step)) return "Set a 5 minute timer and just begin.";
  return "Just open it. That's the whole step.";
}

// ---------- new-day rollover (the evening wrap-up rules) ----------
export function rollover(state: State, today = ymd()): State {
  const last = state.meta.lastOpen;
  if (!last || last >= today) return { ...state, meta: { ...state.meta, lastOpen: today } };

  const yesterdayWins = state.tasks
    .filter((t) => t.bucket === "done" && isoDay(t.doneAt) === last)
    .map((t) => t.title);

  const tasks = state.tasks.map((t) =>
    t.bucket === "today" ? { ...t, must: false, step: t.subs.some((s) => !s.d) ? shrinkStep(t) : t.step } : t
  );

  return {
    ...state,
    tasks,
    meta: { ...state.meta, lastOpen: today, yesterdayWins, lowEnergy: undefined },
  };
}

export const dueNudges = (state: State, today = ymd()) =>
  state.entries
    .filter((e) => e.status === "open" && e.remind && e.nextNudge && e.nextNudge <= today)
    .slice(0, 3);

export const doneOn = (state: State, day: string) =>
  state.tasks.filter((t) => t.bucket === "done" && isoDay(t.doneAt) === day);

export const WIN_LINES = [
  "Done. That's off your plate.",
  "Nice. You did that.",
  "One less thing to carry.",
  "That counts. Well done.",
  "Finished. Take a breath.",
];
