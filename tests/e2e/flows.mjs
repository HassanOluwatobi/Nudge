// End-to-end checks for the core flows. Run against a running app:
//   npm run build && npm start   (in one terminal)
//   npm run test:e2e             (in another)
// BASE_URL defaults to http://127.0.0.1:3000.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const KEY = "nudgeme.v11";
const now = new Date().toISOString();
const task = (id, title, extra = {}) => ({ id, title, bucket: "today", steps: [], createdAt: now, updatedAt: now, ...extra });

const browser = await chromium.launch();
let failed = 0;

async function flow(name, seed, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ([key, seed]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      sessionStorage.setItem("nudgeme.splashed", "1");
      localStorage.setItem("nudgeme.installAsk", JSON.stringify({ never: true }));
      localStorage.setItem(key, JSON.stringify({ v: 12, meta: { intro: true, morningDone: new Date().toISOString().slice(0, 10) }, settings: {}, entries: [], tasks: [], ...seed }));
    },
    [KEY, seed],
  );
  await page.goto(BASE);
  await page.waitForTimeout(800);
  const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
  try {
    await fn(page, saved);
    assert.deepEqual(errors, [], "no page errors");
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e.message.split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

console.log(`Shrink my day flows against ${BASE}`);

await flow("capture a task from Home", {}, async (page, saved) => {
  await page.locator("#quick").fill("Buy airtime");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  assert.equal((await saved()).tasks.at(-1).title, "Buy airtime");
});

await flow("brain dump makes one task per line", {}, async (page, saved) => {
  await page.locator("#quick").click();
  await page.keyboard.insertText("Pay rent\n- Email landlord\n3. Call mum");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(400);
  assert.deepEqual((await saved()).tasks.map((t) => t.title), ["Pay rent", "Email landlord", "Call mum"]);
});

await flow("capture an idea and a note", {}, async (page, saved) => {
  await page.getByRole("tab", { name: /^Ideas/ }).click();
  await page.locator("#quick").fill("Podcast with founders");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("tab", { name: /^Notes/ }).click();
  await page.locator("#quick").fill("Gate code 4471");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(400);
  const e = (await saved()).entries;
  assert.deepEqual(e.map((x) => x.kind).sort(), ["idea", "note"]);
});

await flow("finish a task, then undo", { tasks: [task("a", "Reply to Tunde"), task("b", "Laundry")] }, async (page, saved) => {
  await page.getByRole("button", { name: "Finish task: Laundry" }).click();
  await page.waitForTimeout(900);
  assert.equal((await saved()).tasks.find((t) => t.id === "b").bucket, "done");
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(300);
  assert.equal((await saved()).tasks.find((t) => t.id === "b").bucket, "today");
});

await flow("swipe to delete, then undo", { tasks: [task("a", "Reply to Tunde"), task("b", "Laundry")] }, async (page, saved) => {
  const row = page.getByRole("button", { name: /^Laundry\. Open details/ });
  const box = await row.boundingBox();
  await page.mouse.move(box.x + box.width - 20, box.y + 20);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(box.x + box.width - 20 - i * 16, box.y + 20);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);
  assert.equal((await saved()).tasks.some((t) => t.id === "b"), false, "deleted");
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(300);
  assert.equal((await saved()).tasks.some((t) => t.id === "b"), true, "restored");
});

await flow("add subtasks with Return, no extra button", { tasks: [task("a", "Reply to Tunde")] }, async (page, saved) => {
  await page.getByRole("button", { name: /Reply to Tunde\. Open details/ }).click();
  await page.waitForTimeout(700);
  await page.getByLabel("Add a subtask").click();
  for (const s of ["Open the email", "Write two lines"]) {
    await page.keyboard.type(s);
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(300);
  assert.deepEqual((await saved()).tasks[0].steps.map((s) => s.t), ["Open the email", "Write two lines"]);
});

await flow("restore a backup file", {}, async (page, saved) => {
  const dir = mkdtempSync(join(tmpdir(), "nudge-"));
  const file = join(dir, "backup.json");
  writeFileSync(file, JSON.stringify({ v: 12, meta: { intro: true }, settings: {}, entries: [], tasks: [task("z", "From the backup")] }));
  await page.getByRole("button", { name: "Settings, reminders and privacy" }).click();
  await page.waitForTimeout(700);
  await page.getByText("Your data", { exact: true }).click();
  await page.waitForTimeout(400);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Load a copy/ }).click();
  await (await chooser).setFiles(file);
  await page.waitForTimeout(600);
  assert.ok((await saved()).tasks.some((t) => t.title === "From the backup"));
});

await flow("switch to dark mode from Home", {}, async (page, saved) => {
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  assert.equal((await saved()).settings.theme, "dark");
});

await browser.close();
console.log(failed ? `\n${failed} flow(s) failed` : "\nAll flows passed");
process.exit(failed ? 1 : 0);
