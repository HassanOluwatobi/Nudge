import { expect, test } from "vitest";
import { cleanCode, merge, newCode, showCode, type Stamps } from "@/lib/link";
import { freshState, makeTask, type State } from "@/lib/tasks";

const S = (): Stamps => ({ items: {}, tombs: {}, settings: 0, meta: 0 });
const withTasks = (titles: string[]) => {
  const s = freshState();
  s.tasks = titles.map((t) => makeTask(t, "today"));
  return s;
};
const titles = (s: State) => s.tasks.map((t) => t.title);

test("codes are 12 easy characters and survive messy typing", () => {
  const c = newCode();
  expect(c).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
  expect(showCode(c)).toMatch(/^.{4}-.{4}-.{4}$/);
  expect(cleanCode(" 7kq2 - m9xa - p4td ")).toBe("7KQ2M9XAP4TD");
  expect(cleanCode("O1IL")).toBe("0111");
});

test("tasks added on each device all end up on both", () => {
  const a = withTasks(["Pay rent"]);
  const b = withTasks(["Email Sade"]);
  const m = merge(a, S(), b, S());
  expect(titles(m.state).sort()).toEqual(["Email Sade", "Pay rent"]);
});

test("the newest edit wins", () => {
  const a = withTasks(["Pay rent"]);
  const b = structuredClone(a);
  const id = a.tasks[0].id;
  a.tasks[0].title = "Pay rent today";
  b.tasks[0].title = "Pay rent tomorrow";
  const ls = S();
  const rs = S();
  ls.items[`t:${id}`] = 2000;
  rs.items[`t:${id}`] = 1000;
  expect(titles(merge(a, ls, b, rs).state)).toEqual(["Pay rent today"]);
  rs.items[`t:${id}`] = 3000;
  expect(titles(merge(a, ls, b, rs).state)).toEqual(["Pay rent tomorrow"]);
});

test("a delete beats an older edit, and a newer edit beats a delete", () => {
  const a = withTasks(["Pay rent"]);
  const id = a.tasks[0].id;
  const b = { ...a, tasks: [] };
  const ls = S();
  const rs = S();
  ls.items[`t:${id}`] = 1000;
  rs.tombs[`t:${id}`] = 2000;
  const gone = merge(a, ls, b, rs);
  expect(gone.state.tasks).toHaveLength(0);
  expect(gone.stamps.tombs[`t:${id}`]).toBe(2000);
  ls.items[`t:${id}`] = 3000;
  const back = merge(a, ls, b, rs);
  expect(titles(back.state)).toEqual(["Pay rent"]);
  expect(back.stamps.tombs[`t:${id}`]).toBeUndefined();
});

test("both devices settle on the same order", () => {
  const a = withTasks(["One", "Two"]);
  const b = { ...a, tasks: [...a.tasks].reverse() };
  const m = merge(a, S(), b, S());
  expect(titles(m.state)).toEqual(["Two", "One"]);
  // Merging again from the other side changes nothing.
  const again = merge(b, m.stamps, m.state, m.stamps);
  expect(JSON.stringify(again.state)).toBe(JSON.stringify(m.state));
});

test("the same calendar event imported on both devices becomes one task", () => {
  const a = freshState();
  const b = freshState();
  a.tasks = [makeTask("Standup", "today", { ext: "g:123" })];
  b.tasks = [makeTask("Standup", "today", { ext: "g:123" })];
  expect(merge(a, S(), b, S()).state.tasks).toHaveLength(1);
});

test("notifications and calendar sign-ins stay with each device", () => {
  const a = freshState();
  const b = freshState();
  a.settings = { ...a.settings, notify: true, sync: { ...a.settings.sync, google: true } };
  b.settings = { ...b.settings, notify: false, morning: "07:30", sync: { ...b.settings.sync, google: false } };
  const rs = S();
  rs.settings = 5000;
  const m = merge(a, S(), b, rs);
  expect(m.state.settings.morning).toBe("07:30");
  expect(m.state.settings.notify).toBe(true);
  expect(m.state.settings.sync.google).toBe(true);
});

test("deleting a task on this device is remembered, so it leaves the other devices too", async () => {
  const mem = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as Storage;
  const { noteChange, readStamps } = await import("@/lib/link");
  const a = withTasks(["Pay rent", "Email Sade"]);
  const gone = a.tasks[1].id;
  const next = { ...a, tasks: [a.tasks[0]] };
  noteChange(a, next);
  const st = readStamps();
  expect(st.tombs[`t:${gone}`]).toBeGreaterThan(0);
  // The other device still has it, with an older change time.
  const other = structuredClone(a);
  const rs = S();
  rs.items[`t:${gone}`] = 1;
  expect(titles(merge(next, st, other, rs).state)).toEqual(["Pay rent"]);
});
