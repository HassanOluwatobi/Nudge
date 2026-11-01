import type { CalEvent } from "./calendar";

// Daily nudges without a server or an account.
// The phone's own calendar rings at the chosen times, so reminders work even
// when NudgeMe is closed. Free, private, and reliable on every phone.

export type ReminderTimes = { morning: string; evening: string }; // "HH:MM"
export const DEFAULT_TIMES: ReminderTimes = { morning: "08:30", evening: "20:00" };
export const APP_URL = "https://nudgeme-thread.vercel.app";

export const MORNING = {
  title: "NudgeMe: pick your one thing",
  body: "Open NudgeMe and choose one small thing for today.",
  url: `${APP_URL}/?from=morning`,
};
export const EVENING = {
  title: "NudgeMe: tick off your day",
  body: "Open NudgeMe, tick what you did, and let tomorrow wait.",
  url: `${APP_URL}/?from=evening`,
};

export type Platform = "ios" | "android" | "other";
export function platform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

function at(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export const prettyTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return m ? `${hh}:${pad(m)} ${ap}` : `${hh} ${ap}`;
};

const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");

function vevent(kind: "morning" | "evening", hhmm: string) {
  const e = kind === "morning" ? MORNING : EVENING;
  const start = at(hhmm);
  const end = new Date(start.getTime() + 5 * 60000);
  return [
    "BEGIN:VEVENT",
    `UID:nudgeme-${kind}@nudgeme`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(`${e.body} ${e.url}`)}`,
    `URL:${e.url}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

/** One calendar file with both daily nudges. iPhone shows "Add All". */
export function icsFile(t: ReminderTimes) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NudgeMe//Daily nudges//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vevent("morning", t.morning),
    vevent("evening", t.evening),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(t: ReminderTimes) {
  const blob = new Blob([icsFile(t)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nudgeme-daily.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Google Calendar takes one event per link, so Android gets two quick taps. */
export function googleLink(kind: "morning" | "evening", hhmm: string) {
  const e = kind === "morning" ? MORNING : EVENING;
  const start = at(hhmm);
  const end = new Date(start.getTime() + 5 * 60000);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `${e.body}\n${e.url}`,
    recur: "RRULE:FREQ=DAILY",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// ---------- extra nudges while NudgeMe is open or installed ----------

export const canNotify = () => typeof window !== "undefined" && "Notification" in window;

export async function askNotify(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export async function notify(title: string, body: string, url = "/") {
  if (!canNotify() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/badge-96.png", tag: "nudgeme", data: { url } });
    else new Notification(title, { body, icon: "/icon-192.png" });
  } catch {}
}

/** The little number on the installed app icon. One thing waiting = 1. */
export function setBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (n > 0) nav.setAppBadge?.(n)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {}
}

// ---------- one-off reminder for a single task ----------

export function remindOnce(title: string, when: Date) {
  const end = new Date(when.getTime() + 10 * 60000);
  const name = `NudgeMe: ${title}`;
  const body = `Time for your step. Open NudgeMe: ${APP_URL}`;
  if (platform() === "android") {
    const q = new URLSearchParams({ action: "TEMPLATE", text: name, dates: `${stamp(when)}/${stamp(end)}`, details: body });
    window.open(`https://calendar.google.com/calendar/render?${q.toString()}`, "_blank", "noopener");
    return;
  }
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NudgeMe//Reminder//EN",
    "BEGIN:VEVENT",
    `UID:nudgeme-${Date.now()}@nudgeme`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(when)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(name)}`,
    `DESCRIPTION:${esc(body)}`,
    `URL:${APP_URL}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(name)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nudgeme-reminder.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function remindChoices(now = new Date()): { label: string; when: Date }[] {
  const inHour = new Date(now.getTime() + 60 * 60000);
  inHour.setSeconds(0, 0);
  const evening = new Date(now);
  evening.setHours(19, 0, 0, 0);
  const morning = new Date(now);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(9, 0, 0, 0);
  const out = [{ label: "In 1 hour", when: inHour }];
  if (evening.getTime() - now.getTime() > 90 * 60000) out.push({ label: "This evening, 7 pm", when: evening });
  out.push({ label: "Tomorrow, 9 am", when: morning });
  return out;
}

// ---------- events for the calendar buttons ----------

export function dailyEvents(t: ReminderTimes): CalEvent[] {
  return (["morning", "evening"] as const).map((k) => {
    const e = k === "morning" ? MORNING : EVENING;
    return { title: e.title, body: e.body, url: e.url, start: at(t[k]), mins: 5, daily: true, uid: `nudgeme-${k}` };
  });
}

export function taskEvent(title: string, when: Date): CalEvent {
  return { title: `NudgeMe: ${title}`, body: "Time for a small step. Open NudgeMe.", url: APP_URL, start: when, mins: 10, uid: `nudgeme-task-${when.getTime()}` };
}
