"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { type State, sanitize, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { Sheet } from "./sheet";

/** Where your data lives, in plain words, and how to take it with you or clear it. */
export function Settings({ open, onClose, state, actions }: { open: boolean; onClose: () => void; state: State; actions: Actions }) {
  const [clear, setClear] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const count = state.tasks.length;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nudgeme-${ymd()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      const next = sanitize(parsed);
      if (!next.tasks.length) return toast("That file has no tasks in it. Nothing changed.");
      const before = state;
      actions.replaceAll(next);
      toast(`Loaded ${next.tasks.length} tasks.`, { action: { label: "Undo", onClick: () => actions.replaceAll(before) } });
      onClose();
    } catch {
      toast("That file could not be read. Nothing changed.");
    }
  };

  return (
    <Sheet open={open} onClose={() => (setClear(false), onClose())} title="Settings and privacy">
      <section className="mt-2 rounded-2xl bg-paper p-4">
        <h3 className="text-[16px] font-semibold">Your list stays on this device</h3>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
          NudgeMe saves your tasks in this browser only. There is no account and nothing is sent to a server. If you clear your browser data, the list goes too, so save a copy now and then.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">NudgeMe does not send reminders when it is closed. Open it when you want to start.</p>
      </section>

      <div className="mt-4 grid gap-2">
        <button type="button" className="btn btn-line w-full justify-start gap-3" onClick={exportData} disabled={!count}>
          <Download className="size-[18px] text-ink-2" /> Save a copy of my list
        </button>
        <button type="button" className="btn btn-line w-full justify-start gap-3" onClick={() => file.current?.click()}>
          <Upload className="size-[18px] text-ink-2" /> Load a saved copy
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = "";
          }}
        />
        {clear ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#f3c7c2] bg-[#fdf3f2] p-2 pl-4" role="group" aria-label="Confirm clear">
            <span className="text-[15px]">Delete all {count} tasks?</span>
            <div className="flex gap-1">
              <button type="button" className="btn btn-quiet min-h-11" onClick={() => setClear(false)}>
                Keep
              </button>
              <button
                type="button"
                className="btn min-h-11 bg-[#b42318] px-4 text-white"
                onClick={() => {
                  actions.clearAll();
                  setClear(false);
                  onClose();
                  toast("Everything was cleared.");
                }}
              >
                Delete all
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet w-full justify-start gap-3 text-[#b42318]" onClick={() => setClear(true)} disabled={!count}>
            <Trash2 className="size-[18px]" /> Clear everything
          </button>
        )}
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-ink-3">
        To add NudgeMe to your home screen, use your browser&apos;s Share or menu button and choose Add to Home Screen. It works offline after the first visit.
      </p>
    </Sheet>
  );
}
