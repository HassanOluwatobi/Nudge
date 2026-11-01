"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Laptop, RefreshCw, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { feel } from "@/lib/feedback";
import { claimPair, cleanCode, forgetEverywhere, linkReady, pairWaiting, showCode, startPair, unlink } from "@/lib/link";
import { requestSync, useLinkStatus } from "@/lib/use-link";

type Mode = "idle" | "show" | "enter" | "stop";

function ago(at?: number) {
  if (!at) return "Not synced yet";
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return "Synced just now";
  const m = Math.round(s / 60);
  if (m < 60) return `Synced ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Synced ${h} hr ago`;
  return `Synced ${new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

/** The link that opens the app and joins with a code. The code stays after the #, so it never reaches a server. */
export const joinUrl = (code: string) => `${location.origin}${location.pathname}#link=${code}`;

export function LinkDevices() {
  const st = useLinkStatus();
  const [mode, setMode] = useState<Mode>("idle");
  const [code, setCode] = useState<{ code: string; exp: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [, tick] = useState(0);

  // Keep "Synced 2 min ago" fresh.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // While a code is showing: count down, and notice when the other device uses it.
  useEffect(() => {
    if (mode !== "show" || !code) return;
    let stop = false;
    const count = setInterval(() => setLeft(Math.max(0, code.exp - Date.now())), 1000);
    setLeft(code.exp - Date.now());
    const poll = async () => {
      while (!stop && Date.now() < code.exp) {
        await new Promise((r) => setTimeout(r, 2500));
        if (stop) return;
        const waiting = await pairWaiting(code.code).catch(() => true);
        if (!waiting && Date.now() < code.exp) {
          feel("done");
          toast("Linked. Your tasks will show up on both devices.");
          setMode("idle");
          setCode(null);
          requestSync();
          return;
        }
      }
    };
    poll();
    return () => {
      stop = true;
      clearInterval(count);
    };
  }, [mode, code]);

  useEffect(() => {
    if (mode === "enter") setTimeout(() => input.current?.focus(), 250);
  }, [mode]);

  if (!linkReady()) return null;

  const show = async () => {
    setBusy(true);
    setErr("");
    try {
      const c = await startPair();
      setCode(c);
      setMode("show");
      feel("tap", "light");
      requestSync();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't make a code.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setErr("");
    try {
      await claimPair(typed);
      feel("done");
      toast("Linked. Bringing your tasks over now.");
      setTyped("");
      setMode("idle");
      requestSync();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work. Try again.");
      feel("tap", "warning");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(joinUrl(code.code));
      setCopied(true);
      feel("tap", "light");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy. Type the code instead.");
    }
  };

  const mins = Math.max(0, Math.ceil(left / 60000));
  const pretty = typed ? showCode(cleanCode(typed)) : "";

  return (
    <section className="mt-6">
      <h3 className="t-label">Your devices</h3>
      <div className="mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
        <div className="flex items-start gap-3 px-4 py-4">
          <span className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal-ink">
            <Smartphone className="absolute left-[7px] top-[9px] size-[18px]" />
            <Laptop className="absolute bottom-[7px] right-[5px] size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{st.linked ? "Sync is on" : "Use it on your phone and laptop"}</span>
            {st.linked ? (
              <span className={`t-small flex items-center gap-1.5 ${st.error ? "text-danger" : "text-ink-2"}`}>
                <span className={`inline-block size-1.5 rounded-full ${st.error ? "bg-danger" : st.busy ? "bg-signal" : "bg-success"}`} />
                {st.error ?? (st.busy ? "Syncing…" : ago(st.at))}
              </span>
            ) : (
              <span className="t-small block text-ink-2">Link your devices and your tasks stay the same on both. No account.</span>
            )}
          </span>
          {st.linked && (
            <button type="button" aria-label="Sync now" className="btn btn-quiet -mr-2 min-h-10 px-2.5" onClick={() => (feel("tap", "light"), requestSync())}>
              <RefreshCw className={`size-[18px] text-ink-2 ${st.busy ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {mode === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="grid grid-cols-2 gap-2 px-4 pb-4">
              <button type="button" className="btn btn-ink min-h-11 text-[15px]" disabled={busy} onClick={show}>
                {st.linked ? "Add a device" : "Show a code"}
              </button>
              {st.linked ? (
                <button type="button" className="btn btn-line min-h-11 text-[15px]" onClick={() => (setMode("stop"), feel("tap", "light"))}>
                  Stop syncing
                </button>
              ) : (
                <button type="button" className="btn btn-line min-h-11 text-[15px]" onClick={() => (setMode("enter"), feel("tap", "light"))}>
                  I have a code
                </button>
              )}
            </motion.div>
          )}

          {mode === "show" && code && (
            <motion.div key="show" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="border-t border-line px-4 pb-4 pt-4">
              <p className="t-small text-ink-2">On your other device, open Settings, tap I have a code, and type this.</p>
              <p className="mt-3 select-all text-center font-mono text-[28px] font-semibold tracking-[0.08em] tabular-nums" aria-live="polite">
                {showCode(code.code)}
              </p>
              <p className="t-small mt-1 text-center text-ink-3">{left > 0 ? `Works for ${mins} more minute${mins === 1 ? "" : "s"}. Only use it on your own devices.` : "This code ran out. Make a new one."}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-line min-h-11 gap-1.5 text-[15px]" onClick={left > 0 ? copy : show}>
                  {left <= 0 ? "New code" : copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy link</>}
                </button>
                <button type="button" className="btn btn-quiet min-h-11 text-[15px]" onClick={() => (setMode("idle"), setCode(null))}>
                  Close
                </button>
              </div>
            </motion.div>
          )}

          {mode === "enter" && (
            <motion.form
              key="enter"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ type: "spring", bounce: 0, duration: 0.32 }}
              className="border-t border-line px-4 pb-4 pt-4"
              onSubmit={(e) => (e.preventDefault(), join())}
            >
              <p className="t-small text-ink-2">On your other device, open Settings and tap Show a code.</p>
              <input
                ref={input}
                value={pretty}
                onChange={(e) => (setTyped(cleanCode(e.target.value)), setErr(""))}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="XXXX-XXXX-XXXX"
                aria-label="Code from your other device"
                className="mt-3 w-full rounded-xl bg-paper px-3 py-3 text-center font-mono text-[22px] font-semibold uppercase tracking-[0.08em] ring-1 ring-line placeholder:text-ink-3/50 focus:outline-none focus:ring-2 focus:ring-signal"
              />
              {err && (
                <p className="t-small mt-2 text-danger" role="alert">
                  {err}
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="submit" className="btn btn-ink min-h-11 text-[15px]" disabled={busy || cleanCode(typed).length !== 12}>
                  {busy ? "Linking…" : "Link"}
                </button>
                <button type="button" className="btn btn-quiet min-h-11 text-[15px]" onClick={() => (setMode("idle"), setTyped(""), setErr(""))}>
                  Cancel
                </button>
              </div>
              <p className="t-small mt-3 text-ink-3">Tasks on this device are kept and added to the other one.</p>
            </motion.form>
          )}

          {mode === "stop" && (
            <motion.div key="stop" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="border-t border-line px-4 pb-4 pt-4">
              <p className="text-[15px]">Stop syncing? Your tasks stay on this device either way.</p>
              <div className="mt-3 grid gap-2">
                <button type="button" className="btn btn-line min-h-11 text-[15px]" onClick={() => (unlink(), feel("undo", "light"), setMode("idle"), toast("This device has stopped syncing."))}>
                  Just this device
                </button>
                <button
                  type="button"
                  className="btn btn-line min-h-11 text-[15px] text-danger"
                  onClick={async () => (await forgetEverywhere(), feel("undo", "warning"), setMode("idle"), toast("Stopped on all devices. The synced copy is deleted."))}
                >
                  All devices, and delete the synced copy
                </button>
                <button type="button" className="btn btn-quiet min-h-11 text-[15px]" onClick={() => setMode("idle")}>
                  Keep syncing
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
