"use client";

import { useEffect, useRef } from "react";

/*
  The flowing gradient. A small WebGL shader that paints iridescent silk:
  electric blue, soft blue, sky and ice bands that drift over each other, with a
  soft sheen and fine grain.

  Touch and cursor: moving over it bends the silk like a lens, and every tap
  or quick move sends out a ripple that fades as it travels. Ripples
  also arrive on their own, and they spread unevenly rather than in circles.

  Smoothness: it renders below screen resolution (silk stays soft), runs on
  one shared clock, and stops whenever it is off screen or the tab is hidden.
  Reduced motion draws one still frame and skips the ripples.

  mode 0: framed panel on Today, Rest and the guide
  mode 1: Finish
  mode 2: inside the Focus ring (deeper, so white numbers read clearly)
*/

const FRAG = `
precision mediump float;
uniform vec2 R; uniform float T; uniform float M; uniform float S;
uniform vec2 P; uniform float PA;
uniform vec4 W[6];
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<3;i++){ v+=a*n2(p); p=m*p; a*=.5; } return v; }
vec3 C(float r,float g,float b){ return vec3(r,g,b)/255.; }
vec3 silk(float x){
  // Brand blues only: electric, soft blue, sky, ice. Close in value, so it stays calm.
  vec3 c0=C(29.,77.,245.), c1=C(84.,124.,255.), c2=C(158.,186.,255.), c3=C(226.,234.,255.);
  x = fract(x) * 4.;
  float f = smoothstep(0., 1., fract(x));
  if (x < 1.) return mix(c0, c1, f);
  if (x < 2.) return mix(c1, c2, f);
  if (x < 3.) return mix(c2, c3, f);
  return mix(c3, c0, f);
}
void main(){
  vec2 uv = gl_FragCoord.xy / R;
  float asp = R.x / R.y;
  vec2 p = (uv - .5) * vec2(asp, 1.);
  float t = T * .2;

  // Ripples: a ring that travels out from each touch and fades.
  float glow = 0.;
  for (int i = 0; i < 6; i++) {
    vec4 w = W[i];
    float age = T - w.z;
    if (w.w > 0. && age > 0. && age < 2.6) {
      vec2 dv = p - w.xy;
      // Uneven spread: stretch, then let noise push the front in and out.
      float ang = atan(dv.y, dv.x);
      float d = length(dv * vec2(1., 1.4));
      d *= 1. + (n2(vec2(ang * 1.7 + w.z * 3.1, w.z)) - .5) * .9;
      d += (fbm(p * 2.4 + w.z) - .5) * .22;
      float front = d - age * .55;
      float env = exp(-front * front * 38.) * exp(-age * 1.5) * w.w;
      p += (dv / (d + .001)) * sin(front * 30.) * env * .035;
      glow += env * (.5 + .5 * sin(front * 34.));
    }
  }
  // The cursor bends the silk like a soft lens.
  vec2 mv = p - P;
  float lens = exp(-dot(mv, mv) * 7.) * PA;
  p -= mv * lens * .22;

  vec2 q = p * .9;
  q.x += .1 * sin(q.y * 1.6 + t * 1.2);
  q.y += .08 * sin(q.x * 1.3 - t);
  float g = fbm(q * .9 + vec2(t * .3, -t * .2));
  float band = q.y * .9 + q.x * .3
    + .14 * sin(q.x * 1.8 + t)
    + g * .22;
  vec3 col = silk(band * .42 + t * .12 + S);

  // Folds and sheen, so it reads as fabric catching light.
  float fold = sin(band * 6.2832 * .7 + t * .5);
  col *= .97 + .03 * fold;
  float sheen = pow(.5 + .5 * sin(band * 6.2832 * .35 - t * .6 + .6), 12.);
  col += sheen * .12;
  col += lens * .05 + glow * .08;

  if (M > 1.5) {
    // Focus ring: deeper silk behind white numbers.
    // Focus ring: settle toward electric blue so white numbers stay clear.
    col = mix(col, C(18.,54.,194.), .55);
  } else if (M > .5) {
    // Finish: a touch softer, with a light top for the headline area.
    col = mix(col, vec3(1.), smoothstep(.6, 1., uv.y) * .06);
  }

  col += (h21(gl_FragCoord.xy + floor(T * 14.)) - .5) * .03;
  gl_FragColor = vec4(col, 1.);
}`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

// One clock for every canvas, so the silk never jumps between screens.
const T0 = typeof performance !== "undefined" ? performance.now() - 40_000 : 0;
const RIPPLES = 6;

export function Art({ mode, shift = 0, className }: { mode: 0 | 1 | 2; shift?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
    if (!gl) {
      cv.style.background = "linear-gradient(135deg,#1d4df5,#547cff 40%,#9ebaff 70%,#e2eaff)";
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "R");
    const uT = gl.getUniformLocation(pr, "T");
    const uP = gl.getUniformLocation(pr, "P");
    const uPA = gl.getUniformLocation(pr, "PA");
    const uW = gl.getUniformLocation(pr, "W");
    gl.uniform1f(gl.getUniformLocation(pr, "M"), mode);
    gl.uniform1f(gl.getUniformLocation(pr, "S"), shift);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = () => {
      const area = cv.clientWidth * cv.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * (area > 250_000 ? 0.5 : 0.75);
      cv.width = Math.max(2, Math.round(cv.clientWidth * scale));
      cv.height = Math.max(2, Math.round(cv.clientHeight * scale));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(uR, cv.width, cv.height);
    };
    size();

    // Pointer state, in the shader's space: centred, height = 1.
    const waves = new Float32Array(RIPPLES * 4);
    let slot = 0;
    let target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let active = 0;
    let hover = false;
    let last = { x: 9, y: 9, at: 0 };
    const clock = () => (performance.now() - T0) / 1000;
    const toLocal = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
      const asp = r.width / r.height;
      return { x: ((e.clientX - r.left) / r.width - 0.5) * asp, y: 0.5 - (e.clientY - r.top) / r.height };
    };
    const ripple = (x: number, y: number, amp: number) => {
      waves.set([x, y, clock(), amp], slot * 4);
      slot = (slot + 1) % RIPPLES;
    };
    const onMove = (e: PointerEvent) => {
      const at = toLocal(e);
      hover = !!at && e.pointerType === "mouse";
      if (!at) return;
      target = at;
      if (!hover && e.pointerType !== "mouse" && e.buttons === 0) return;
      const now = performance.now();
      if (Math.hypot(at.x - last.x, at.y - last.y) > 0.12 && now - last.at > 140) {
        ripple(at.x, at.y, 0.55);
        last = { ...at, at: now };
      }
      kick();
    };
    const onDown = (e: PointerEvent) => {
      const at = toLocal(e);
      if (!at) return;
      target = at;
      cur.x = at.x;
      cur.y = at.y;
      ripple(at.x, at.y, 1);
      last = { ...at, at: performance.now() };
      hover = true;
      kick();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") hover = false;
    };
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
    }

    const ro = new ResizeObserver(() => {
      size();
      if (reduce) draw(performance.now());
    });
    ro.observe(cv);

    let raf = 0;
    let visible = true;
    const draw = (now: number) => {
      cur.x += (target.x - cur.x) * 0.1;
      cur.y += (target.y - cur.y) * 0.1;
      active += ((hover ? 1 : 0) - active) * 0.06;
      gl.uniform1f(uT, (now - T0) / 1000);
      gl.uniform2f(uP, cur.x, cur.y);
      gl.uniform1f(uPA, active);
      gl.uniform4fv(uW, waves);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now: number) => {
      draw(now);
      raf = visible && !document.hidden && !reduce ? requestAnimationFrame(loop) : 0;
    };
    function kick() {
      if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop);
    }
    // Ripples also arrive on their own, at uneven times and places.
    let auto = 0;
    const drift = () => {
      const r = cv.getBoundingClientRect();
      const asp = r.width / Math.max(1, r.height);
      ripple((Math.random() - 0.5) * asp * 0.9, (Math.random() - 0.5) * 0.8, 0.7 + Math.random() * 0.4);
      auto = window.setTimeout(drift, 1400 + Math.random() * 1600);
    };
    if (!reduce) auto = window.setTimeout(drift, 600 + Math.random() * 900);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      kick();
    });
    io.observe(cv);
    document.addEventListener("visibilitychange", kick);
    draw(performance.now());
    requestAnimationFrame(() => cv.classList.add("opacity-100"));
    kick();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(auto);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [mode, shift]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full opacity-0 transition-opacity duration-700 ${className ?? ""}`} />;
}
