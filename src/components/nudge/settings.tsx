"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Lock, RotateCcw, Smartphone, Upload } from "lucide-react";
import { platform, type Platform } from "@/lib/reminders";
import type { State } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";

type BIP = Event & { prompt: () => Promise<void> };

function InstallCard() {
  const [os, setOs] = useState<Platform>("other");
  const [prompt, setPrompt] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setOs(platform());
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const on = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIP);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (installed) return null;
  return (
    <div className="mt-5 rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <Smartphone className="size-4 text-primary" /> Put NudgeMe on your home screen
      </p>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        {os === "ios"
          ? "In Safari, tap the Share button, then Add to Home Screen. It opens like an app."
          : prompt
            ? "One tap and it opens like an app. No app store needed."
            : "In your browser menu, tap Install app or Add to Home screen."}
      </p>
      {prompt && (
        <button type="button" onClick={() => prompt.prompt().finally(() => setPrompt(null))} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-muted px-4 text-sm font-medium hover:bg-accent">
          Add to home screen
        </button>
      )}
    </div>
  );
}

export function Settings({ state, actions }: { state: State; actions: Actions }) {
  const file = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState(false);

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

      <InstallCard />

      <div className="mt-4 rounded-2xl border bg-card p-4">
        <p className="flex items-center gap-2 text-[15px] font-medium">
          <Lock className="size-4 text-primary" /> Your data stays on this device
        </p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Free. No account, no ads, no tracking. Your list is saved in this browser only. Export a copy to move it to a new phone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={exportData} className="inline-flex h-11 items-center gap-2 rounded-xl bg-muted px-4 text-sm font-medium hover:bg-accent">
            <Download className="size-4" /> Export
          </button>
          <button type="button" onClick={() => file.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-muted px-4 text-sm font-medium hover:bg-accent">
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
        {confirm ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                actions.reset();
                try {
                  localStorage.removeItem("nudgeme.draft");
                } catch {}
                toast("Everything is cleared. Fresh start.");
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white"
            >
              Yes, delete everything
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="inline-flex h-11 items-center rounded-xl bg-muted px-4 text-sm font-medium">
              Keep my list
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
            <RotateCcw className="size-4" /> Clear everything
          </button>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        NudgeMe · One calm step at a time ·{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy and about
        </Link>
      </p>
    </div>
  );
}
