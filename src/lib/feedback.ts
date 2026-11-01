"use client";

/*
  NudgeMe's sound and touch. Everything is synthesised in the browser, so there
  are no files to load and nothing to pay for.

  The palette is soft mallets and small bells in one key, a singing bowl when
  the timer ends, and a warm room so they feel like real objects.

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
  The palette: soft mallets and small bells, all in D major pentatonic, so any
  two sounds that land together still sound good. Quiet by design. A gentle
  compressor glues them, and a warm room gives them space.
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
    glue.threshold.value = -20;
    glue.knee.value = 18;
    glue.ratio.value = 3;
    glue.attack.value = 0.004;
    glue.release.value = 0.2;
    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 6000;
    air.gain.value = -6;
    master = ctx.createGain();
    master.gain.value = 0.42;
    master.connect(air).connect(glue).connect(ctx.destination);
    // A warm room: decaying stereo noise, slightly darker each moment.
    const len = Math.floor(ctx.sampleRate * 1.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += ((Math.random() * 2 - 1) - lp) * (0.6 - 0.45 * (i / len));
        d[i] = lp * Math.pow(1 - i / len, 3);
      }
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.3;
    wet.connect(verb).connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function out(node: AudioNode, room = 1) {
  node.connect(master!);
  if (room > 0) {
    const send = ctx!.createGain();
    send.gain.value = room;
    node.connect(send).connect(wet!);
  }
}

function env(at: number, peak: number, attack: number, decay: number) {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

function osc(type: OscillatorType, freq: number, at: number, dur: number, into: AudioNode) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  o.connect(into);
  o.start(at);
  o.stop(at + dur + 0.05);
  return o;
}

/** A soft marimba bar: round fundamental, a quick woody overtone, felt mallet. */
function mallet(freq: number, at: number, vel = 1, decay = 0.9) {
  const body = env(at, 0.3 * vel, 0.006, decay);
  osc("sine", freq, at, decay, body);
  out(body, 0.8);
  const bar = env(at, 0.07 * vel, 0.003, 0.09);
  osc("sine", freq * 3.98, at, 0.12, bar);
  out(bar, 0.4);
  felt(at, freq * 2, 0.025 * vel);
}

/** A small glass bell: FM shimmer that settles into a pure tone. */
function bell(freq: number, at: number, vel = 1, decay = 1.6) {
  const c = ctx!;
  const tone = env(at, 0.18 * vel, 0.004, decay);
  const car = osc("sine", freq, at, decay, tone);
  const mod = c.createOscillator();
  mod.frequency.setValueAtTime(freq * 3.5, at);
  const depth = c.createGain();
  depth.gain.setValueAtTime(freq * 1.4 * vel, at);
  depth.gain.exponentialRampToValueAtTime(1, at + 0.35);
  mod.connect(depth).connect(car.frequency);
  mod.start(at);
  mod.stop(at + decay);
  out(tone, 1.1);
}

/** The touch of a felt mallet: a tiny, dark puff of noise. */
function felt(at: number, f = 1400, v = 0.03, len = 0.025) {
  const c = ctx!;
  const n = Math.floor(c.sampleRate * len);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5);
  const src = c.createBufferSource();
  src.buffer = b;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = f;
  const g = c.createGain();
  g.gain.value = v;
  src.connect(lp).connect(g);
  out(g, 0.3);
  src.start(at);
}

/** A singing bowl, softened: a few inharmonic partials with slow beating. */
function bowl(freq: number, at: number, vel = 1) {
  [
    [1, 0.12, 4],
    [2.76, 0.04, 2.8],
    [5.4, 0.015, 1.8],
  ].forEach(([ratio, vol, dec]) => {
    [0, 1.3].forEach((detune, k) => {
      const g = env(at, vol * vel * (k ? 0.7 : 1), 0.08, dec);
      osc("sine", freq * ratio + detune, at, dec + 0.08, g);
      out(g, 1.2);
    });
  });
}

// D major pentatonic, so everything is in tune with everything else.
const N = { D4: 293.66, A4: 440, B4: 493.88, D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880, B5: 987.77, D6: 1174.66, E6: 1318.51, Fs6: 1479.98, A6: 1760 };
const LADDER = [N.D5, N.E5, N.Fs5, N.A5, N.B5, N.D6, N.E6, N.Fs6];

export type Sound = "tap" | "step" | "unstep" | "done" | "finish" | "start" | "end" | "undo" | "open" | "tick" | "save";

// Subtasks ticked in a row climb the scale, so progress sounds like progress.
let climb = { n: 0, t: 0 };

export function play(s: Sound) {
  if (!enabledSound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.008;
  switch (s) {
    case "tap":
      felt(t, 1800, 0.035, 0.018);
      break;
    case "tick":
      bell(N.A6, t, 0.22, 0.25);
      break;
    case "step": {
      const now = performance.now();
      climb = { n: now - climb.t < 9000 ? Math.min(climb.n + 1, LADDER.length - 1) : 0, t: now };
      mallet(LADDER[climb.n], t, 0.85, 0.7);
      bell(LADDER[climb.n] * 2, t + 0.012, 0.18, 0.5);
      break;
    }
    case "unstep":
      mallet(N.A4, t, 0.5, 0.4);
      break;
    case "save":
      mallet(N.A5, t, 0.7, 0.6);
      bell(N.D6, t + 0.06, 0.3, 0.9);
      break;
    case "done":
      mallet(N.D5, t, 0.8, 0.8);
      mallet(N.A5, t + 0.085, 0.75, 0.9);
      bell(N.D6, t + 0.17, 0.5, 1.4);
      break;
    case "finish":
      [N.D5, N.Fs5, N.A5, N.D6].forEach((f, i) => mallet(f, t + i * 0.1, 0.8 - i * 0.05, 1.1));
      bell(N.A6, t + 0.42, 0.35, 2);
      bell(N.Fs6, t + 0.5, 0.25, 2);
      bowl(N.D4, t + 0.05, 0.8);
      break;
    case "start":
      mallet(N.D5, t, 0.6, 0.6);
      bell(N.A5, t + 0.11, 0.4, 1.2);
      break;
    case "end":
      bowl(N.A4 / 2, t, 1);
      bell(N.E6, t + 0.5, 0.3, 2.2);
      break;
    case "undo":
      mallet(N.B5, t, 0.45, 0.4);
      mallet(N.Fs5, t + 0.07, 0.4, 0.5);
      break;
    case "open":
      mallet(N.D5 / 2, t, 0.35, 0.25);
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

export function haptic(h: Haptic = "light") {
  if (!enabledHaptics || typeof navigator === "undefined") return;
  // One haptic per moment. A stronger one may replace a weaker one fired a beat earlier.
  const now = performance.now();
  if (now - last.t < 60 && RANK[h] <= last.r) return;
  last = { t: now, r: RANK[h] };
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    const pattern: Record<Haptic, number | number[]> = { light: 6, medium: 12, heavy: 20, success: [10, 60, 18], warning: [18, 80, 18] };
    navigator.vibrate(pattern[h]);
    return;
  }
  iosTap();
  if (h === "heavy") setTimeout(iosTap, 40);
  if (h === "success") setTimeout(iosTap, 90);
  if (h === "warning") setTimeout(iosTap, 110);
}

// Every sound has a matching touch, so the two always arrive together.
const DEFAULT_HAPTIC: Record<Sound, Haptic> = {
  tap: "light",
  tick: "light",
  open: "medium",
  step: "medium",
  unstep: "light",
  save: "medium",
  start: "heavy",
  undo: "light",
  done: "success",
  finish: "success",
  end: "warning",
};

/** Sound and touch together, on the same frame. */
export function feel(s: Sound, h?: Haptic) {
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
    haptic("light");
  };
  document.addEventListener("click", on, { capture: true, passive: true });
  return () => document.removeEventListener("click", on, { capture: true });
}
