// Add events to the person's own calendar. No server, no account.
// Google: a prefilled event page. Apple: an .ics file the Calendar app opens.
// Outlook: a prefilled event page for one-off events, an .ics file for repeating ones.

export type CalEvent = { title: string; body: string; url: string; start: Date; mins: number; daily?: boolean; uid: string };

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function googleUrl(e: CalEvent) {
  const end = new Date(e.start.getTime() + e.mins * 60000);
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(e.start)}/${stamp(end)}`, details: `${e.body}\n${e.url}` });
  if (e.daily) q.set("recur", "RRULE:FREQ=DAILY");
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function outlookUrl(e: CalEvent) {
  const end = new Date(e.start.getTime() + e.mins * 60000);
  const q = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: e.title, body: `${e.body}\n${e.url}`, startdt: e.start.toISOString(), enddt: end.toISOString() });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}

export function ics(events: CalEvent[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NudgeMe//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.mins * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@nudgeme`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(end)}`,
      ...(e.daily ? ["RRULE:FREQ=DAILY"] : []),
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(`${e.body} ${e.url}`)}`,
      `URL:${e.url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.title)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(events: CalEvent[], name: string) {
  const blob = new Blob([ics(events)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function open(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
