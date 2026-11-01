"use client";

/*
  NudgeMe's sound and touch. Everything is synthesised in the browser, so there
  are no files to load and nothing to pay for.

  The palette is short, soft and glassy: a click for choosing, a pop for doing,
  one clear ting for finishing.

  Haptics: Android vibrates. iPhone Safari has no vibration API, so we toggle a
  hidden system switch, which plays the iOS switch haptic (iOS 18 and later).
*/

let enabledSound = true;
let enabledHaptics = true;
export function setFeedback(o: { sound?: boolean; haptics?: boolean }) {
  if (o.sound !== undefined) enabledSound = o.sound;
  if (o.haptics !== undefined) enabledHaptics = o.haptics;
}

// ---------- audio ----------
/*
  One family of sounds, built like premium interface sounds rather than music:
  very short, soft, glassy. A click for choosing, a pop for doing, a single
  clear "ting" for finishing. No melodies, nothing that repeats into noise.
  Silence for ordinary taps; touch alone carries those.
*/
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -24;
    glue.knee.value = 12;
    glue.ratio.value = 4;
    glue.attack.value = 0.002;
    glue.release.value = 0.12;
    const tame = ctx.createBiquadFilter();
    tame.type = "lowpass";
    tame.frequency.value = 9000;
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(tame).connect(glue).connect(ctx.destination);
    // A small, bright room: just enough air for the ting to bloom.
    const len = Math.floor(ctx.sampleRate * 0.9);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.18;
    wet.connect(verb).connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function out(node: AudioNode, room = 0) {
  node.connect(master!);
  if (room > 0) {
    const send = ctx!.createGain();
    send.gain.value = room;
    node.connect(send).connect(wet!);
  }
}

/** A crisp, tiny click: high-passed noise, a few milliseconds long. */
function click(at: number, v = 0.12, hp = 2600, len = 0.012) {
  const c = ctx!;
  const n = Math.max(1, Math.floor(c.sampleRate * len));
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
  const src = c.createBufferSource();
  src.buffer = b;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = v;
  src.connect(f).connect(g);
  out(g);
  src.start(at);
}

/** A soft pop: a pure tone that glides and fades in a blink, like a bubble. */
function pop(at: number, from: number, to: number, v = 0.22, len = 0.09) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(to, at + len * 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g);
  out(g, 0.15);
  o.start(at);
  o.stop(at + len + 0.02);
}

/** A single clear glass ting: two close partials, quick shimmer, short bloom. */
function ting(at: number, freq: number, v = 0.12, len = 0.55) {
  const c = ctx!;
  [
    [1, 1],
    [2.01, 0.28],
  ].forEach(([ratio, amt]) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v * amt, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len * (ratio > 1 ? 0.5 : 1));
    o.connect(g);
    out(g, 0.6);
    o.start(at);
    o.stop(at + len + 0.05);
  });
}

/** A soft breath of air, for things that open or begin. */
function air(at: number, v = 0.05, len = 0.16, up = true) {
  const c = ctx!;
  const n = Math.floor(c.sampleRate * len);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = b;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(up ? 700 : 2200, at);
  f.frequency.exponentialRampToValueAtTime(up ? 2200 : 700, at + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + len * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f).connect(g);
  out(g);
  src.start(at);
}

export type Sound = "tap" | "step" | "unstep" | "done" | "finish" | "start" | "end" | "undo" | "open" | "tick" | "save";

// Subtasks ticked in a row nudge the pop a little higher, so progress feels like progress.
let climb = { n: 0, t: 0 };

export function play(s: Sound) {
  if (!enabledSound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.005;
  switch (s) {
    case "tap":
      // Ordinary taps stay silent. Touch is enough.
      break;
    case "tick":
      click(t, 0.09);
      break;
    case "open":
      click(t, 0.06, 1800, 0.016);
      break;
    case "unstep":
      pop(t, 520, 380, 0.12, 0.07);
      break;
    case "step": {
      const now = performance.now();
      climb = { n: now - climb.t < 9000 ? Math.min(climb.n + 1, 5) : 0, t: now };
      const base = 560 * Math.pow(1.06, climb.n);
      click(t, 0.06);
      pop(t, base, base * 1.5, 0.2, 0.085);
      break;
    }
    case "save":
      pop(t, 420, 640, 0.18, 0.08);
      break;
    case "undo":
      pop(t, 700, 460, 0.15, 0.08);
      break;
    case "done":
      click(t, 0.07);
      pop(t, 600, 960, 0.2, 0.08);
      ting(t + 0.06, 1760, 0.09, 0.5);
      break;
    case "finish":
      pop(t, 560, 900, 0.2, 0.08);
      ting(t + 0.07, 1318.5, 0.1, 0.9);
      ting(t + 0.16, 1975.5, 0.07, 0.9);
      break;
    case "start":
      air(t, 0.05, 0.18, true);
      pop(t + 0.08, 480, 720, 0.14, 0.09);
      break;
    case "end":
      ting(t, 1046.5, 0.12, 1.2);
      ting(t + 0.35, 1568, 0.08, 1.2);
      break;
  }
}

// ---------- haptics ----------
let iosSwitch: HTMLLabelElement | null = null;
function iosTap() {
  if (typeof document === "undefined") return;
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.setAttribute("data-nohaptic", "");
    label.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    iosSwitch = label;
  }
  // Modal dialogs make the rest of the page inert, so the switch lives inside whatever is on top.
  const host = document.querySelector("dialog[open]") ?? document.querySelector("[role='dialog'][aria-modal='true']") ?? document.body;
  if (iosSwitch.parentElement !== host) host.appendChild(iosSwitch);
  iosSwitch.click();
}

export type Haptic = "light" | "medium" | "heavy" | "success" | "warning";

const RANK: Record<Haptic, number> = { light: 1, medium: 2, heavy: 3, success: 4, warning: 4 };
let last = { t: 0, r: 0 };

let explicitAt = 0;
export function haptic(h: Haptic = "light") {
  if (!enabledHaptics || typeof navigator === "undefined") return;
  // One haptic per moment. A stronger one may replace a weaker one fired a beat earlier.
  const now = performance.now();
  if (now - last.t < 60 && RANK[h] <= last.r) return;
  last = { t: now, r: RANK[h] };
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    const pattern: Record<Haptic, number | number[]> = { light: 8, medium: 14, heavy: 20, success: [10, 70, 14], warning: [16, 90, 16] };
    navigator.vibrate(pattern[h]);
    return;
  }
  // iPhone has one haptic for the web, so strength is told by rhythm: one tap,
  // or a quick double for success and warnings. Always the same, so it is learnable.
  iosTap();
  if (h === "success") setTimeout(iosTap, 80);
  if (h === "warning") setTimeout(iosTap, 120);
}

// Every sound has a matching touch, so the two always arrive together.
const DEFAULT_HAPTIC: Record<Sound, Haptic> = {
  tap: "light",
  tick: "light",
  open: "medium",
  step: "light",
  unstep: "light",
  save: "light",
  start: "medium",
  undo: "light",
  done: "success",
  finish: "success",
  end: "warning",
};

/** Sound and touch together, on the same frame. */
export function feel(s: Sound, h?: Haptic) {
  explicitAt = performance.now();
  play(s);
  haptic(h && RANK[h] > RANK[DEFAULT_HAPTIC[s]] ? h : DEFAULT_HAPTIC[s]);
}

/**
 * A light touch when a button is actually pressed, app-wide. It fires on the
 * tap itself, not when a finger lands, so scrolling past buttons never buzzes.
 * Specific moments add stronger ones.
 */
export function installTapHaptics() {
  if (typeof document === "undefined") return () => {};
  const on = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest("button, a, [role='button'], [role='tab'], select, input[type='checkbox']");
    if (!el || el.closest("[data-nohaptic]") || (el as HTMLButtonElement).disabled) return;
    // Wait one beat: if the button plays its own moment, that one is the only touch you feel.
    const at = performance.now();
    setTimeout(() => {
      if (explicitAt < at) haptic("light");
    }, 0);
  };
  document.addEventListener("click", on, { capture: true, passive: true });
  return () => document.removeEventListener("click", on, { capture: true });
}
