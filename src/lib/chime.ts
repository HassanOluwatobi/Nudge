// A soft two-note chime made in the browser. No sound files to download.
export function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [659.25, 987.77].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.5);
    });
    setTimeout(() => ctx.close(), 2200);
  } catch {}
  try {
    navigator.vibrate?.([120, 80, 120]);
  } catch {}
}
