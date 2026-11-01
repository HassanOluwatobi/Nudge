"use client";

/*
  Reminders that ring with Shrink my day closed, through standard Web Push.

  The phone seals every message itself (RFC 8291, aes128gcm) with its own push
  keys, then hands the sealed copy and a send time to the Shrink my day reminder
  sender. The sender cannot read them. It only knows when to pass each one on.

  On iPhone this works once Shrink my day is added to the Home Screen (iOS 16.4+).
*/

export const PUSH_URL = (process.env.NEXT_PUBLIC_PUSH_URL ?? "").replace(/\/+$/, "");
const FLAG = "nudgeme.push";

export type PushItem = { at: number; title: string; body: string; url?: string; tag?: string };

const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const a = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64 = (a: Uint8Array) => {
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
};
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) (out.set(p, o), (o += p.length));
  return out;
};
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}

/** Seal one message for one phone, exactly as a push service expects it. */
export async function seal(sub: { p256dh: string; auth: string }, plaintext: string): Promise<string> {
  const uaPublic = fromB64u(sub.p256dh);
  const authSecret = fromB64u(sub.auth);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const peer = await crypto.subtle.importKey("raw", uaPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, local.privateKey, 256));

  const prkKey = await hmac(authSecret, shared);
  const ikm = await hmac(prkKey, cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const key = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const padded = cat(enc.encode(plaintext), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, padded as BufferSource));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return b64(cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher));
}

export const pushSupported = () => typeof window !== "undefined" && !!PUSH_URL && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const pushOn = () => {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

/** Turn on: must run from a tap. Asks permission and subscribes this phone. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const r = await fetch(`${PUSH_URL}/key`);
    const { key } = (await r.json()) as { key: string };
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(key) as BufferSource });
  }
  localStorage.setItem(FLAG, "1");
  return true;
}

export async function disablePush() {
  try {
    localStorage.removeItem(FLAG);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch(`${PUSH_URL}/off`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {
    /* fine */
  }
}

let lastSent = "";
/** Hand the next couple of weeks of reminders to the sender, sealed. Safe to call often. */
export async function syncPush(items: PushItem[]) {
  if (!pushSupported() || !pushOn() || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const sig = sub.endpoint + JSON.stringify(items);
  if (sig === lastSent) return;
  const j = sub.toJSON() as { keys?: { p256dh: string; auth: string } };
  if (!j.keys) return;
  const sealed = await Promise.all(items.map(async (i) => ({ at: i.at, body: await seal(j.keys!, JSON.stringify({ title: i.title, body: i.body, url: i.url ?? "/app", tag: i.tag })) })));
  const r = await fetch(`${PUSH_URL}/sync`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, items: sealed }) }).catch(() => null);
  if (r?.ok) lastSent = sig;
}

export { b64u };
