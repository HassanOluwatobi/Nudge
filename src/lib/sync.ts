"use client";

/*
  Bring events in from the calendars people already use.

  Google and Outlook: read-only sign-in in the browser. Google's access token is
  kept on this phone until it expires (about an hour), so the app checks quietly
  each time it opens. For a connection that never needs a tap, Google's private
  calendar address can be pasted once and is read through the stateless relay.
  Apple and any other calendar: import an .ics file. Nothing leaves the device.
  Notion and Calendly: they block browsers from calling them directly, so a
  small NudgeMe relay forwards the request with the person's own token and
  stores nothing.
*/

export type Source = "google" | "outlook" | "ics" | "notion" | "calendly";
export type ExtEvent = { src: Source; id: string; title: string; start: Date; end?: Date; allDay: boolean; rec?: boolean };

export const SOURCE_NAME: Record<Source, string> = { google: "Google Calendar", outlook: "Outlook", ics: "Apple Calendar", notion: "Notion", calendly: "Calendly" };

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const MS_CLIENT_ID = process.env.NEXT_PUBLIC_MS_CLIENT_ID ?? "";

const DAYS_AHEAD = 14;
const range = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + DAYS_AHEAD * 864e5);
  return { from, to };
};

// ---------- Google ----------
type GTokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
type GIS = { accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void; error_callback?: (e: unknown) => void }) => GTokenClient } } };

let gisLoading: Promise<GIS> | null = null;
function loadGis(): Promise<GIS> {
  const w = window as unknown as { google?: GIS };
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  if (!gisLoading)
    gisLoading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => (w.google ? res(w.google) : rej(new Error("Google sign-in did not load")));
      s.onerror = () => rej(new Error("Google sign-in did not load"));
      document.head.appendChild(s);
    });
  return gisLoading;
}

const G_KEY = "nudgeme.gtoken";
let googleToken: { value: string; exp: number } | null = null;
function readToken() {
  if (googleToken) return googleToken;
  try {
    const t = JSON.parse(localStorage.getItem(G_KEY) ?? "null") as { value?: string; exp?: number } | null;
    if (t?.value && typeof t.exp === "number") googleToken = { value: t.value, exp: t.exp };
  } catch {
    // Storage can be off in private browsing. A tap still works.
  }
  return googleToken;
}
function saveToken(t: { value: string; exp: number } | null) {
  googleToken = t;
  try {
    if (t) localStorage.setItem(G_KEY, JSON.stringify(t));
    else localStorage.removeItem(G_KEY);
  } catch {
    /* fine */
  }
}
/** True while the last Google sign-in is still good, so no tap is needed. */
export const googleReady = () => {
  const t = readToken();
  return !!t && t.exp > Date.now();
};
export const googleSignOut = () => saveToken(null);
/** When Google Calendar was last checked, in ms. 0 if never. */
export const googleLast = () => {
  try {
    return Number(localStorage.getItem("nudgeme.glast")) || 0;
  } catch {
    return 0;
  }
};

/** With interactive on, this must run from a tap: Google may open a small window. */
export async function googleEvents(interactive = true): Promise<ExtEvent[]> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google is not set up yet.");
  if (!googleReady()) {
    if (!interactive) throw new Error("Tap to check Google Calendar.");
    const gis = await loadGis();
    const token = await new Promise<{ value: string; exp: number }>((res, rej) => {
      const c = gis.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/calendar.events.readonly",
        callback: (r) => (r.access_token ? res({ value: r.access_token, exp: Date.now() + Math.max(60, (r.expires_in ?? 3600) - 300) * 1000 }) : rej(new Error(r.error ?? "Google sign-in was cancelled."))),
        error_callback: () => rej(new Error("Google sign-in was closed.")),
      });
      c.requestAccessToken({ prompt: "" });
    });
    saveToken(token);
  }
  const googleToken = readToken()!;
  const { from, to } = range();
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "100" });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`, { headers: { Authorization: `Bearer ${googleToken.value}` } });
  if (r.status === 401) {
    saveToken(null);
    throw new Error("Google sign-in expired. Try again.");
  }
  if (!r.ok) throw new Error("Google Calendar did not answer.");
  try {
    localStorage.setItem("nudgeme.glast", String(Date.now()));
  } catch {
    /* fine */
  }
  const j = (await r.json()) as { items?: { id: string; summary?: string; status?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }[] };
  return (j.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.summary)
    .map((e) => ({
      src: "google" as const,
      id: e.id,
      title: e.summary!,
      start: new Date(e.start?.dateTime ?? `${e.start?.date}T09:00`),
      end: e.end?.dateTime ? new Date(e.end.dateTime) : undefined,
      allDay: !e.start?.dateTime,
    }));
}

// ---------- Outlook (Microsoft) ----------
type Msal = import("@azure/msal-browser").PublicClientApplication;
let msal: Msal | null = null;
async function getMsal() {
  if (msal) return msal;
  const { PublicClientApplication } = await import("@azure/msal-browser");
  msal = new PublicClientApplication({
    auth: { clientId: MS_CLIENT_ID, authority: "https://login.microsoftonline.com/common", redirectUri: `${location.origin}/auth.html` },
    cache: { cacheLocation: "localStorage" },
  });
  await msal.initialize();
  return msal;
}
const MS_SCOPES = ["Calendars.Read"];

async function msToken(interactive: boolean) {
  const app = await getMsal();
  const account = app.getAllAccounts()[0];
  if (account) {
    try {
      return (await app.acquireTokenSilent({ scopes: MS_SCOPES, account })).accessToken;
    } catch {
      if (!interactive) throw new Error("Sign in to Outlook again.");
    }
  }
  if (!interactive) throw new Error("Not connected to Outlook.");
  const r = await app.loginPopup({ scopes: MS_SCOPES, prompt: "select_account" });
  return (await app.acquireTokenSilent({ scopes: MS_SCOPES, account: r.account })).accessToken;
}

export async function outlookEvents(interactive = true): Promise<ExtEvent[]> {
  if (!MS_CLIENT_ID) throw new Error("Outlook is not set up yet.");
  const token = await msToken(interactive);
  const { from, to } = range();
  const q = new URLSearchParams({ startDateTime: from.toISOString(), endDateTime: to.toISOString(), $top: "100", $orderby: "start/dateTime", $select: "id,subject,start,end,isAllDay,isCancelled" });
  const r = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${q}`, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
  if (!r.ok) throw new Error("Outlook did not answer.");
  const j = (await r.json()) as { value?: { id: string; subject?: string; isAllDay?: boolean; isCancelled?: boolean; start: { dateTime: string }; end: { dateTime: string } }[] };
  return (j.value ?? [])
    .filter((e) => !e.isCancelled && e.subject)
    .map((e) => ({ src: "outlook" as const, id: e.id, title: e.subject!, start: new Date(`${e.start.dateTime}Z`), end: new Date(`${e.end.dateTime}Z`), allDay: !!e.isAllDay }));
}

export async function outlookSignOut() {
  if (!MS_CLIENT_ID) return;
  const app = await getMsal();
  for (const a of app.getAllAccounts()) await app.clearCache({ account: a });
}

// ---------- .ics file (Apple Calendar and anything else) ----------
function icsDate(v: string): { d: Date; allDay: boolean } | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return { d: new Date(+y, +mo - 1, +d, 9, 0), allDay: true };
  const dt = z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0))) : new Date(+y, +mo - 1, +d, +h, +mi, +(s ?? 0));
  return { d: dt, allDay: false };
}

/** A shared calendar link, read through the stateless relay. */
export async function linkEvents(url: string): Promise<ExtEvent[]> {
  const r = await fetch("/api/ics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "That calendar did not answer.");
  return parseIcs(await r.text());
}

/** Is this Google's private calendar address? */
export const isGoogleLink = (url: string) => /(^|\.)google\.com\//i.test(url.replace(/^\w+:\/\//, "").replace(/\/.*/, "") + "/");

/**
 * Google's private address. Events get the same ids the Google sign-in uses,
 * so connecting both ways never makes doubles.
 */
export async function googleLinkEvents(url: string): Promise<ExtEvent[]> {
  const list = await linkEvents(url);
  const stamp = (d: Date, allDay: boolean) => (allDay ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}` : d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""));
  return list.map((e) => {
    const base = e.id.replace(/@google\.com$/i, "");
    return { ...e, src: "google" as const, id: e.rec ? `${base}_${stamp(e.start, e.allDay)}` : base };
  });
}

export function parseIcs(text: string): ExtEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: ExtEvent[] = [];
  const { from, to } = range();
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (k: string) => body.match(new RegExp(`^${k}(?:;[^:\\n]*)?:(.*)$`, "m"))?.[1]?.trim();
    const title = get("SUMMARY")?.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ");
    const start = get("DTSTART");
    if (!title || !start) continue;
    const s = icsDate(start);
    if (!s) continue;
    const e = get("DTEND") ? icsDate(get("DTEND")!) : null;
    const rrule = get("RRULE");
    let when = s.d;
    // Simple repeats: move a daily or weekly event forward to its next date.
    if (rrule && when < from) {
      const step = /FREQ=DAILY/.test(rrule) ? 1 : /FREQ=WEEKLY/.test(rrule) ? 7 : 0;
      if (step) while (when < from) when = new Date(when.getTime() + step * 864e5);
    }
    if (when < from || when > to) continue;
    out.push({ src: "ics", rec: !!rrule, id: get("UID") ?? `${title}-${when.getTime()}`, title, start: when, end: e ? new Date(when.getTime() + (e.d.getTime() - s.d.getTime())) : undefined, allDay: s.allDay });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 100);
}

// ---------- Notion and Calendly, through the stateless relay ----------
async function relay(path: "notion" | "calendly", token: string, extra: Record<string, string> = {}) {
  const { from, to } = range();
  const r = await fetch(`/api/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, from: from.toISOString(), to: to.toISOString(), ...extra }) });
  const j = (await r.json().catch(() => ({}))) as { events?: { id: string; title: string; start: string; end?: string; allDay?: boolean }[]; error?: string };
  if (!r.ok) throw new Error(j.error ?? `${path === "notion" ? "Notion" : "Calendly"} did not answer.`);
  return (j.events ?? []).map((e) => ({ src: path, id: e.id, title: e.title, start: new Date(e.start), end: e.end ? new Date(e.end) : undefined, allDay: !!e.allDay }) as ExtEvent);
}
export const notionEvents = (token: string) => relay("notion", token);
export const calendlyEvents = (token: string) => relay("calendly", token);

export const extKey = (e: Pick<ExtEvent, "src" | "id">) => `${e.src}:${e.id}`;
