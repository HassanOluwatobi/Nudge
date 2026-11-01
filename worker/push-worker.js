/*
  Shrink my day reminder sender and sync box. Runs free on Cloudflare Workers.

  What it does:
  - Every minute it sends any reminder that is due, as a Web Push notification.
  - It never sees what a reminder says. The phone encrypts each message itself
    before it is stored here, so this worker only holds sealed envelopes,
    a time to send each one, and the push address of the phone.
  - It makes its own sending key the first time it runs. There are no secrets
    to copy anywhere.

  Device linking (sync between phone and laptop):
  - One device leaves a sealed box here for 10 minutes. The other device opens
    it with the code you typed. The part of the code that unlocks the box is
    never sent here.
  - After that, each linked group keeps one sealed copy of its tasks here.
    It is locked on the device with a key this worker never sees, so all it
    holds is scrambled data and a version number.

  Setup (once, in the Cloudflare dashboard):
  1. Create a Worker, paste this file in, and deploy.
  2. Create a D1 database and bind it to the Worker as DB.
  3. Add a Cron Trigger that runs every minute: * * * * *
*/

const PUSH_HOSTS = [/(^|\.)push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /^android\.googleapis\.com$/];
const MAX_ITEMS = 300;
const MAX_BODY = 6000; // base64 characters per sealed message
const CONTACT = "https://shrinkmyday.com";
const MAX_VAULT = 1_800_000; // characters of sealed data per linked group
const PAIR_MINS = 10;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...cors } });

// ---------- small helpers ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const sha = async (s) => b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const okEndpoint = (e) => {
  try {
    const u = new URL(e);
    return u.protocol === "https:" && PUSH_HOSTS.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
};

async function setup(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS subs (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, updated INTEGER)"),
    db.prepare("CREATE TABLE IF NOT EXISTS items (sub TEXT NOT NULL, at INTEGER NOT NULL, body TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS items_at ON items (at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS items_sub ON items (sub)"),
    db.prepare("CREATE TABLE IF NOT EXISTS pairs (id TEXT PRIMARY KEY, box TEXT NOT NULL, exp INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS vaults (id TEXT PRIMARY KEY, token TEXT NOT NULL, rev INTEGER NOT NULL, blob TEXT NOT NULL, at INTEGER NOT NULL)"),
  ]);
}

// The worker's own sending key (VAPID). Made once, kept in the database.
async function keys(db) {
  const row = await db.prepare("SELECT v FROM meta WHERE k = 'vapid'").first();
  if (row) {
    const { jwk, pub } = JSON.parse(row.v);
    const priv = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    return { priv, pub };
  }
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = b64u(await crypto.subtle.exportKey("raw", pair.publicKey));
  await db.prepare("INSERT OR IGNORE INTO meta (k, v) VALUES ('vapid', ?)").bind(JSON.stringify({ jwk, pub })).run();
  // If two requests raced, use whichever key won.
  return keys(db);
}

async function vapidHeader(k, endpoint, cache) {
  const aud = new URL(endpoint).origin;
  if (cache.has(aud)) return cache.get(aud);
  const head = b64u(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(new TextEncoder().encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k.priv, new TextEncoder().encode(`${head}.${claims}`));
  const value = `vapid t=${head}.${claims}.${b64u(sig)}, k=${k.pub}`;
  cache.set(aud, value);
  return value;
}

// ---------- requests from the app ----------
async function handle(req, env) {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  if (!env.DB) return json({ error: "The database is not connected yet." }, 500);
  await setup(env.DB);

  if (req.method === "GET" && url.pathname === "/key") {
    const k = await keys(env.DB);
    return json({ key: k.pub });
  }

  if (req.method === "POST" && url.pathname === "/sync") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "Bad request." }, 400);
    }
    const endpoint = String(data.endpoint || "");
    if (!okEndpoint(endpoint)) return json({ error: "That is not a push address." }, 400);
    const items = Array.isArray(data.items) ? data.items : [];
    const now = Date.now();
    const clean = items
      .filter((i) => i && Number.isFinite(i.at) && i.at > now - 60_000 && i.at < now + 40 * 864e5 && typeof i.body === "string" && i.body.length <= MAX_BODY)
      .slice(0, MAX_ITEMS);
    const id = await sha(endpoint);
    const db = env.DB;
    const ops = [
      db.prepare("INSERT INTO subs (id, endpoint, updated) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, updated = excluded.updated").bind(id, endpoint, now),
      db.prepare("DELETE FROM items WHERE sub = ?").bind(id),
      ...clean.map((i) => db.prepare("INSERT INTO items (sub, at, body) VALUES (?, ?, ?)").bind(id, Math.round(i.at), i.body)),
    ];
    await db.batch(ops);
    return json({ ok: true, count: clean.length });
  }

  if (req.method === "POST" && url.pathname === "/off") {
    const data = await req.json().catch(() => ({}));
    const endpoint = String(data.endpoint || "");
    if (!endpoint) return json({ ok: true });
    const id = await sha(endpoint);
    await env.DB.batch([env.DB.prepare("DELETE FROM items WHERE sub = ?").bind(id), env.DB.prepare("DELETE FROM subs WHERE id = ?").bind(id)]);
    return json({ ok: true });
  }

  // ---------- device linking ----------
  const okId = (v, n) => typeof v === "string" && v.length === n && /^[A-Za-z0-9_-]+$/.test(v);

  // Leave a sealed box for the other device. Lasts 10 minutes, opens once.
  if (req.method === "POST" && url.pathname === "/pair") {
    const data = await req.json().catch(() => ({}));
    if (!okId(data.id, 4) || typeof data.box !== "string" || data.box.length > 400) return json({ error: "Bad request." }, 400);
    const now = Date.now();
    await env.DB.prepare("DELETE FROM pairs WHERE exp < ?").bind(now).run();
    const r = await env.DB.prepare("INSERT OR IGNORE INTO pairs (id, box, exp) VALUES (?, ?, ?)").bind(data.id, data.box, now + PAIR_MINS * 60_000).run();
    if (!r.meta.changes) return json({ error: "taken" }, 409);
    return json({ ok: true, exp: now + PAIR_MINS * 60_000 });
  }
  // The other device picks the box up. It is gone after this.
  if (req.method === "POST" && url.pathname === "/pair/claim") {
    const data = await req.json().catch(() => ({}));
    if (!okId(data.id, 4)) return json({ error: "Bad request." }, 400);
    const row = await env.DB.prepare("SELECT box, exp FROM pairs WHERE id = ?").bind(data.id).first();
    if (!row || row.exp < Date.now()) return json({ error: "gone" }, 404);
    await env.DB.prepare("DELETE FROM pairs WHERE id = ?").bind(data.id).run();
    return json({ box: row.box });
  }
  // Lets the first device see that the code was used.
  if (req.method === "GET" && url.pathname === "/pair/status") {
    const id = url.searchParams.get("id");
    if (!okId(id, 4)) return json({ error: "Bad request." }, 400);
    const row = await env.DB.prepare("SELECT exp FROM pairs WHERE id = ?").bind(id).first();
    return json({ waiting: !!row && row.exp > Date.now() });
  }
  // Read the sealed copy for a linked group.
  if (req.method === "GET" && url.pathname === "/vault") {
    const id = url.searchParams.get("id");
    if (!okId(id, 22)) return json({ error: "Bad request." }, 400);
    const row = await env.DB.prepare("SELECT rev, blob FROM vaults WHERE id = ?").bind(id).first();
    if (row && row.rev < 0) return json({ gone: true }, 410);
    return json(row ? { rev: row.rev, blob: row.blob } : { rev: 0, blob: null });
  }
  // Save a new sealed copy. Only devices that hold the group's write token can,
  // and only on top of the version they last saw.
  if (req.method === "POST" && url.pathname === "/vault") {
    const data = await req.json().catch(() => ({}));
    if (!okId(data.id, 22) || typeof data.token !== "string" || data.token.length < 20 || typeof data.blob !== "string" || !Number.isInteger(data.rev)) return json({ error: "Bad request." }, 400);
    if (data.blob.length > MAX_VAULT) return json({ error: "too big" }, 413);
    const tok = await sha(data.token);
    const now = Date.now();
    const row = await env.DB.prepare("SELECT token, rev, blob FROM vaults WHERE id = ?").bind(data.id).first();
    if (row && row.token !== tok) return json({ error: "Not allowed." }, 403);
    if (row && row.rev < 0) return json({ gone: true }, 410);
    if ((row ? row.rev : 0) !== data.rev) return json({ error: "stale", rev: row ? row.rev : 0, blob: row ? row.blob : null }, 409);
    const r = row
      ? await env.DB.prepare("UPDATE vaults SET rev = rev + 1, blob = ?, at = ? WHERE id = ? AND rev = ?").bind(data.blob, now, data.id, data.rev).run()
      : await env.DB.prepare("INSERT OR IGNORE INTO vaults (id, token, rev, blob, at) VALUES (?, ?, 1, ?, ?)").bind(data.id, tok, data.blob, now).run();
    if (!r.meta.changes) {
      const cur = await env.DB.prepare("SELECT rev, blob FROM vaults WHERE id = ?").bind(data.id).first();
      return json({ error: "stale", rev: cur ? cur.rev : 0, blob: cur ? cur.blob : null }, 409);
    }
    return json({ ok: true, rev: data.rev + 1 });
  }
  // Forget a linked group everywhere. The data is wiped, and a marker stays so
  // the other devices know to stop instead of starting a fresh copy.
  if (req.method === "POST" && url.pathname === "/vault/forget") {
    const data = await req.json().catch(() => ({}));
    if (!okId(data.id, 22) || typeof data.token !== "string") return json({ error: "Bad request." }, 400);
    await env.DB.prepare("UPDATE vaults SET rev = -1, blob = '', at = ? WHERE id = ? AND token = ?").bind(Date.now(), data.id, await sha(data.token)).run();
    return json({ ok: true });
  }

  if (url.pathname === "/") return json({ ok: true, name: "Shrink my day reminders and sync" });
  return json({ error: "Not found." }, 404);
}

// ---------- every minute: send what is due ----------
async function send(env) {
  const db = env.DB;
  if (!db) return;
  await setup(db);
  const now = Date.now();
  const due = await db
    .prepare("SELECT items.rowid AS rid, items.body AS body, subs.endpoint AS endpoint, subs.id AS sid FROM items JOIN subs ON subs.id = items.sub WHERE items.at <= ? ORDER BY items.at LIMIT 40")
    .bind(now)
    .all();
  const rows = due.results || [];
  const done = [];
  const gone = new Set();
  if (rows.length) {
    const k = await keys(db);
    const cache = new Map();
    await Promise.all(
      rows.map(async (r) => {
        try {
          const res = await fetch(r.endpoint, {
            method: "POST",
            headers: {
              authorization: await vapidHeader(k, r.endpoint, cache),
              "content-encoding": "aes128gcm",
              "content-type": "application/octet-stream",
              ttl: "3600",
              urgency: "high",
            },
            body: fromB64(r.body),
          });
          if (res.status === 404 || res.status === 410) gone.add(r.sid);
          // Sent, or refused for good: either way it should not be tried again.
          if (res.ok || res.status < 500) done.push(r.rid);
        } catch {
          // Network trouble. Leave it for the next minute.
        }
      })
    );
  }
  const ops = [
    ...done.map((rid) => db.prepare("DELETE FROM items WHERE rowid = ?").bind(rid)),
    ...[...gone].flatMap((sid) => [db.prepare("DELETE FROM items WHERE sub = ?").bind(sid), db.prepare("DELETE FROM subs WHERE id = ?").bind(sid)]),
    // Anything stuck for more than a day is dropped.
    db.prepare("DELETE FROM items WHERE at < ?").bind(now - 864e5),
    // Unused codes, and linked groups nobody has opened in a year.
    db.prepare("DELETE FROM pairs WHERE exp < ?").bind(now),
    db.prepare("DELETE FROM vaults WHERE at < ?").bind(now - 365 * 864e5),
  ];
  await db.batch(ops);
}

export default {
  fetch: (req, env) => handle(req, env).catch((e) => json({ error: String(e && e.message ? e.message : e) }, 500)),
  scheduled: (_event, env, ctx) => ctx.waitUntil(send(env)),
};
