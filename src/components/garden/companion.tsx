"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";

/**
 * Nudge: a soft clay pebble living on a mint mound.
 * Every finished task grows one thing in the garden. Nothing ever wilts.
 * Three.js loads after first paint so the screen appears instantly.
 */

type Props = {
  /** How many things have grown so far (finished tasks, all time). */
  plants: number;
  /** Bump this number to make Nudge do a happy squish. */
  cheer: number;
  /** Tilts the mood a little: "sleepy" on low energy days. */
  mood?: "happy" | "sleepy";
  className?: string;
};

// Plant slots on the mound, front to back, avoiding Nudge in the middle.
const SLOTS: [number, number, number][] = [
  // x, z, scale
  [-1.75, 0.55, 1],
  [1.85, 0.35, 1.05],
  [-1.15, 0.95, 0.75],
  [2.45, -0.25, 0.85],
  [-2.5, -0.15, 0.9],
  [1.25, 1.0, 0.7],
  [-0.6, -1.0, 0.8],
  [0.95, -1.05, 0.85],
  [-2.95, 0.55, 0.7],
  [3.0, 0.55, 0.7],
  [-1.7, -0.95, 0.75],
  [1.95, -1.1, 0.75],
  [0.15, 1.2, 0.6],
  [-3.25, -0.45, 0.6],
  [3.3, -0.55, 0.6],
];
const KINDS = ["flower", "flower", "bud", "pebble", "flower", "sprout", "flower", "bud", "pebble", "flower", "sprout", "flower", "bud", "flower", "pebble"] as const;
const PETALS = ["#c8b6ff", "#ffd27a", "#ffb3c7", "#a8e6cf", "#ffc59e", "#b9d7ff"];

export function Companion({ plants, cheer, mood = "happy", className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setPlants: (n: number, animate: boolean) => void; cheer: () => void; setMood: (m: string) => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const firstPlants = useRef(plants);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const el = host.current;
      if (!el) return;
      let THREE: typeof T;
      try {
        THREE = await import("three");
      } catch {
        setFailed(true);
        return;
      }
      if (disposed) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let renderer: T.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 2.9, 9.2);
      camera.lookAt(0, 0.75, 0);

      // Light: warm sun, lilac fill, peach sky over mint ground.
      scene.add(new THREE.HemisphereLight(0xfff0e8, 0xcdeedd, 1.25));
      const sun = new THREE.DirectionalLight(0xfff1e0, 2.4);
      sun.position.set(3.5, 7, 5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -5;
      sun.shadow.camera.right = 5;
      sun.shadow.camera.top = 5;
      sun.shadow.camera.bottom = -5;
      sun.shadow.radius = 6;
      sun.shadow.bias = -0.0008;
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xd9ccff, 0.8);
      fill.position.set(-5, 2, 3);
      scene.add(fill);

      const clay = (color: string, rough = 0.6, sheen = 0.9) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: rough,
          sheen,
          sheenRoughness: 0.6,
          sheenColor: new THREE.Color("#fff4ee"),
          clearcoat: 0.25,
          clearcoatRoughness: 0.5,
        });

      // The mound.
      const moundGeo = new THREE.SphereGeometry(1, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2);
      const mound = new THREE.Mesh(moundGeo, clay("#b7e3c9", 0.7, 0.5));
      mound.scale.set(4.6, 0.42, 2.15);
      mound.position.y = -0.3;
      mound.receiveShadow = true;
      scene.add(mound);

      // Nudge.
      const nudge = new THREE.Group();
      scene.add(nudge);
      const body = new THREE.Group();
      nudge.add(body);
      const bodyGeo = new THREE.SphereGeometry(1, 96, 64);
      const pos = bodyGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < -0.35) pos.setY(i, -0.35 + (y + 0.35) * 0.25); // sits flat
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setXYZ(i, x * (1 + 0.05 * Math.max(0, -y)), pos.getY(i), z);
      }
      bodyGeo.computeVertexNormals();
      const SX = 1.3, SY = 1.08, SZ = 1.12;
      const shell = new THREE.Mesh(bodyGeo, clay("#eba489", 0.55, 1));
      shell.scale.set(SX, SY, SZ);
      shell.castShadow = true;
      body.add(shell);
      body.position.y = 0.48;
      const onSurface = (dx: number, dy: number, dz: number, out = 0.0) => {
        const v = new THREE.Vector3(dx, dy, dz).normalize();
        return new THREE.Vector3(v.x * SX * (1 + out), v.y * SY * (1 + out), v.z * SZ * (1 + out));
      };

      const ink = new THREE.MeshPhysicalMaterial({ color: "#1d1420", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 });
      const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
      const eyes: T.Group[] = [];
      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 24), ink);
        eye.scale.set(0.9, 1.15, 0.55);
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), white);
        glint.position.set(0.03, 0.05, 0.06);
        g.add(eye, glint);
        g.position.copy(onSurface(side * 0.33, 0.2, 0.92));
        g.lookAt(g.position.clone().multiply(new THREE.Vector3(1.4, 1.2, 3)));
        body.add(g);
        eyes.push(g);
      }
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.026, 12, 32, Math.PI), ink);
      smile.position.copy(onSurface(0, 0.02, 1, 0.035));
      smile.rotation.z = Math.PI;
      smile.rotation.x = -0.12;
      body.add(smile);
      const blushMat = new THREE.MeshBasicMaterial({ color: "#ff8fa3", transparent: true, opacity: 0.7 });
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), blushMat);
        b.scale.set(1.3, 0.75, 0.25);
        b.position.copy(onSurface(side * 0.6, 0.02, 0.8, 0.005));
        b.lookAt(b.position.clone().multiplyScalar(2));
        body.add(b);
      }
      // Leaf sprout on top.
      const sprout = new THREE.Group();
      const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.18, 0), new THREE.Vector3(0.1, 0.32, 0)]);
      const leafMat = clay("#86cfa6", 0.55, 0.8);
      sprout.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 12, 0.03, 8), leafMat));
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), leafMat);
      leaf.scale.set(1.3, 0.28, 0.6);
      leaf.position.set(0.27, 0.36, 0);
      leaf.rotation.z = 0.5;
      sprout.add(leaf);
      sprout.position.set(0.05, SY * 0.96, 0);
      body.add(sprout);

      // Garden pieces.
      const stemMat = clay("#86c9a3", 0.6, 0.7);
      const makePlant = (i: number): T.Group => {
        const g = new THREE.Group();
        const kind = KINDS[i % KINDS.length];
        const petal = PETALS[i % PETALS.length];
        if (kind === "flower" || kind === "bud") {
          const h = kind === "flower" ? 0.9 : 0.6;
          const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05 * (i % 2 ? 1 : -1), h * 0.5, 0), new THREE.Vector3(0, h, 0)]);
          g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.04, 8), stemMat));
          const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), stemMat);
          lf.scale.set(1.4, 0.3, 0.6);
          lf.position.set(0.15, h * 0.35, 0);
          lf.rotation.z = 0.5;
          g.add(lf);
          if (kind === "flower") {
            const head = new THREE.Group();
            const pm = clay(petal, 0.5, 1);
            for (let k = 0; k < 6; k++) {
              const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), pm);
              const a = (k / 6) * Math.PI * 2;
              p.scale.set(1.25, 0.42, 0.8);
              p.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
              p.rotation.y = -a;
              p.castShadow = true;
              head.add(p);
            }
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), clay("#ffd166", 0.45, 1));
            center.position.y = 0.05;
            head.add(center);
            head.position.y = h;
            head.rotation.x = 1.05;
            g.add(head);
          } else {
            const bud = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), clay(petal, 0.5, 1));
            bud.scale.set(0.85, 1.3, 0.85);
            bud.position.y = h + 0.08;
            bud.castShadow = true;
            g.add(bud);
          }
        } else if (kind === "pebble") {
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), clay(i % 2 ? "#d9cdf5" : "#f4d6c6", 0.6, 0.8));
          p.scale.set(1.3, 0.75, 1);
          p.position.y = 0.08;
          p.castShadow = true;
          g.add(p);
          const p2 = p.clone();
          p2.scale.multiplyScalar(0.55);
          p2.position.set(0.28, 0.04, 0.1);
          g.add(p2);
        } else {
          for (let k = 0; k < 3; k++) {
            const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), stemMat);
            l.scale.set(1.3, 0.3, 0.55);
            l.position.set(Math.cos(k * 2.1) * 0.1, 0.15 + k * 0.05, Math.sin(k * 2.1) * 0.1);
            l.rotation.set(0.3, -k * 2.1, 0.7);
            l.castShadow = true;
            g.add(l);
          }
        }
        const [x, z, s] = SLOTS[i % SLOTS.length];
        const y = -0.3 + 0.42 * Math.sqrt(Math.max(0, 1 - (x / 4.6) ** 2 - (z / 2.15) ** 2));
        g.position.set(x, y - 0.02, z);
        g.rotation.y = kind === "flower" || kind === "bud" ? (x > 0 ? -0.25 : 0.25) : (i * 1.7) % Math.PI;
        g.userData.base = s * 1.25;
        g.scale.setScalar(s * 1.25);
        return g;
      };

      const garden = new THREE.Group();
      scene.add(garden);
      const growing: { g: T.Group; t0: number }[] = [];
      const setPlants = (n: number, animate: boolean) => {
        const target = Math.min(n, SLOTS.length);
        while (garden.children.length > target) garden.remove(garden.children[garden.children.length - 1]);
        while (garden.children.length < target) {
          const g = makePlant(garden.children.length);
          garden.add(g);
          if (animate && !reduce) {
            g.scale.setScalar(0.001);
            growing.push({ g, t0: performance.now() });
          }
        }
        if (reduce) render();
      };

      // Sizing.
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Keep the whole mound in view on narrow phones.
        camera.position.z = w / h < 1.2 ? 9.2 + (1.2 - w / h) * 5 : 9.2;
        camera.updateProjectionMatrix();
        if (reduce) render();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // Pointer: Nudge leans toward you.
      const look = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        look.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 1.5)));
        look.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.5)));
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      let cheerAt = -1e9;
      let sleepy = 0;
      let nextBlink = performance.now() + 2000;
      let blinkAt = -1;
      const render = () => renderer.render(scene, camera);

      let raf = 0;
      let last = 0;
      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
      io.observe(el);
      // 30 frames a second is plenty for a gentle scene and saves battery.
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (document.hidden || !visible || now - last < 32) return;
        last = now;
        const t = now / 1000;
        // Breathe.
        const br = Math.sin(t * 1.7) * 0.022 * (1 - sleepy * 0.4);
        let sy = 1 + br, sxz = 1 - br * 0.6;
        // Happy squish after a win.
        const c = (now - cheerAt) / 1000;
        if (c < 1.1) {
          const k = Math.exp(-c * 4.5) * Math.sin(c * 16);
          sy *= 1 - k * 0.22;
          sxz *= 1 + k * 0.16;
          nudge.position.y = Math.max(0, Math.sin(Math.min(1, c * 2.2) * Math.PI)) * 0.35;
        } else nudge.position.y = 0;
        body.scale.set(sxz, sy, sxz);
        // Lean toward the pointer.
        nudge.rotation.y += (look.x * 0.45 - nudge.rotation.y) * 0.06;
        nudge.rotation.x += (look.y * 0.12 - nudge.rotation.x) * 0.06;
        sprout.rotation.z = Math.sin(t * 1.3) * 0.08 - nudge.rotation.y * 0.2;
        // Blink.
        if (now > nextBlink) {
          blinkAt = now;
          nextBlink = now + 2600 + Math.random() * 3200;
        }
        const b = (now - blinkAt) / 140;
        const open = b >= 0 && b < 1 ? Math.abs(1 - 2 * b) : 1;
        const lid = Math.max(0.08, open) * (1 - sleepy * 0.45);
        eyes.forEach((e) => (e.scale.y = lid));
        // Grow new plants with a springy pop.
        for (let i = growing.length - 1; i >= 0; i--) {
          const { g, t0 } = growing[i];
          const p = (now - t0) / 900;
          const base = g.userData.base as number;
          if (p >= 1) {
            g.scale.setScalar(base);
            growing.splice(i, 1);
          } else {
            const s = 1 - Math.exp(-p * 6) * Math.cos(p * 11);
            g.scale.set(base * s, base * Math.max(0.001, s * (1 + Math.sin(p * Math.PI) * 0.15)), base * s);
          }
        }
        // Plants sway a touch.
        garden.children.forEach((g, i) => (g.rotation.z = Math.sin(t * 1.1 + i) * 0.03));
        render();
      };

      api.current = {
        setPlants,
        cheer: () => {
          cheerAt = performance.now();
          if (reduce) render();
        },
        setMood: (m) => {
          sleepy = m === "sleepy" ? 1 : 0;
          if (reduce) render();
        },
      };
      setPlants(firstPlants.current, false);
      resize();
      if (reduce) render();
      else raf = requestAnimationFrame(loop);
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        renderer.dispose();
        scene.traverse((o) => {
          const m = o as T.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
        renderer.domElement.remove();
        api.current = null;
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    api.current?.setPlants(plants, true);
  }, [plants]);
  const lastCheer = useRef(cheer);
  useEffect(() => {
    if (cheer !== lastCheer.current) api.current?.cheer();
    lastCheer.current = cheer;
  }, [cheer]);
  useEffect(() => {
    api.current?.setMood(mood);
  }, [mood, ready]);

  return (
    <div ref={host} className={className} role="img" aria-label={`Nudge, your clay companion, in a garden with ${plants} ${plants === 1 ? "thing" : "things"} grown`}>
      {(failed || !ready) && <FallbackNudge />}
    </div>
  );
}

/** Flat fallback when 3D is not available. Same character, simple shapes. */
export function FallbackNudge({ className = "mt-6" }: { className?: string }) {
  return (
    <div className={`relative mx-auto h-[150px] w-[220px] max-h-full ${className}`}>
      <div className="absolute inset-x-[-40px] bottom-0 h-10 rounded-[50%] bg-[#cfe8da]" />
      <div className="nm-float absolute bottom-4 left-1/2 h-[120px] w-[150px] -translate-x-1/2 rounded-[50%_50%_44%_44%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_35%_30%,#f7c2ad,#e9a084_60%,#d98c70)] shadow-[0_14px_20px_-10px_rgb(140_70_60/0.4)]">
        <span className="absolute top-[40%] left-[32%] h-4 w-3 rounded-full bg-[#1d1420]" />
        <span className="absolute top-[40%] right-[32%] h-4 w-3 rounded-full bg-[#1d1420]" />
        <span className="absolute top-[56%] left-1/2 h-3 w-6 -translate-x-1/2 rounded-b-full border-b-[3px] border-[#1d1420]" />
        <span className="absolute top-[52%] left-[18%] h-2.5 w-5 rounded-full bg-[#ff8fa3]/60" />
        <span className="absolute top-[52%] right-[18%] h-2.5 w-5 rounded-full bg-[#ff8fa3]/60" />
      </div>
    </div>
  );
}
