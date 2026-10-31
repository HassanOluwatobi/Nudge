"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Download, Lock, RotateCcw, Upload } from "lucide-react";
import type { State } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";

const Row = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
    <div className="min-w-0">
      <p className="text-[15px] font-medium">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{hint}</p>}
    </div>
    {children}
  </div>
);

export function Settings({ state, actions }: { state: State; actions: Actions }) {
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nudgeme-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <header className="px-1">
        <h1 className="font-serif text-[30px] leading-tight tracking-tight">Settings</h1>
      </header>

      <div className="mt-5 divide-y rounded-2xl border bg-card">
        <Row title="Evening wrap-up" hint="When NudgeMe offers to close your day.">
          <select
            value={state.meta.eveningHour}
            onChange={(e) => actions.setMeta({ eveningHour: Number(e.target.value) })}
            aria-label="Evening wrap-up time"
            className="h-9 rounded-xl bg-muted px-3 text-sm font-medium outline-none"
          >
            {[17, 18, 19, 20, 21, 22].map((h) => (
              <option key={h} value={h}>
                {h - 12} pm
              </option>
            ))}
          </select>
        </Row>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-4">
        <p className="flex items-center gap-2 text-[15px] font-medium">
          <Lock className="size-4 text-primary" /> Your data stays on this device
        </p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          No account, no tracking. Everything lives in this browser. Export a copy to move it or keep it safe.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={exportData} className="inline-flex h-10 items-center gap-2 rounded-xl bg-muted px-4 text-sm font-medium hover:bg-accent">
            <Download className="size-4" /> Export
          </button>
          <button type="button" onClick={() => file.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-muted px-4 text-sm font-medium hover:bg-accent">
            <Upload className="size-4" /> Import
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const s = JSON.parse(await f.text()) as State;
                if (!Array.isArray(s.tasks)) throw new Error();
                actions.importState({ ...s, entries: s.entries ?? [] });
                toast("Imported. Welcome back.");
              } catch {
                toast("That file didn't look like a NudgeMe export.");
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-4">
        <p className="text-[15px] font-medium">Start over</p>
        <p className="mt-1 text-sm text-muted-foreground">Clears everything on this device. Export first if you want a copy.</p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear everything and start fresh?")) {
              actions.reset();
              toast("Fresh start.");
            }
          }}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <RotateCcw className="size-4" /> Clear everything
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">NudgeMe · One calm step at a time</p>
    </div>
  );
}
