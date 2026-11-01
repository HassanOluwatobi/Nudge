import { describe, expect, it } from "vitest";
import { backupDue } from "@/lib/backup";
import { addDays, readThought, sanitize, splitLines } from "@/lib/tasks";

describe("brain dump", () => {
  it("turns each line into one task and cleans bullets and numbers", () => {
    expect(splitLines("Buy airtime\n- Pay rent\n3. Email landlord\n\n•  Call mum ")).toEqual(["Buy airtime", "Pay rent", "Email landlord", "Call mum"]);
  });
  it("keeps a single line as one task", () => {
    expect(splitLines("Reply to Tunde")).toEqual(["Reply to Tunde"]);
  });
  it("caps a huge paste at 50 tasks", () => {
    expect(splitLines(Array.from({ length: 80 }, (_, i) => `Task ${i}`).join("\n"))).toHaveLength(50);
  });
});

describe("reading a thought", () => {
  it("moves 'tomorrow' to This week with tomorrow's date", () => {
    const r = readThought("call mum tomorrow", "2026-11-01");
    expect(r.title).toBe("Call mum");
    expect(r.bucket).toBe("week");
    expect(r.due).toBe(addDays("2026-11-01", 1));
  });
  it("sends 'someday' to Later", () => {
    expect(readThought("learn spanish someday").bucket).toBe("later");
  });
});

describe("loading saved data", () => {
  it("survives garbage and empty input", () => {
    for (const bad of [null, undefined, 42, "x", [], { tasks: "nope" }]) {
      const s = sanitize(bad);
      expect(Array.isArray(s.tasks)).toBe(true);
      expect(Array.isArray(s.entries)).toBe(true);
    }
  });
  it("resets removed fields from older saves (time of day, how long)", () => {
    const s = sanitize({ tasks: [{ id: "a", title: "Laundry", bucket: "today", part: "evening", mins: 30, steps: [], createdAt: "2026-10-01T00:00:00Z" }] });
    expect(s.tasks[0].part).toBe("anytime");
    expect(s.tasks[0].mins).toBeUndefined();
    expect(s.tasks[0].title).toBe("Laundry");
  });
  it("drops tasks with no title, and keeps repeated ids by giving them a fresh one", () => {
    const s = sanitize({ tasks: [{ id: "a", title: "" }, { id: "b", title: "One" }, { id: "b", title: "Two" }] });
    expect(s.tasks.map((t) => t.title)).toEqual(["One", "Two"]);
    expect(new Set(s.tasks.map((t) => t.id)).size).toBe(2);
  });
  it("starts in light mode with the weekly reset off", () => {
    const s = sanitize({ settings: { theme: "system" } });
    expect(s.settings.theme).toBe("light");
    expect(sanitize({}).settings.weeklyDay).toBe(-1);
  });
  it("keeps a chosen dark mode and a chosen weekly day", () => {
    const s = sanitize({ settings: { theme: "dark", weeklyDay: 0 } });
    expect(s.settings.theme).toBe("dark");
    expect(s.settings.weeklyDay).toBe(0);
  });
});

describe("backup reminder", () => {
  const base = sanitize({});
  const withTasks = (n: number, lastBackup?: string) => ({ ...base, tasks: Array.from({ length: n }, (_, i) => ({ ...base.tasks[0], id: `t${i}`, title: `T${i}` })) as never, settings: { ...base.settings, lastBackup } });
  it("stays quiet when there is little to lose", () => {
    expect(backupDue(withTasks(2))).toBe(false);
  });
  it("asks when there is no backup yet", () => {
    expect(backupDue(withTasks(6))).toBe(true);
  });
  it("waits two weeks after a backup", () => {
    const now = Date.parse("2026-11-01T10:00:00Z");
    expect(backupDue(withTasks(6, "2026-10-25T10:00:00Z"), now)).toBe(false);
    expect(backupDue(withTasks(6, "2026-10-10T10:00:00Z"), now)).toBe(true);
  });
});
