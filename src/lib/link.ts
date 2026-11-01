/*
  Device linking. Keeps your phone and laptop in step with no account.

  How it works:
  - A linked group shares one secret. It lives only on the linked devices.
  - From that secret each device works out three things: an id for the
    group's box on the server, a write token, and the key that locks the data.
  - Everything is locked here before it leaves, so the server only holds
    scrambled data and a version number.

  Pairing:
  - The code looks like 7KQ2-M9XA-P4TD. The first four characters find the
    box on the server. The other eight unlock it and never leave the device.
  - The box holds the group's secret and lasts 10 minutes. It opens once.

  Merging: every task and idea remembers when it last changed on this device,
  and deletes are remembered too. When two devices meet, the newest change to
  each one wins, so editing on both while offline doesn't lose anything.
*/

import type { Entry, Settings, State, Task } from "./tasks";
import { sanitize } from "./tasks";

const URL_BASE = (process.env.NEXT_PUBLIC_PUSH_URL ?? "").replace(/\/+$/, "");
const LINK_KEY = "nudgeme.link";
const STAMP_KEY = "nudgeme.stamps";
const TOMB_DAYS = 90;

export type Stamps = { items: Record<string, number>; tombs: Record<string, number>; settings: number; meta: number };
type Link = { s: string; rev: number; at?: number; since: number };
type Payload = { v: 1; state: State; stamps: Stamps };

// ---------- bytes ----------
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

// Big chunks need a loop, or String.fromCharCode runs out of room.
function b64uLarge(b: Uint8Array) {
  let out = "";
  for (let i = 0; i < b.length; i += 0x8000) out += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------- codes ----------
// No I, L, O or U, so nothing is easy to misread.
const ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newCode() {
  const r = rand(12);
  return Array.from(r, (x) => ABC[x & 31]).join("");
}
export function cleanCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V")
    .replace(/[^0-9A-Z]/g, "")
    .split("")
    .filter((c) => ABC.includes(c))
    .join("")
    .slice(0, 12);
}
export const showCode = (c: string) => c.replace(/(.{4})(?=.)/g, "$1-");

async function codeKey(code: string) {
  const base = await crypto.subtle.importKey("raw", enc.encode(code.slice(4)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode(`shrinkmyday-pair-${code.slice(0, 4)}`), iterations: 310_000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// ---------- the group's keys ----------
type Keys = { id: string; token: string; key: CryptoKey };
const keyCache = new Map<string, Keys>();

async function groupKeys(s: string): Promise<Keys> {
  const hit = keyCache.get(s);
  if (hit) return hit;
  const base = await crypto.subtle.importKey("raw", fromB64u(s), "HKDF", false, ["deriveBits", "deriveKey"]);
  const bits = (info: string, n: number) => crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode(info) }, base, n * 8);
  const id = b64u(await bits("shrinkmyday-id", 16)); // 22 characters
  const token = b64u(await bits("shrinkmyday-token", 32));
  const key = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode("shrinkmyday-key") }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const k = { id, token, key };
  keyCache.set(s, k);
  return k;
}

async function lock(key: CryptoKey, text: string) {
  const iv = rand(12);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const out = new Uint8Array(12 + data.byteLength);
  out.set(iv);
  out.set(new Uint8Array(data), 12);
  return b64uLarge(out);
}
async function unlock(key: CryptoKey, blob: string) {
  const b = fromB64u(blob);
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.subarray(0, 12) }, key, b.subarray(12));
  return dec.decode(data);
}

// ---------- local records ----------
export function readLink(): Link | null {
  try {
    const l = JSON.parse(localStorage.getItem(LINK_KEY) ?? "null") as Link | null;
    return l && typeof l.s === "string" ? l : null;
  } catch {
    return null;
  }
}
function writeLink(l: Link | null) {
  try {
    if (l) localStorage.setItem(LINK_KEY, JSON.stringify(l));
    else localStorage.removeItem(LINK_KEY);
  } catch {}
  window.dispatchEvent(new Event("nudge:link"));
}
export const linkReady = () => !!URL_BASE;

export function readStamps(): Stamps {
  try {
    const s = JSON.parse(localStorage.getItem(STAMP_KEY) ?? "null") as Stamps | null;
    if (s && s.items && s.tombs) return { items: s.items, tombs: s.tombs, settings: Number(s.settings) || 0, meta: Number(s.meta) || 0 };
  } catch {}
  return { items: {}, tombs: {}, settings: 0, meta: 0 };
}
function writeStamps(s: Stamps, keepNewer = false) {
  if (keepNewer) {
    // A change made on this device while a sync was running must not lose its time.
    const cur = readStamps();
    const items = { ...s.items };
    const tb = { ...s.tombs };
    for (const [k, v] of Object.entries(cur.items))
      if (v > (items[k] ?? 0) && v > (tb[k] ?? 0)) {
        items[k] = v;
        delete tb[k];
      }
    for (const [k, v] of Object.entries(cur.tombs))
      if (v > (tb[k] ?? 0) && v > (items[k] ?? 0)) {
        tb[k] = v;
        delete items[k];
      }
    s = { items, tombs: tb, settings: Math.max(s.settings, cur.settings), meta: Math.max(s.meta, cur.meta) };
  }
  const cut = Date.now() - TOMB_DAYS * 864e5;
  const tombs: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.tombs)) if (v > cut) tombs[k] = v;
  try {
    localStorage.setItem(STAMP_KEY, JSON.stringify({ ...s, tombs }));
  } catch {}
}

// Settings that belong to one device and never travel.
const OWN = (s: Settings) => ({ notify: s.notify, google: s.sync.google, outlook: s.sync.outlook, last: s.sync.last });
const shared = (s: Settings) => JSON.stringify({ ...s, notify: 0, sync: { ...s.sync, google: 0, outlook: 0, last: 0 } });
const sharedMeta = (m: State["meta"]) => JSON.stringify({ ...m, intro: 0 });

/** Called on every local change. Notes what changed and when, so merges know who is newer. */
export function noteChange(prev: State, next: State) {
  const st = readStamps();
  const now = Date.now();
  let changed = false;
  const before = new Map<string, string>();
  for (const t of prev.tasks) before.set(`t:${t.id}`, JSON.stringify(t));
  for (const e of prev.entries) before.set(`e:${e.id}`, JSON.stringify(e));
  const after = new Set<string>();
  const mark = (k: string, v: unknown) => {
    after.add(k);
    if (before.get(k) !== JSON.stringify(v)) {
      st.items[k] = now;
      delete st.tombs[k];
      changed = true;
    }
  };
  for (const t of next.tasks) mark(`t:${t.id}`, t);
  for (const e of next.entries) mark(`e:${e.id}`, e);
  for (const k of before.keys())
    if (!after.has(k)) {
      st.tombs[k] = now;
      delete st.items[k];
      changed = true;
    }
  if (shared(prev.settings) !== shared(next.settings)) {
    st.settings = now;
    changed = true;
  }
  if (sharedMeta(prev.meta) !== sharedMeta(next.meta)) {
    st.meta = now;
    changed = true;
  }
  if (changed) writeStamps(st);
  return changed;
}

// ---------- merging ----------
const born = (x: Task | Entry) => Date.parse((x as Task).updatedAt ?? x.createdAt) || Date.parse(x.createdAt) || 1;

/**
 * Put two copies together. The remote copy's order comes first, so two
 * devices settle on the same list instead of swapping orders back and forth.
 */
export function merge(local: State, ls: Stamps, remote: State, rs: Stamps): { state: State; stamps: Stamps } {
  const stamps: Stamps = { items: {}, tombs: {}, settings: Math.max(ls.settings, rs.settings), meta: Math.max(ls.meta, rs.meta) };
  for (const src of [ls.tombs, rs.tombs]) for (const [k, v] of Object.entries(src)) stamps.tombs[k] = Math.max(stamps.tombs[k] ?? 0, v);

  function pick<T extends Task | Entry>(prefix: string, mine: T[], theirs: T[]): T[] {
    const lm = new Map(mine.map((x) => [x.id, x]));
    const rm = new Map(theirs.map((x) => [x.id, x]));
    const order = [...theirs.map((x) => x.id), ...mine.map((x) => x.id).filter((id) => !rm.has(id))];
    const out: T[] = [];
    for (const id of order) {
      const k = `${prefix}:${id}`;
      const l = lm.get(id);
      const r = rm.get(id);
      const lt = l ? (ls.items[k] ?? born(l)) : -1;
      const rt = r ? (rs.items[k] ?? born(r)) : -1;
      const gone = stamps.tombs[k] ?? -1;
      const best = Math.max(lt, rt);
      if (gone >= best) continue;
      delete stamps.tombs[k];
      // Ties go to the remote copy, so both devices agree.
      const win = rt >= lt ? r! : l!;
      stamps.items[k] = best;
      out.push(win);
    }
    return out;
  }

  let tasks = pick("t", local.tasks, remote.tasks);
  // The same calendar event imported on two devices becomes one task.
  const seenExt = new Set<string>();
  tasks = tasks.filter((t) => {
    if (!t.ext) return true;
    if (seenExt.has(t.ext)) {
      delete stamps.items[`t:${t.id}`];
      return false;
    }
    seenExt.add(t.ext);
    return true;
  });
  const entries = pick("e", local.entries, remote.entries);

  const settingsSrc = rs.settings >= ls.settings ? remote.settings : local.settings;
  const own = OWN(local.settings);
  const settings: Settings = {
    ...settingsSrc,
    notify: own.notify,
    sync: {
      ...settingsSrc.sync,
      google: own.google,
      outlook: own.outlook,
      last: own.last,
      skipped: [...new Set([...(local.settings.sync.skipped ?? []), ...(remote.settings.sync.skipped ?? [])])].slice(-500),
    },
  };
  const metaSrc = rs.meta >= ls.meta ? remote.meta : local.meta;
  const meta = { ...metaSrc, intro: local.meta.intro || remote.meta.intro };

  return { state: { v: 12, tasks, entries, settings, meta }, stamps };
}

// ---------- talking to the server ----------
async function api<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${URL_BASE}${path}`, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

/** Make a code for another device. Starts a new group if this device has none. */
export async function startPair(): Promise<{ code: string; exp: number }> {
  if (!URL_BASE) throw new Error("Sync isn't set up yet.");
  const had = readLink();
  const l: Link = had ?? { s: b64u(rand(32)), rev: 0, since: Date.now() };
  for (let i = 0; i < 4; i++) {
    const code = newCode();
    const iv = rand(12);
    const box = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await codeKey(code), enc.encode(l.s));
    const out = new Uint8Array(12 + box.byteLength);
    out.set(iv);
    out.set(new Uint8Array(box), 12);
    const r = await api<{ exp?: number }>("/pair", { id: code.slice(0, 4), box: b64u(out) });
    if (r.status === 200 && r.data.exp) {
      // Only now does this device count as linked.
      if (!had) writeLink(l);
      return { code, exp: r.data.exp };
    }
    if (r.status !== 409) break;
  }
  throw new Error("Couldn't make a code. Check your connection and try again.");
}

/** True while the code is still waiting to be used. */
export async function pairWaiting(code: string) {
  const r = await api<{ waiting?: boolean }>(`/pair/status?id=${code.slice(0, 4)}`);
  return r.status === 200 ? !!r.data.waiting : true;
}

/** Use a code from another device. Joins its group. */
export async function claimPair(raw: string) {
  const code = cleanCode(raw);
  if (code.length !== 12) throw new Error("The code has 12 letters and numbers.");
  if (!URL_BASE) throw new Error("Sync isn't set up yet.");
  const r = await api<{ box?: string }>("/pair/claim", { id: code.slice(0, 4) });
  if (r.status === 404) throw new Error("That code has run out or was already used. Make a new one on your other device.");
  if (r.status !== 200 || !r.data.box) throw new Error("Couldn't reach the server. Check your connection and try again.");
  let s: string;
  try {
    const b = fromB64u(r.data.box);
    s = dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.subarray(0, 12) }, await codeKey(code), b.subarray(12)));
  } catch {
    throw new Error("That code doesn't match. Check it and make a new one on your other device.");
  }
  writeLink({ s, rev: 0, since: Date.now() });
}

/** Stop syncing on this device. Your tasks stay here. */
export function unlink() {
  writeLink(null);
}

/** Stop syncing everywhere and delete the sealed copy from the server. */
export async function forgetEverywhere() {
  const l = readLink();
  if (l) {
    const k = await groupKeys(l.s);
    await api("/vault/forget", { id: k.id, token: k.token }).catch(() => {});
  }
  writeLink(null);
}

type SyncResult = { state: State | null; ok: boolean; error?: string; stopped?: boolean };
let running: Promise<SyncResult> | null = null;
let again = false;

/**
 * Pull, merge, push. Returns a new state when the other devices changed something.
 * Safe to call often: calls that land while one is running are folded into one more pass.
 */
export function syncNow(getLocal: () => State): Promise<SyncResult> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    const result: SyncResult = { state: null, ok: true };
    try {
      do {
        again = false;
        const r = await pass(getLocal);
        if (r.state) result.state = r.state;
        result.ok = r.ok;
        result.error = r.error;
        if (r.stopped) result.stopped = true;
      } while (again && result.ok);
    } finally {
      running = null;
    }
    return result;
  })();
  return running;
}

async function pass(getLocal: () => State): Promise<SyncResult> {
  const l = readLink();
  if (!l || !URL_BASE) return { state: null, ok: true };
  try {
    const k = await groupKeys(l.s);
    let got = await api<{ rev: number; blob: string | null }>(`/vault?id=${k.id}`);
    if (got.status === 410) {
      writeLink(null);
      return { state: null, ok: true, error: undefined, stopped: true };
    }
    if (got.status !== 200) return { state: null, ok: false, error: "Couldn't reach the server." };
    let changedLocal: State | null = null;
    for (let tries = 0; tries < 4; tries++) {
      const local: State = changedLocal ?? getLocal();
      const ls = readStamps();
      let remote: Payload | null = null;
      if (got.data.blob) {
        try {
          const p = JSON.parse(await unlock(k.key, got.data.blob)) as Payload;
          remote = { v: 1, state: sanitize(p.state), stamps: { items: p.stamps?.items ?? {}, tombs: p.stamps?.tombs ?? {}, settings: Number(p.stamps?.settings) || 0, meta: Number(p.stamps?.meta) || 0 } };
        } catch {
          return { state: null, ok: false, error: "The synced copy couldn't be opened. Try linking again." };
        }
      }
      const merged: { state: State; stamps: Stamps } = remote ? merge(local, ls, remote.state, remote.stamps) : { state: local, stamps: ls };
      writeStamps(merged.stamps, true);
      if (JSON.stringify(merged.state) !== JSON.stringify(local)) changedLocal = merged.state;
      const same = remote && JSON.stringify(merged.state) === JSON.stringify(remote.state) && JSON.stringify(merged.stamps) === JSON.stringify(remote.stamps);
      if (same) {
        writeLink({ ...l, rev: got.data.rev, at: Date.now() });
        return { state: changedLocal, ok: true };
      }
      const blob = await lock(k.key, JSON.stringify({ v: 1, state: merged.state, stamps: merged.stamps } satisfies Payload));
      const put = await api<{ rev?: number; blob?: string | null; error?: string }>("/vault", { id: k.id, token: k.token, rev: got.data.rev, blob });
      if (put.status === 200 && typeof put.data.rev === "number") {
        writeLink({ ...l, rev: put.data.rev, at: Date.now() });
        return { state: changedLocal, ok: true };
      }
      if (put.status === 409) {
        // Someone else saved first. Merge with theirs and try again.
        got = { status: 200, data: { rev: put.data.rev ?? 0, blob: put.data.blob ?? null } };
        continue;
      }
      if (put.status === 410) {
        writeLink(null);
        return { state: changedLocal, ok: true, stopped: true };
      }
      if (put.status === 413) return { state: changedLocal, ok: false, error: "Your list is too big to sync. Clear out some finished tasks." };
      if (put.status === 403) return { state: changedLocal, ok: false, error: "This device isn't allowed to sync with that group anymore. Link it again." };
      return { state: changedLocal, ok: false, error: "Couldn't reach the server." };
    }
    return { state: changedLocal, ok: false, error: "Couldn't sync just now. It'll try again soon." };
  } catch {
    return { state: null, ok: false, error: "Couldn't reach the server." };
  }
}
