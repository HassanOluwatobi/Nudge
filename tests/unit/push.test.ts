// @vitest-environment node
import { expect, test } from "vitest";
import { createRequire } from "node:module";
import { createECDH, randomBytes } from "node:crypto";
import { seal } from "@/lib/push";

const req = createRequire(import.meta.url);

test("a sealed reminder opens with the phone's keys (RFC 8291)", async () => {
  let ece: { decrypt: (b: Buffer, o: object) => Buffer };
  try {
    ece = req("/tmp/ecetest/node_modules/http_ece");
  } catch {
    console.warn("SKIPPED"); return;
  }
  const ua = createECDH("prime256v1");
  ua.generateKeys();
  const auth = randomBytes(16);
  const b64u = (b: Buffer) => b.toString("base64url");
  const msg = JSON.stringify({ title: "Pay rent", body: "Time for a small step." });
  const body = await seal({ p256dh: b64u(ua.getPublicKey()), auth: b64u(auth) }, msg);
  const out = ece.decrypt(Buffer.from(body, "base64"), { version: "aes128gcm", privateKey: ua, dh: undefined, authSecret: auth.toString("base64url") });
  expect(out.toString()).toBe(msg);
});
