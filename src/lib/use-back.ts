"use client";

import { useEffect, useRef } from "react";

/**
 * While something is open (a sheet, a step), the phone's Back button closes it
 * instead of leaving NudgeMe.
 */
export function useBackClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const tag = Math.random().toString(36).slice(2);
    history.pushState({ nudge: tag }, "");
    let popped = false;
    const onPop = () => {
      // A deeper layer (like a sheet) was closed and we are back on our own entry.
      if (history.state?.nudge === tag) return;
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed with a button: remove the history entry we added.
      if (!popped && history.state?.nudge === tag) history.back();
    };
  }, [open]);
}
