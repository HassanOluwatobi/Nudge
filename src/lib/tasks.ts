// NudgeMe v1.1 data model. Everything lives in this browser. No server, no AI.

export type Bucket = "today" | "week" | "later" | "done";

export type Task = {
  id: string;
  title: string;
  /** The next small thing to do. Empty means "not chosen yet". */
  step: string;
  bucket: Bucket;
  due?: string; // YYYY-MM-DD
  /** How many steps were finished on this task. */
  steps: number;
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
  /** Where a finished task came from, so Restore can put it back. */
  prevBucket?: Exclude<Bucket, "done">;
};

export type Meta = {
  /** "Make today easy": one task is enough for this date. */
  easy?: { date: string; taskId: string };
  /** Tasks the person passed over today, so the suggestion moves on. */
  passed?: { date: string; ids: string[] };
  /** A task the person chose to start with today. */
  pinned?: { date: string; id: string };
  timer?: { taskId: string; end: number; mins: number; pausedLeft?: number };
};

export type State = { v: 11; tasks: Task[]; meta: Meta };

export const MAX_TITLE = 140;
export const MAX_STEP = 160;
export const BUCKETS: Bucket[] = ["today", "week", "later", "done"];
export const BUCKET_NAME: Record<Bucket, string> = {
  today: "Today",
  week: "This week",
  later: "Later",
  done: "Done today",
};

export const freshState = (): State => ({ v: 11, tasks: [], meta: {} });

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

// ---------- dates (local time) ----------
export const ymd = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
};

export const isoDay = (iso?: string) => (iso ? ymd(new Date(iso)) : undefined);

export const prettyDue = (due: string, today = ymd()) => {
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (due < today) return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const diff = Math.round((date.getTime() - new Date(today + "T00:00").getTime()) / 864e5);
  if (diff < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// ---------- step ideas (simple rules, always editable) ----------
export function suggestStep(title: string): string {
  const t = title.toLowerCase().trim();
  if (/\b(airtime|recharge|data bundle|top ?up)\b/.test(t)) return "Open your bank app or dial the recharge code.";
  if (/^(call|phone|ring)\b/.test(t)) return "Find the number.";
  if (/^(email|reply|message|text|dm|send|follow up|whatsapp)\b/.test(t)) return "Open a new message and write the first line.";
  if (/^(buy|order|get|pick up)\b/.test(t)) return "Write down where you will get it.";
  if (/^(pay|transfer)\b/.test(t)) return "Open your bank app.";
  if (/^(write|draft|outline|blog)\b/.test(t)) return "Open a blank page and write one rough sentence.";
  if (/^(design|redesign|sketch|mock)\b/.test(t)) return "Open the file and look at what is there.";
  if (/^(clean|wash|tidy|laundry|sweep|iron)\b/.test(t)) return "Pick one small corner to start with.";
  if (/^(fix|review|check|update|edit)\b/.test(t)) return "Open it and note what needs changing.";
  if (/^(book|schedule|plan)\b/.test(t)) return "Open your calendar and pick a day.";
  if (/^(read|study|revise|learn)\b/.test(t)) return "Open the book or notes to the right page.";
  if (/^(build|make|create|set up|setup)\b/.test(t)) return "Write down the very first thing you need.";
  return "Get out what you need to begin.";
}

/** A smaller version of a step. The person always approves it first. */
export function smallerStep(step: string): string {
  const s = step.trim().replace(/\.$/, "");
  if (!s) return "Just get out what you need.";
  if (/^open\b/i.test(s)) return "Only open it. Nothing else yet.";
  if (/^write\b/i.test(s)) return "Write three words. Messy is fine.";
  if (/^find\b/i.test(s)) return "Only look where it might be.";
  if (/^(pick|choose)\b/i.test(s)) return "Point at the first option you see.";
  if (/^get out\b/i.test(s)) return "Put one thing you need in front of you.";
  return `Spend 2 minutes on: ${s.charAt(0).toLowerCase()}${s.slice(1)}.`;
}

// ---------- capture ----------
const TOMORROW = /\b(tomorrow|tomorow|tmrw|tmr|2moro)\b/i;

/** Read a raw thought. Keeps the words. Only lifts a clear "today" or "tomorrow". */
export function readThought(raw: string, today = ymd()): { title: string; bucket: Bucket; due?: string } {
  let title = raw.replace(/\s+/g, " ").trim();
  let bucket: Bucket = "today";
  let due: string | undefined;
  if (TOMORROW.test(title)) {
    due = addDays(today, 1);
    bucket = "week";
    title = title.replace(TOMORROW, "").replace(/\s+/g, " ").trim() || title;
  } else if (/\b(next week|later|someday|one day)\b/i.test(title)) {
    bucket = "later";
  } else if (/\bthis week\b/i.test(title)) {
    bucket = "week";
  }
  title = title.replace(/^[-*•]\s*/, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return { title: title.slice(0, MAX_TITLE), bucket, due };
}

export function makeTask(title: string, bucket: Bucket = "today", due?: string): Task {
  const now = new Date().toISOString();
  return { id: uid(), title: title.slice(0, MAX_TITLE), step: "", bucket, due, steps: 0, createdAt: now, updatedAt: now };
}

// ---------- choosing ----------
const byPriority = (a: Task, b: Task) =>
  (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt);

/** Today's open tasks, soonest first. Due today or earlier counts as today. */
export function todayTasks(s: State, today = ymd()): Task[] {
  return s.tasks
    .filter((t) => t.bucket === "today" || (t.bucket !== "done" && !!t.due && t.due <= today))
    .sort(byPriority);
}

/** One suggested place to start. Skips anything passed over today. */
export function suggestion(s: State, today = ymd()): Task | undefined {
  if (s.meta.easy?.date === today) {
    const t = s.tasks.find((x) => x.id === s.meta.easy!.taskId && x.bucket !== "done");
    if (t) return t;
  }
  if (s.meta.pinned?.date === today) {
    const t = s.tasks.find((x) => x.id === s.meta.pinned!.id && x.bucket !== "done");
    if (t) return t;
  }
  const passed = s.meta.passed?.date === today ? s.meta.passed.ids : [];
  const list = todayTasks(s, today);
  const pool = list.length ? list : s.tasks.filter((t) => t.bucket === "week").sort(byPriority);
  return pool.find((t) => !passed.includes(t.id)) ?? pool[0];
}

export const doneToday = (s: State, today = ymd()) =>
  s.tasks.filter((t) => t.bucket === "done" && isoDay(t.doneAt) === today).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

export const doneEarlier = (s: State, today = ymd()) =>
  s.tasks.filter((t) => t.bucket === "done" && isoDay(t.doneAt) !== today).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

export const isDuplicate = (s: State, title: string) =>
  s.tasks.some((t) => t.bucket !== "done" && t.title.toLowerCase() === title.trim().toLowerCase());

// ---------- repair ----------
/** Make saved data safe, whatever shape it is in. Never throws. */
export function sanitize(raw: unknown): State {
  const fresh = freshState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fresh;
  const r = raw as Partial<State> & { tasks?: unknown[] };
  const now = new Date().toISOString();
  const tasks: Task[] = (Array.isArray(r.tasks) ? r.tasks : [])
    .filter((t): t is Task => !!t && typeof t === "object" && typeof (t as Task).title === "string" && !!(t as Task).title.trim())
    .map((t) => ({
      id: typeof t.id === "string" && t.id ? t.id : uid(),
      title: t.title.trim().slice(0, MAX_TITLE),
      step: typeof t.step === "string" ? t.step.slice(0, MAX_STEP) : "",
      bucket: BUCKETS.includes(t.bucket) ? t.bucket : "later",
      due: typeof t.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : undefined,
      steps: Math.max(0, Number(t.steps) || 0),
      createdAt: typeof t.createdAt === "string" ? t.createdAt : now,
      updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : now,
      doneAt: typeof t.doneAt === "string" ? t.doneAt : t.bucket === "done" ? now : undefined,
      prevBucket: t.prevBucket && t.prevBucket !== ("done" as Bucket) && BUCKETS.includes(t.prevBucket) ? t.prevBucket : undefined,
    }));
  // Drop exact duplicate ids, keep the first.
  const seen = new Set<string>();
  const unique = tasks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  const m = r.meta && typeof r.meta === "object" && !Array.isArray(r.meta) ? (r.meta as Meta) : {};
  const meta: Meta = {};
  if (m.easy && typeof m.easy.date === "string" && typeof m.easy.taskId === "string") meta.easy = m.easy;
  if (m.passed && typeof m.passed.date === "string" && Array.isArray(m.passed.ids)) meta.passed = { date: m.passed.date, ids: m.passed.ids.filter((x) => typeof x === "string") };
  if (m.pinned && typeof m.pinned.date === "string" && typeof m.pinned.id === "string") meta.pinned = m.pinned;
  if (m.timer && typeof m.timer.taskId === "string" && Number.isFinite(m.timer.end)) meta.timer = m.timer;
  return { v: 11, tasks: unique, meta };
}
