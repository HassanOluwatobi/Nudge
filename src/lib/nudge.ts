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
  /** First day of use, for the friendly "Day N" pill. */
  startedAt?: string;
  /** Has the home-screen tour been shown? */
  toured?: boolean;
  /** Small steps finished. Each one grows a plant too. */
  stepWins?: number;
  /** Daily calendar reminders the person added. */
  reminders?: { morning: string; evening: string; added: string };
  /** A running step timer. */
  timer?: { taskId: string; end: number; mins: number };
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

const cap = (s: string) => (/^https?:/i.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1));

export function suggestStep(title: string): string {
  const t = title.toLowerCase();
  if (/\b(airtime|recharge|data bundle|top ?up)\b/.test(t)) return "Dial your recharge code or open your bank app.";
  if (/^(call|phone|ring)\b/.test(t)) return "Find the number and press call.";
  if (/^(email|reply|message|text|dm|send|follow up|whatsapp)\b/.test(t))
    return "Open a new message and write the first line.";
  if (/^(buy|order|get|pick up)\b/.test(t)) return "Write down where you will buy it, or open the shop app.";
  if (/^(pay|transfer)\b/.test(t)) return "Open your bank app, or tell the person who pays.";
  if (/^(write|draft|outline|blog|finish)\b.*\b(essay|article|post|report|letter|story)\b/.test(t) || /^(write|draft|outline|blog)\b/.test(t))
    return "Open a blank page and write one rough sentence.";
  if (/^(design|redesign|sketch|mock)\b/.test(t)) return "Open the file and look at what is there now.";
  if (/^(clean|wash|tidy|laundry|sweep|iron)\b/.test(t)) return "Set a 5 minute timer and do one small part.";
  if (/^(fix|review|check|update|edit)\b/.test(t)) return "Open the thing and write down what needs changing.";
  if (/^(book|schedule|plan)\b/.test(t)) return "Open your calendar and pick a day.";
  if (/^(read|study|revise|learn)\b/.test(t)) return "Open your notes or book and read for 5 minutes.";
  if (/^(watch)\b/.test(t)) return "Press play and watch the first 5 minutes.";
  if (/^(build|make|create|set up|setup)\b/.test(t)) return "Write down the very first thing you need to do.";
  return "Set a 10 minute timer and just start.";
}

function nextWeekday(name: string, today: string) {
  const target = DAY_NAMES.indexOf(name);
  const [y, m, d] = today.split("-").map(Number);
  const now = new Date(y, m - 1, d);
  let diff = (target - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(today, diff);
}

const TOMORROW = /\b(tomorrow|tomorow|tommorow|tommorrow|tomorro|tmrw|tmr|2moro|2morrow|tmorrow)\b/;
const MAX_TITLE = 140;

export function parseCapture(raw: string, today = ymd()): Parsed | null {
  let text = raw.trim().replace(/^[-*•\d.)\s]+/, "").replace(/\s+/g, " ").trim();
  if (!/[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(text)) return null;
  if (text.length > MAX_TITLE) text = text.slice(0, MAX_TITLE - 1).trimEnd() + "…";
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
  } else if (TOMORROW.test(low)) {
    due = addDays(today, 1);
  } else if (/\b(next week|in a week)\b/.test(low)) {
    due = addDays(today, 7);
  } else if (/\b(this weekend|weekend)\b/.test(low)) {
    due = nextWeekday("saturday", today);
  } else if (/\b(someday|one day|eventually|sometime)\b/.test(low)) {
    bucket = "later";
  } else {
    const day = DAY_NAMES.find((n) => new RegExp(`\\b(on |by |this |next )?${n}\\b`).test(low));
    if (day) due = nextWeekday(day, today);
  }

  // Tidy the title: drop filler and the date words we already captured.
  text = text
    .replace(/^(i need to|i have to|i should|i must|need to|have to|remember to|remind me to|don't forget to|dont forget to|todo:?|to do:?)\s+/i, "")
    .replace(/\s+\b(today|tonight|tomorrow|tomorow|tommorow|tommorrow|tomorro|tmrw|tmr|2moro|2morrow|tmorrow|asap|right now|someday|eventually|sometime|next week|in a week|this weekend|weekend)\b\.?$/i, "")
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
  if (/^Do it for 2 minutes|^Set a (5|2) minute timer/.test(task.step)) return "Do it for 2 minutes. You can stop after that.";
  if (/timer/.test(task.step)) return "Set a 5 minute timer and just start.";
  return "Do it for 2 minutes. You can stop after that.";
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

/** Rough size of a first step, for the "First step · 10 min" label. */
export function stepMinutes(step: string): string {
  return `${stepMins(step)} min`;
}
export function stepMins(step: string): number {
  const m = step.match(/(\d+)\s*minute/i);
  if (m) return Number(m[1]);
  if (/^(find|open|dial|press|write down|start with)/i.test(step)) return 2;
  return 5;
}

/** Make saved data safe, whatever shape it is in. */
export function sanitize(raw: unknown): State {
  const fresh = freshState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fresh;
  const r = raw as Partial<State>;
  const BUCKETS: Bucket[] = ["today", "week", "later", "done"];
  const tasks: Task[] = (Array.isArray(r.tasks) ? r.tasks : [])
    .filter((t): t is Task => !!t && typeof t === "object" && typeof (t as Task).title === "string" && !!(t as Task).title.trim())
    .map((t) => ({
      ...t,
      id: typeof t.id === "string" && t.id ? t.id : uid(),
      title: t.title.slice(0, MAX_TITLE),
      bucket: BUCKETS.includes(t.bucket) ? t.bucket : "week",
      must: !!t.must,
      step: typeof t.step === "string" && t.step.trim() ? t.step : suggestStep(t.title),
      subs: (Array.isArray(t.subs) ? t.subs : []).map((x: unknown) =>
        typeof x === "string" ? { t: x, d: false } : { t: String((x as Sub)?.t ?? ""), d: !!(x as Sub)?.d }
      ),
      createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
    }));
  // Only one "one thing" at a time.
  let seen = false;
  for (const t of tasks) {
    if (t.must && t.bucket === "today" && !seen) seen = true;
    else t.must = false;
  }
  const entries: Entry[] = (Array.isArray(r.entries) ? r.entries : [])
    .filter((e): e is Entry => !!e && typeof e === "object" && typeof (e as Entry).text === "string")
    .map((e) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uid(),
      kind: e.kind === "note" ? "note" : "idea",
      status: e.status === "archived" || e.status === "task" ? e.status : "open",
      nudgeCount: Number(e.nudgeCount) || 0,
      createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date().toISOString(),
    }));
  const meta = r.meta && typeof r.meta === "object" && !Array.isArray(r.meta) ? r.meta : fresh.meta;
  return { v: 1, tasks, entries, meta: { ...meta, onboarded: !!meta.onboarded, eveningHour: Number(meta.eveningHour) || 18 } };
}

/** Same title already open? Used to skip accidental doubles. */
export const isDuplicate = (state: State, title: string) =>
  state.tasks.some((t) => t.bucket !== "done" && t.title.toLowerCase() === title.toLowerCase());

/** Today first, then anything due soonest. Used to suggest a one thing. */
export function candidates(state: State, limit = 3): Task[] {
  const order = (t: Task) => (t.bucket === "today" ? 0 : t.bucket === "week" ? 1 : 2);
  return state.tasks
    .filter((t) => t.bucket === "today" || t.bucket === "week")
    .sort((a, b) => order(a) - order(b) || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

export const dayNumber = (state: State, today = ymd()) => {
  const start = state.meta.startedAt ?? state.tasks.map((t) => isoDay(t.createdAt)!).sort()[0] ?? today;
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  return Math.max(1, Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 864e5) + 1);
};
