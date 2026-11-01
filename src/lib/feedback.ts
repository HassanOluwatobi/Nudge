"use client";

/*
  NudgeMe's sound and touch. Everything is synthesised in the browser, so there
  are no files to load and nothing to pay for.

  The palette is soft and wooden on purpose: a kalimba pluck for wins, a small
  wooden tap for steps, a singing bowl when the timer ends. A short room reverb
  makes them feel like real objects instead of computer beeps.

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
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    // A small, warm room: decaying stereo noise as an impulse response.
    const len = Math.floor(ctx.sampleRate * 1.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 4200;
    wet = ctx.createGain();
    wet.gain.value = 0.22;
    wet.connect(tone).connect(verb).connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function out(node: AudioNode) {
  node.connect(master!);
  node.connect(wet!);
}

/** A kalimba tine: warm fundamental, a quick bright overtone, a tiny attack click. */
function pluck(freq: number, at: number, vel = 1) {
  const c = ctx!;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.32 * vel, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, at);
  o.connect(g);
  out(g);
  o.start(at);
  o.stop(at + 1.6);

  const g2 = c.createGain();
  g2.gain.setValueAtTime(0, at);
  g2.gain.linearRampToValueAtTime(0.1 * vel, at + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(freq * 5.93, at);
  o2.connect(g2);
  out(g2);
  o2.start(at);
  o2.stop(at + 0.2);

  click(at, 3200, 0.05 * vel);
}

/** A soft filtered noise transient, the "touch" of a finger or mallet. */
function click(at: number, f = 2400, v = 0.08, len = 0.03) {
  const c = ctx!;
  const n = Math.floor(c.sampleRate * len);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const s = c.createBufferSource();
  s.buffer = b;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = f;
  bp.Q.value = 1.4;
  const g = c.createGain();
  g.gain.value = v;
  s.connect(bp).connect(g);
  out(g);
  s.start(at);
}

/** A small wooden tap with a little pitch drop. */
function wood(freq: number, at: number, vel = 1) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq * 1.5, at);
  o.frequency.exponentialRampToValueAtTime(freq, at + 0.03);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.22 * vel, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  o.connect(g);
  out(g);
  o.start(at);
  o.stop(at + 0.16);
  click(at, 1800, 0.06 * vel, 0.02);
}

/** A singing bowl: inharmonic partials, slow beating, a long gentle tail. */
function bowl(freq: number, at: number) {
  const c = ctx!;
  [
    [1, 0.22, 4.5],
    [2.76, 0.08, 3.2],
    [5.4, 0.04, 2.2],
  ].forEach(([ratio, vol, dec]) => {
    [0, 1.6].forEach((detune, k) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * ratio + detune;
      const g = c.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol * (k ? 0.7 : 1), at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dec);
      o.connect(g);
      out(g);
      o.start(at);
      o.stop(at + dec + 0.1);
    });
  });
  click(at, 900, 0.05, 0.05);
}

// Notes: a bright major pentatonic around E5.
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G4: 392 };

export type Sound = "tap" | "step" | "unstep" | "done" | "finish" | "start" | "end" | "undo" | "open" | "tick" | "save";

export function play(s: Sound) {
  if (!enabledSound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (s) {
    case "tap":
      wood(1400, t, 0.35);
      break;
    case "tick":
      click(t, 3600, 0.035, 0.012);
      break;
    case "step":
      wood(880, t, 0.8);
      pluck(N.E6, t + 0.03, 0.35);
      break;
    case "unstep":
      wood(620, t, 0.6);
      break;
    case "save":
      pluck(N.G5, t, 0.6);
      pluck(N.C6, t + 0.07, 0.5);
      break;
    case "done":
      pluck(N.E5, t, 0.8);
      pluck(N.G5, t + 0.07, 0.75);
      pluck(N.B5, t + 0.14, 0.7);
      pluck(N.E6, t + 0.24, 0.5);
      break;
    case "finish":
      [N.C5, N.E5, N.G5, N.B5, N.E6].forEach((f, i) => pluck(f, t + i * 0.09, 0.8 - i * 0.07));
      bowl(N.C5 / 2, t + 0.05);
      break;
    case "start":
      pluck(N.A5, t, 0.6);
      pluck(N.E6, t + 0.1, 0.5);
      break;
    case "end":
      bowl(N.G4, t);
      pluck(N.D6, t + 0.6, 0.4);
      break;
    case "undo":
      pluck(N.B5, t, 0.5);
      pluck(N.E5, t + 0.08, 0.45);
      break;
    case "open":
      wood(1100, t, 0.25);
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
    label.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

export type Haptic = "light" | "medium" | "success" | "warning";

export function haptic(h: Haptic = "light") {
  if (!enabledHaptics || typeof navigator === "undefined") return;
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    navigator.vibrate(h === "light" ? 8 : h === "medium" ? 16 : h === "success" ? [12, 60, 24] : [20, 40, 20]);
    return;
  }
  iosTap();
  if (h === "success" || h === "warning") setTimeout(iosTap, 90);
}

/** Sound and touch together, on the same frame. */
export function feel(s: Sound, h?: Haptic) {
  play(s);
  if (h) haptic(h);
}
