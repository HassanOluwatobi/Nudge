"use client";

import { useEffect, useRef } from "react";

/*
  The painted art. A small WebGL shader: flowing domain-warped paint, a ribbon
  lit across its width, edges that dissolve into printed stipple, fine grain.

  Smoothness: it renders below screen resolution (it is paint, so it stays
  soft), runs on one steady clock, and stops whenever it is off screen or the
  tab is hidden. Reduced motion draws a single still frame.

  mode 0: framed panel on Today
  mode 1: full screen Finish
  mode 2: inside the Focus ring
*/

const FRAG = `
precision mediump float;
uniform vec2 R; uniform float T; uniform float M; uniform float S;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<4;i++){ v+=a*n2(p); p=m*p; a*=.5; } return v; }
vec3 C(float r,float g,float b){ return vec3(r,g,b)/255.; }
vec3 ramp(float x){
  vec3 a=C(25.,211.,230.), b=C(94.,240.,207.), c=C(195.,239.,110.), d=C(255.,185.,138.), e=C(255.,155.,214.);
  x=fract(x)*4.;
  if(x<1.) return mix(a,b,x); if(x<2.) return mix(b,c,x-1.); if(x<3.) return mix(c,d,x-2.); return mix(d,e,x-3.);
}
void main(){
  vec2 uv = gl_FragCoord.xy / R;
  float asp = R.x / R.y;
  vec2 p = vec2(uv.x*asp, uv.y) * (M > .5 && M < 1.5 ? 1.3 : 2.0);
  float t = T * .03;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) - t));
  vec2 r = vec2(fbm(p + 3.*q + vec2(1.7,9.2) + t*1.3), fbm(p + 3.*q + vec2(8.3,2.8) - t));
  float f = fbm(p + 2.6*r);

  vec3 navy=C(6.,11.,43.), deep=C(16.,26.,77.), blue=C(29.,77.,245.), cyan=C(25.,211.,230.), lilac=C(185.,162.,255.), lime=C(195.,239.,110.), pink=C(255.,155.,214.);
  vec3 col;
  if (M < .5) {
    col = mix(deep, blue, smoothstep(.22, .78, f));
    col = mix(col, cyan, smoothstep(.5, .92, r.x) * .6);
    col = mix(col, lilac, smoothstep(.62, 1., q.y) * .35);
    col = mix(col, lime, smoothstep(.72, 1., r.y) * smoothstep(.5, 0., uv.y) * .35);
  } else if (M < 1.5) {
    col = mix(navy, deep, smoothstep(.1, .6, f));
    col = mix(col, blue, smoothstep(.28, .72, f) * smoothstep(.2, .95, uv.y) * .95);
    col = mix(col, cyan, smoothstep(.62, .98, r.x) * .35 * smoothstep(.3, .9, uv.y));
    col = mix(col, pink, smoothstep(.7, 1., q.x) * .25 * smoothstep(.5, 1., uv.y));
  } else {
    col = mix(deep, blue, smoothstep(.3, .85, f) * .8);
    col = mix(col, cyan, smoothstep(.6, .95, r.x) * .4);
  }

  float x = uv.x;
  float yc = M < .5
    ? .50 + .22*sin(x*3.1 + .5 + T*.11) + .05*sin(x*7. - T*.08) + (q.x-.5)*.08
    : M < 1.5
      ? .74 + .12*sin(x*2.4 + 1.2 + T*.1) + .04*sin(x*6.3 - T*.07) + (q.x-.5)*.05
      : .5 + .18*sin(x*3.4 + T*.16) + (q.x-.5)*.08;
  float tw = abs(cos(x*2.3 + .4 + T*.07));
  float wid = (M < .5 ? .13 : M < 1.5 ? .085 : .12) * (.3 + .7*tw);
  float d = (uv.y - yc) / wid;
  float band = 1. - smoothstep(.82, 1., abs(d));
  vec3 bc = ramp(x*.9 + .05 + S + .06*sin(T*.05));
  float shade = .6 + .4*(1. - d*d);
  float sheen = exp(-pow((d + .42)*3., 2.)) * .6 * tw;
  vec3 rib = bc*shade + sheen;
  rib = mix(rib*.62 + deep*.15, rib, tw);
  col += bc * exp(-abs(d)*1.5) * .16 * (1. - band);
  col = mix(col, rib, band);

  float px = 3.0;
  vec2 cell = floor(gl_FragCoord.xy / px);
  float hsh = h21(cell);
  vec2 jit = vec2(h21(cell + 17.3), h21(cell + 41.9)) - .5;
  vec2 cp = fract(gl_FragCoord.xy / px) - .5 - jit * .45;
  float rad = .17 + .14 * h21(cell + 7.7);
  float dotm = 1. - smoothstep(rad, rad + .12, length(cp));
  float edge = pow(smoothstep(3.0, 1., abs(d)), 1.6) * (1. - band) * smoothstep(.3, .8, fbm(p*3.5 + t*3.));
  col = mix(col, bc*1.05 + .06, dotm * step(hsh, edge * .85));
  col = mix(col, vec3(1.), dotm * step(hsh, sheen * band * .45) * .7);
  col += dotm * smoothstep(.62, .9, f) * .05;
  col += (h21(gl_FragCoord.xy + floor(T*12.)) - .5) * .05;
  gl_FragColor = vec4(col, 1.);
}`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

// One clock for every canvas, so art never jumps between screens.
const T0 = typeof performance !== "undefined" ? performance.now() - 40_000 : 0;

export function Art({ mode, shift = 0, className }: { mode: 0 | 1 | 2; shift?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
    if (!gl) {
      cv.style.background = mode === 1 ? "#1d4df5" : "#101a4d";
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
    gl.uniform1f(gl.getUniformLocation(pr, "M"), mode);
    gl.uniform1f(gl.getUniformLocation(pr, "S"), shift);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Paint stays soft, so render under native resolution. Big canvases go lower.
    const size = () => {
      const area = cv.clientWidth * cv.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * (area > 250_000 ? 0.55 : 0.8);
      cv.width = Math.max(2, Math.round(cv.clientWidth * scale));
      cv.height = Math.max(2, Math.round(cv.clientHeight * scale));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(uR, cv.width, cv.height);
    };
    size();
    const ro = new ResizeObserver(() => {
      size();
      if (reduce) draw(performance.now());
    });
    ro.observe(cv);

    let raf = 0;
    let visible = true;
    const draw = (now: number) => {
      gl.uniform1f(uT, (now - T0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now: number) => {
      draw(now);
      raf = visible && !document.hidden && !reduce ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };
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
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", kick);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [mode, shift]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full opacity-0 transition-opacity duration-700 ${className ?? ""}`} />;
}
