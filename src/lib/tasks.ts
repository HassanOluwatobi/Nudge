// NudgeMe data model. Everything lives in this browser. No server, no paid AI.

export type Bucket = "today" | "week" | "later" | "done";
export type Part = "anytime" | "morning" | "afternoon" | "evening";
export type Hue = "blue" | "cyan" | "aqua" | "lime" | "peach" | "coral" | "pink" | "lilac";
export type Step = { id: string; t: string; d: boolean };

export type Task = {
  id: string;
  title: string;
  /** Small steps. The first unfinished one is "the next step". */
  steps: Step[];
  bucket: Bucket;
  part: Part;
  hue: Hue;
  emoji?: string;
  /** Rough minutes, for the timer and the row. */
  mins?: number;
  due?: string; // YYYY-MM-DD
  /** When to nudge, ISO time. */
  remindAt?: string;
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
  prevBucket?: Exclude<Bucket, "done">;
  /** Where an imported task came from, e.g. "google:abc123". Stops double imports. */
  ext?: string;
};

export type EntryKind = "idea" | "note";
export type Entry = {
  id: string;
  text: string;
  kind: EntryKind;
  /** Ideas come back after a while. Notes stay put. */
  resurfaceAt?: string; // YYYY-MM-DD
  seen: number;
  status: "open" | "archived" | "task";
  createdAt: string;
};

export type Settings = {
  morning: string; // "HH:MM"
  evening: string;
  weeklyDay: number; // 0 = Sunday, -1 = never
  ai: "chatgpt" | "claude" | "gemini" | "grok";
  notify: boolean;
  sound: boolean;
  haptics: boolean;
  calendarAdded?: string;
  /** Connected calendars. Tokens for Notion and Calendly stay on this device. */
  sync: { google?: boolean; outlook?: boolean; notion?: string; calendly?: string; ics?: string; last?: string; skipped?: string[] };
  theme?: "light" | "dark" | "system";
};

export type Meta = {
  easy?: { date: string; taskId?: string };
  passed?: { date: string; ids: string[] };
  pinned?: { date: string; id: string };
  timer?: { taskId?: string; end: number; mins: number; pausedLeft?: number };
  morningDone?: string; // date
  eveningDone?: string;
  weeklyDone?: string; // date of the reset
  energy?: { date: string; level: "low" | "ok" };
  intro?: boolean;
};

export type State = { v: 12; tasks: Task[]; entries: Entry[]; settings: Settings; meta: Meta };

export const MAX_TITLE = 140;
export const MAX_STEP = 160;
export const BUCKETS: Bucket[] = ["today", "week", "later", "done"];
export const PARTS: Part[] = ["anytime", "morning", "afternoon", "evening"];
export const HUES: Hue[] = ["blue", "cyan", "aqua", "lime", "peach", "coral", "pink", "lilac"];
export const BUCKET_NAME: Record<Bucket, string> = { today: "Today", week: "This week", later: "Later", done: "Done" };
export const PART_NAME: Record<Part, string> = { anytime: "Anytime", morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
export const MIN_CHOICES = [5, 10, 15, 30, 45, 60];
export const RESURFACE_DAYS = [3, 7, 14, 30];

export const DEFAULT_SETTINGS: Settings = { morning: "08:30", evening: "20:00", weeklyDay: 0, ai: "chatgpt", notify: false, sound: true, haptics: true, sync: {} };

export const freshState = (): State => ({ v: 12, tasks: [], entries: [], settings: { ...DEFAULT_SETTINGS }, meta: {} });

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

// ---------- dates (local time) ----------
export const ymd = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
export const isoDay = (iso?: string) => (iso ? ymd(new Date(iso)) : undefined);
export const hhmmToday = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
export const prettyDue = (due: string, today = ymd()) => {
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const diff = Math.round((date.getTime() - new Date(today + "T00:00").getTime()) / 864e5);
  if (diff > 0 && diff < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
export const prettyWhen = (iso: string) => {
  const d = new Date(iso);
  const day = ymd(d) === ymd() ? "Today" : ymd(d) === addDays(ymd(), 1) ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};
export const fmtMins = (m?: number) => (!m ? "" : m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`);
export const partNow = (h = new Date().getHours()): Part => (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");

// ---------- small helpers that read words (rules, no AI) ----------
export function suggestStep(title: string): string {
  const t = title.toLowerCase().trim();
  if (/\b(airtime|recharge|data bundle|top ?up)\b/.test(t)) return "Open your bank app or dial the recharge code";
  if (/^(call|phone|ring)\b/.test(t)) return "Find the number";
  if (/^(email|reply|message|text|dm|send|follow up|whatsapp)\b/.test(t)) return "Open a new message and write the first line";
  if (/^(buy|order|get|pick up)\b/.test(t)) return "Write down where you will get it";
  if (/^(pay|transfer)\b/.test(t)) return "Open your bank app";
  if (/^(write|draft|outline|blog)\b/.test(t)) return "Open a blank page and write one rough sentence";
  if (/^(design|redesign|sketch|mock)\b/.test(t)) return "Open the file and look at what is there";
  if (/^(clean|wash|tidy|laundry|sweep|iron)\b/.test(t)) return "Pick one small corner to start with";
  if (/^(fix|review|check|update|edit)\b/.test(t)) return "Open it and note what needs changing";
  if (/^(book|schedule|plan)\b/.test(t)) return "Open your calendar and pick a day";
  if (/^(read|study|revise|learn)\b/.test(t)) return "Open the book or notes to the right page";
  if (/^(gym|run|walk|workout|exercise)\b/.test(t)) return "Put on your shoes";
  return "Get out what you need to begin";
}

export function smallerStep(step: string): string {
  const s = step.trim().replace(/\.$/, "");
  if (!s) return "Just get out what you need";
  if (/^open\b/i.test(s)) return "Only open it. Nothing else yet";
  if (/^write\b/i.test(s)) return "Write three words. Messy is fine";
  if (/^find\b/i.test(s)) return "Only look where it might be";
  if (/^(pick|choose)\b/i.test(s)) return "Point at the first option you see";
  return `Spend 2 minutes on: ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
}

const EMOJI: [RegExp, string, Hue][] = [
  [/\b(call|phone|ring)\b/, "📞", "cyan"],
  [/\b(email|reply|message|text|dm|whatsapp|send)\b/, "✉️", "blue"],
  [/\b(buy|order|shop|groceries|pick up)\b/, "🛒", "peach"],
  [/\b(pay|rent|bill|bank|transfer|airtime|tax)\b/, "💳", "lime"],
  [/\b(clean|wash|tidy|laundry|sweep|iron|dishes)\b/, "🧺", "aqua"],
  [/\b(gym|run|walk|workout|exercise|yoga)\b/, "🏃", "coral"],
  [/\b(read|study|revise|learn|homework|exam)\b/, "📚", "lilac"],
  [/\b(write|draft|blog|essay|post|article)\b/, "✍️", "pink"],
  [/\b(design|sketch|figma|mock|deck|slides)\b/, "🎨", "pink"],
  [/\b(cook|meal|dinner|lunch|breakfast)\b/, "🍳", "peach"],
  [/\b(doctor|dentist|meds|pharmacy)\b/, "🩺", "aqua"],
  [/\b(book|schedule|plan|meeting)\b/, "🗓️", "blue"],
];
export function guessLook(title: string): { emoji?: string; hue: Hue } {
  const t = title.toLowerCase();
  for (const [re, e, h] of EMOJI) if (re.test(t)) return { emoji: e, hue: h };
  return { hue: HUES[Math.abs([...t].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % HUES.length] };
}

const TOMORROW = /\b(tomorrow|tomorow|tmrw|tmr|2moro)\b/i;
export function readThought(raw: string, today = ymd()): { title: string; bucket: Bucket; due?: string; part: Part } {
  let title = raw.replace(/\s+/g, " ").trim();
  let bucket: Bucket = "today";
  let due: string | undefined;
  let part: Part = "anytime";
  if (TOMORROW.test(title)) {
    due = addDays(today, 1);
    bucket = "week";
    title = title.replace(TOMORROW, "").replace(/\s+/g, " ").trim() || title;
  } else if (/\b(next week|later|someday|one day)\b/i.test(title)) bucket = "later";
  else if (/\bthis week\b/i.test(title)) bucket = "week";
  if (/\b(this morning|in the morning)\b/i.test(title)) part = "morning";
  else if (/\b(this afternoon|after lunch)\b/i.test(title)) part = "afternoon";
  else if (/\b(tonight|this evening)\b/i.test(title)) part = "evening";
  title = title.replace(/^[-*•]\s*/, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return { title: title.slice(0, MAX_TITLE), bucket, due, part };
}

export const step = (t: string): Step => ({ id: uid(), t: t.trim().slice(0, MAX_STEP), d: false });

export function makeTask(title: string, bucket: Bucket = "today", extra: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  const look = guessLook(title);
  return { id: uid(), title: title.slice(0, MAX_TITLE), steps: [], bucket, part: "anytime", hue: look.hue, emoji: look.emoji, createdAt: now, updatedAt: now, ...extra };
}

export const nextStep = (t: Task) => t.steps.find((s) => !s.d);
export const stepsDone = (t: Task) => t.steps.filter((s) => s.d).length;

/** Turn a pasted AI answer (or any list) into clean steps. */
export function parseSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•–]|\d+[.)]|step\s*\d+[:.)-]?)\s*/i, "").replace(/\*\*/g, "").trim())
    .filter((l) => l.length > 1 && l.length <= MAX_STEP && !/^(here|sure|okay|of course)\b.*:$/i.test(l))
    .slice(0, 12);
}

// ---------- choosing ----------
const byPriority = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.createdAt.localeCompare(b.createdAt);

export function todayTasks(s: State, today = ymd()): Task[] {
  return s.tasks.filter((t) => t.bucket === "today" || (t.bucket !== "done" && !!t.due && t.due <= today)).sort(byPriority);
}

export function suggestion(s: State, today = ymd()): Task | undefined {
  if (s.meta.easy?.date === today && s.meta.easy.taskId) {
    const t = s.tasks.find((x) => x.id === s.meta.easy!.taskId && x.bucket !== "done");
    if (t) return t;
  }
  if (s.meta.pinned?.date === today) {
    const t = s.tasks.find((x) => x.id === s.meta.pinned!.id && x.bucket !== "done");
    if (t) return t;
  }
  const passed = s.meta.passed?.date === today ? s.meta.passed.ids : [];
  const list = todayTasks(s, today);
  const now = partNow();
  const ranked = [...list].sort((a, b) => Number(b.part === now) - Number(a.part === now));
  const pool = ranked.length ? ranked : s.tasks.filter((t) => t.bucket === "week").sort(byPriority);
  return pool.find((t) => !passed.includes(t.id)) ?? pool[0];
}

export const doneOn = (s: State, day: string) => s.tasks.filter((t) => t.bucket === "done" && isoDay(t.doneAt) === day);
export const doneToday = (s: State, today = ymd()) => doneOn(s, today).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
export const doneEarlier = (s: State, today = ymd()) =>
  s.tasks.filter((t) => t.bucket === "done" && isoDay(t.doneAt) !== today).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
export const isDuplicate = (s: State, title: string) => s.tasks.some((t) => t.bucket !== "done" && t.title.toLowerCase() === title.trim().toLowerCase());

/** Ideas whose time has come back round. */
export const dueIdeas = (s: State, today = ymd()) => s.entries.filter((e) => e.kind === "idea" && e.status === "open" && !!e.resurfaceAt && e.resurfaceAt <= today);

export function weekStart(today = ymd(), weeklyDay = 0) {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const back = (dt.getDay() - weeklyDay + 7) % 7;
  return addDays(today, -back);
}

/** Which check-in is waiting right now, if any. */
export function checkinDue(s: State, now = new Date()): "morning" | "evening" | "weekly" | null {
  const today = ymd(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const ws = weekStart(today, s.settings.weeklyDay);
  if (now.getDay() === s.settings.weeklyDay && mins >= toMin(s.settings.evening) - 60 && s.meta.weeklyDone !== ws) return "weekly";
  if (mins >= toMin(s.settings.evening) && s.meta.eveningDone !== today) return "evening";
  if (mins >= toMin(s.settings.morning) && mins < 15 * 60 && s.meta.morningDone !== today) return "morning";
  return null;
}

// ---------- repair ----------
export function sanitize(raw: unknown): State {
  const fresh = freshState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fresh;
  const r = raw as Record<string, unknown> & { tasks?: unknown[]; entries?: unknown[]; settings?: Partial<Settings>; meta?: Meta };
  const now = new Date().toISOString();
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const x of Array.isArray(r.tasks) ? r.tasks : []) {
    if (!x || typeof x !== "object") continue;
    const t = x as Record<string, unknown>;
    const title = str(t.title)?.trim();
    if (!title) continue;
    let id = str(t.id) || uid();
    if (seen.has(id)) id = uid();
    seen.add(id);
    let steps: Step[] = Array.isArray(t.steps)
      ? (t.steps as unknown[])
          .map((s) => (s && typeof s === "object" ? { id: str((s as Step).id) || uid(), t: String((s as Step).t ?? "").slice(0, MAX_STEP), d: !!(s as Step).d } : null))
          .filter((s): s is Step => !!s && !!s.t.trim())
      : [];
    // Older saves kept one step as a string.
    if (!steps.length && str(t.step)?.trim()) steps = [step(str(t.step)!)];
    const bucket = BUCKETS.includes(t.bucket as Bucket) ? (t.bucket as Bucket) : "later";
    const look = guessLook(title);
    tasks.push({
      id,
      title: title.slice(0, MAX_TITLE),
      steps,
      bucket,
      part: PARTS.includes(t.part as Part) ? (t.part as Part) : "anytime",
      hue: HUES.includes(t.hue as Hue) ? (t.hue as Hue) : look.hue,
      emoji: str(t.emoji) ?? look.emoji,
      mins: Number(t.mins) > 0 ? Math.min(600, Math.round(Number(t.mins))) : undefined,
      due: str(t.due) && /^\d{4}-\d{2}-\d{2}$/.test(str(t.due)!) ? str(t.due) : undefined,
      remindAt: str(t.remindAt) && !Number.isNaN(Date.parse(str(t.remindAt)!)) ? str(t.remindAt) : undefined,
      createdAt: str(t.createdAt) ?? now,
      updatedAt: str(t.updatedAt) ?? now,
      doneAt: str(t.doneAt) ?? (bucket === "done" ? now : undefined),
      prevBucket: ["today", "week", "later"].includes(t.prevBucket as string) ? (t.prevBucket as Task["prevBucket"]) : undefined,
      ext: str(t.ext),
    });
  }
  const entries: Entry[] = (Array.isArray(r.entries) ? r.entries : [])
    .filter((e): e is Entry => !!e && typeof e === "object" && typeof (e as Entry).text === "string" && !!(e as Entry).text.trim())
    .map((e) => ({
      id: str(e.id) || uid(),
      text: e.text.slice(0, 2000),
      kind: e.kind === "note" ? "note" : "idea",
      resurfaceAt: str(e.resurfaceAt),
      seen: Number(e.seen) || 0,
      status: e.status === "archived" || e.status === "task" ? e.status : "open",
      createdAt: str(e.createdAt) ?? now,
    }));
  const st = r.settings && typeof r.settings === "object" ? r.settings : {};
  const hhmm = (v: unknown, d: string) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : d);
  const settings: Settings = {
    morning: hhmm(st.morning, DEFAULT_SETTINGS.morning),
    evening: hhmm(st.evening, DEFAULT_SETTINGS.evening),
    weeklyDay: Number.isInteger(st.weeklyDay) && st.weeklyDay! >= -1 && st.weeklyDay! <= 6 ? st.weeklyDay! : 0,
    ai: ["chatgpt", "claude", "gemini", "grok"].includes(st.ai as string) ? (st.ai as Settings["ai"]) : "chatgpt",
    notify: !!st.notify,
    sound: st.sound !== false,
    haptics: st.haptics !== false,
    calendarAdded: str(st.calendarAdded),
    theme: st.theme === "dark" || st.theme === "light" ? st.theme : "system",
    sync: (() => {
      const y = (st.sync && typeof st.sync === "object" ? st.sync : {}) as Settings["sync"];
      return {
        google: !!y.google,
        outlook: !!y.outlook,
        notion: typeof y.notion === "string" && y.notion ? y.notion : undefined,
        calendly: typeof y.calendly === "string" && y.calendly ? y.calendly : undefined,
        ics: typeof y.ics === "string" && /^(https|webcals?):\/\//i.test(y.ics) ? y.ics : undefined,
        last: typeof y.last === "string" ? y.last : undefined,
        skipped: Array.isArray(y.skipped) ? y.skipped.filter((x) => typeof x === "string").slice(-500) : [],
      };
    })(),
  };
  const m = r.meta && typeof r.meta === "object" && !Array.isArray(r.meta) ? r.meta : {};
  const meta: Meta = {
    easy: m.easy && typeof m.easy.date === "string" ? m.easy : undefined,
    passed: m.passed && typeof m.passed.date === "string" && Array.isArray(m.passed.ids) ? m.passed : undefined,
    pinned: m.pinned && typeof m.pinned.date === "string" ? m.pinned : undefined,
    timer: m.timer && Number.isFinite(m.timer.end) && Number(m.timer.mins) > 0 ? m.timer : undefined,
    morningDone: str(m.morningDone),
    eveningDone: str(m.eveningDone),
    weeklyDone: str(m.weeklyDone),
    energy: m.energy && typeof m.energy.date === "string" ? m.energy : undefined,
    intro: !!m.intro,
  };
  return { v: 12, tasks, entries, settings, meta };
}
