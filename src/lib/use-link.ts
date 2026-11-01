"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { State } from "./tasks";
import { readLink, syncNow } from "./link";

type Sync = { localRev: number; applySynced: (s: State) => void; getState: () => State; getRev: () => number };
export type LinkStatus = { linked: boolean; busy: boolean; at?: number; error?: string };

let status: LinkStatus = { linked: false, busy: false };
const listeners = new Set<(s: LinkStatus) => void>();
function setStatus(p: Partial<LinkStatus>) {
  status = { ...status, ...p };
  listeners.forEach((f) => f(status));
}

/** Ask the app to sync right now, for example just after linking. */
export const requestSync = () => window.dispatchEvent(new Event("nudge:syncnow"));

/** For the Settings screen: is this device linked, and when did it last sync. */
export function useLinkStatus() {
  const [s, set] = useState<LinkStatus>(status);
  useEffect(() => {
    listeners.add(set);
    set(status);
    return () => {
      listeners.delete(set);
    };
  }, []);
  return s;
}

/**
 * Keeps this device in step with its linked devices. Syncs when the app opens,
 * when you come back to it, when the connection returns, a moment after any
 * change, and once a minute while it's on screen.
 */
export function useLinkSync(sync: Sync | null) {
  const s = useRef(sync);
  s.current = sync;
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    const read = () => {
      const l = readLink();
      setLinked(!!l);
      setStatus({ linked: !!l, at: l?.at, error: l ? status.error : undefined });
    };
    read();
    window.addEventListener("nudge:link", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("nudge:link", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const run = useRef<() => void>(() => {});
  run.current = async () => {
    const cur = s.current;
    if (!cur || !readLink() || !navigator.onLine) return;
    setStatus({ busy: true });
    const before = cur.getRev();
    const r = await syncNow(cur.getState);
    if (r.state) {
      // If you changed something while it ran, sync again instead of overwriting your change.
      if (cur.getRev() === before) cur.applySynced(r.state);
      else setTimeout(() => run.current(), 300);
    }
    setStatus({ busy: false, at: readLink()?.at, error: r.ok ? undefined : r.error });
    if (r.stopped) toast("Syncing was stopped from another device. Your tasks are still here.");
  };

  // When the app opens, comes back, or the connection returns.
  useEffect(() => {
    if (!linked) return;
    const go = () => run.current();
    const onShow = () => document.visibilityState === "visible" && go();
    go();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("online", go);
    window.addEventListener("focus", go);
    window.addEventListener("nudge:syncnow", go);
    const tick = setInterval(() => document.visibilityState === "visible" && go(), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("online", go);
      window.removeEventListener("focus", go);
      window.removeEventListener("nudge:syncnow", go);
      clearInterval(tick);
    };
  }, [linked]);

  // A moment after any change on this device.
  const rev = sync?.localRev ?? 0;
  useEffect(() => {
    if (!linked || !rev) return;
    const t = setTimeout(() => run.current(), 1500);
    return () => clearTimeout(t);
  }, [rev, linked]);

  // Send the last change before the tab goes away.
  useEffect(() => {
    if (!linked) return;
    const onHide = () => document.visibilityState === "hidden" && run.current();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [linked]);
}
