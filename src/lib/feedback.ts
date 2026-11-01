"use client";

/*
  Shrink my day's touch feedback. No sounds.

  Built on the rules Apple uses for Core Haptics and its system feedback:
  - Use the smallest, system-like feedback for the moment. Ordinary taps get none.
  - Feedback is semantic: selection, a light or medium impact, success, warning.
    Each kind always feels the same, so it is learnable.
  - Haptics never carry meaning on their own. Every moment also shows on screen.
  - Frequent moments stay light so they never get tiring. Strong feedback is kept
    for finishing a task and for the timer ending.
  - It always works without haptics, and people can turn it off in Settings.

  Core Haptics itself is a native iPhone API that websites cannot call. So:
  Android plays short vibration patterns modelled on Apple's system feedback.
  iPhone Safari toggles a hidden system switch, which plays the iOS selection
  haptic (iOS 18 and later). Its one tap is the only touch the web gets on iPhone,
  so success and warning are told apart by rhythm.
*/

let enabled = true;
export function setFeedback(o: { haptics?: boolean }) {
  if (o.haptics !== undefined) enabled = o.haptics;
}

export type Haptic = "selection" | "light" | "medium" | "success" | "warning";

// Short and crisp, like system feedback. Never a long buzz.
const ANDROID: Record<Haptic, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 16,
  success: [10, 60, 18],
  warning: [18, 90, 18],
};
// iPhone rhythm: one tap, or two for success and warning.
const IOS_GAP: Partial<Record<Haptic, number>> = { success: 90, warning: 140 };
const RANK: Record<Haptic, number> = { selection: 1, light: 2, medium: 3, success: 4, warning: 4 };

// A fresh hidden switch each time, clicked inside the tap. Toggling a native
// iOS switch is what plays the system haptic in Safari (iOS 18 and later).
function iosTap() {
  if (typeof document === "undefined") return;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

let last = { t: 0, r: 0 };

/** Play one piece of semantic feedback. One per moment, and the stronger one wins. */
export function haptic(h: Haptic) {
  if (!enabled || typeof navigator === "undefined") return;
  const now = performance.now();
  if (now - last.t < 80 && RANK[h] <= last.r) return;
  last = { t: now, r: RANK[h] };
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(ANDROID[h]);
    return;
  }
  iosTap();
  const gap = IOS_GAP[h];
  if (gap) setTimeout(iosTap, gap);
}

/*
  The app's moments, named by what happened. Each maps to one kind of feedback.
  "tap" and "open" are deliberately silent: buttons don't need to buzz.
*/
export type Moment = "tap" | "open" | "tick" | "step" | "unstep" | "save" | "undo" | "start" | "done" | "finish" | "end";

const MAP: Record<Moment, Haptic | null> = {
  tap: null,
  open: null,
  tick: "selection", // choosing an option, a toggle, a chip
  step: "light", // a subtask ticked
  unstep: null,
  save: "light", // something captured
  undo: null,
  start: "medium", // focus begins
  done: "success", // a task done
  finish: "success",
  end: "warning", // the timer ran out
};

/** Feedback for an app moment. The second argument is kept so older calls still work, and it is ignored. */
export function feel(m: Moment, _legacy?: unknown) {
  const h = MAP[m];
  if (h) haptic(h);
}
