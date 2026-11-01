"use client";

import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Check, Lock, Moon, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AiSteps, Capture, Devices, IdeasBack, OneThing, Reminders, Timer } from "@/components/app/guide";
import { Petals } from "@/components/app/petals";

/*
  The Shrink my day landing page.

  The idea in one picture: a head full of loose tasks floats over the blue
  silk. Scroll, and they pull together and shrink away until one task is left,
  with its first small step. That is what the app does every day.
*/

const X_URL = "https://x.com/Art_sassin";

// Flat buttons, like the best product sites: solid fill, medium weight, colour shifts on hover. No shadows.
const BTN = "group inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[16px] font-medium text-white transition-colors duration-200 hover:bg-[#1c2552] active:bg-[#0f1638]";
const BTN_SM = "inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#1c2552]";
const BTN_GHOST = "inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-medium text-ink ring-1 ring-line transition-colors duration-200 hover:bg-[#f7f4ec]";
const SUPPORT_URL = "https://selar.com/showlove/hassanx";

/*
  Painted skies. Soft layered gradients with a fine grain on top, so they never
  band. The light drifts slowly using transform only, which stays smooth on any
  phone. Each section gets its own sky, the way a day changes colour.
*/
type SkyName = "dawn" | "sunset" | "lilac" | "mint" | "lime" | "sky" | "night";
const SKIES: Record<SkyName, { base: string; a: string; b: string; c: string; clouds: boolean }> = {
  dawn: { base: "linear-gradient(180deg,#a9c4ff 0%,#cfc6ff 42%,#ffd3c0 78%,#ffe6d6 100%)", a: "#7fa6ff", b: "#ffb08a", c: "#ff9bd6", clouds: true },
  sunset: { base: "linear-gradient(165deg,#ffc89e 0%,#ff9a7a 45%,#ff9bd0 100%)", a: "#ffdf9e", b: "#ff6b4a", c: "#b9a2ff", clouds: true },
  lilac: { base: "linear-gradient(160deg,#d9ccff 0%,#b9a2ff 50%,#9cb8ff 100%)", a: "#ffc6ec", b: "#7f8cff", c: "#e8ddff", clouds: false },
  mint: { base: "linear-gradient(160deg,#d6fbef 0%,#8ff0d6 50%,#a9e6f5 100%)", a: "#e9ffb8", b: "#4fd9c4", c: "#bfe3ff", clouds: false },
  lime: { base: "linear-gradient(160deg,#f1fbcf 0%,#cdef7f 55%,#a6e3b0 100%)", a: "#fff3b0", b: "#9bd65a", c: "#d2f5e3", clouds: false },
  sky: { base: "linear-gradient(180deg,#6f9dff 0%,#9cc0ff 50%,#dce9ff 100%)", a: "#4f7dff", b: "#c7dcff", c: "#e8ddff", clouds: true },
  night: { base: "linear-gradient(180deg,#060b2b 0%,#0b1440 100%)", a: "#1d4df5", b: "#19d3e6", c: "#b9a2ff", clouds: false },
};

export function Sky({ name, className = "" }: { name: SkyName; className?: string }) {
  const k = SKIES[name];
  const glow = name === "night" ? 0.55 : 0.85;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: k.base }}>
      <div className="sky-drift absolute -left-[20%] -top-[30%] h-[90%] w-[70%] rounded-full" style={{ background: `radial-gradient(closest-side, ${k.a}, transparent)`, opacity: glow }} />
      <div className="sky-drift-b absolute -bottom-[35%] -right-[15%] h-[100%] w-[75%] rounded-full" style={{ background: `radial-gradient(closest-side, ${k.b}, transparent)`, opacity: glow }} />
      <div className="sky-drift-c absolute left-[35%] top-[30%] h-[60%] w-[50%] rounded-full" style={{ background: `radial-gradient(closest-side, ${k.c}, transparent)`, opacity: glow * 0.7 }} />
      {k.clouds && (
        <>
          <Cloud className="cloud-a -bottom-[6%] -left-[6%] w-[46%] max-w-[560px]" />
          <Cloud className="cloud-b right-[-8%] top-[8%] w-[30%] max-w-[380px] opacity-80" />
        </>
      )}
      <div className="sky-grain absolute inset-0" />
    </div>
  );
}

/** A soft cloud made of overlapping round puffs. */
function Cloud({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute aspect-[2.4/1] ${className}`}>
      {[
        [8, 46, 34],
        [26, 22, 44],
        [50, 12, 46],
        [70, 34, 36],
        [36, 50, 40],
        [62, 54, 34],
      ].map(([x, y, s], i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${s}%`,
            aspectRatio: "1",
            background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.98), rgba(255,255,255,0.85) 45%, rgba(236,236,255,0.55) 70%, rgba(255,255,255,0) 72%)",
          }}
        />
      ))}
    </div>
  );
}

/** The app, in a window, the way people will see it. A soft outer frame and hairlines, no heavy shadow. */
function Window({ children, title = "Shrink my day", className = "", bleed = false }: { children: React.ReactNode; title?: string; className?: string; bleed?: boolean }) {
  return (
    <div className={`bg-white/45 p-[6px] ring-1 ring-white/80 backdrop-blur-sm ${bleed ? "rounded-t-[24px] pb-0" : "rounded-[24px]"} ${className}`}>
      <div className={`overflow-hidden bg-[#fbf9f4] ring-1 ring-black/[0.07] ${bleed ? "rounded-t-[18px]" : "rounded-[18px]"}`}>
        <div className="flex h-9 items-center gap-[7px] border-b border-black/[0.06] px-3.5">
          <span className="size-[11px] rounded-full bg-[#ff5f57] ring-1 ring-black/10" />
          <span className="size-[11px] rounded-full bg-[#febc2e] ring-1 ring-black/10" />
          <span className="size-[11px] rounded-full bg-[#28c840] ring-1 ring-black/10" />
          <span className="mx-auto flex items-center gap-1.5 rounded-md px-2 py-0.5 pr-14 text-[12px] text-ink-3">
            <Lock className="size-3" strokeWidth={2.25} /> {title}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Logo({ className = "size-7" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="" className={className} />;
}

const SHOTS = [
  { key: "plan", tab: "Put it all down", alt: "The Plan screen in Shrink my day, with this week's tasks and someday ideas" },
  { key: "home", tab: "Pick one thing", alt: "The Home screen in Shrink my day, showing one task and its next step" },
  { key: "focus", tab: "Do one step", alt: "The Focus screen in Shrink my day, with one step and a timer" },
] as const;

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[46px] bg-[#101219] p-[7px] ring-1 ring-black/20">
      <div className="relative overflow-hidden rounded-[39px] bg-paper">
        <div className="relative flex h-[40px] items-center justify-between px-[26px] pt-[2px] text-[13px] font-semibold text-ink">
          <span className="tabular-nums">9:41</span>
          <span className="absolute left-1/2 top-[9px] h-[24px] w-[78px] -translate-x-1/2 rounded-full bg-[#101219]" />
          <span className="flex items-center gap-[5px]">
            <svg viewBox="0 0 18 12" className="h-[10px] w-[15px]" fill="currentColor" aria-hidden>
              <rect x="0" y="8" width="3" height="4" rx="1" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
              <rect x="10" y="3" width="3" height="9" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            <svg viewBox="0 0 16 12" className="h-[10px] w-[14px]" fill="currentColor" aria-hidden>
              <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .5 3.4l1.3 1.3A8.7 8.7 0 0 1 8 2.2Zm0 3.7c1.4 0 2.7.5 3.6 1.4l1.3-1.3A7 7 0 0 0 8 4a7 7 0 0 0-4.9 2l1.3 1.3c1-.9 2.2-1.4 3.6-1.4Zm0 3.6c.5 0 1 .2 1.3.6L8 11.4 6.7 10c.4-.3.8-.5 1.3-.5Z" />
            </svg>
            <span className="relative h-[11px] w-[22px] rounded-[3.5px] border border-ink/40 p-[1.5px]">
              <span className="block h-full w-[75%] rounded-[1.5px] bg-ink" />
            </span>
          </span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={390} height={844} className="block h-auto w-full" />
      </div>
    </div>
  );
}

function Hero() {
  const [on, setOn] = useState(1);
  const [held, setHeld] = useState(false);
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: stage, offset: ["start end", "start 0.35"] });
  const lift = useTransform(p, [0, 1], [0.94, 1]);
  useEffect(() => {
    if (held || reduce) return;
    const t = setTimeout(() => setOn((v) => (v + 1) % SHOTS.length), 5200);
    return () => clearTimeout(t);
  }, [on, held, reduce]);
  const pick = (i: number) => (setOn(i), setHeld(true));

  return (
    <section className="relative px-3 pt-32 sm:px-4 sm:pt-40">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[54px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[88px] lg:text-[100px]"
        >
          Too much on
          <br />
          your mind?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-[33ch] text-[18px] leading-[1.45] text-ink-2 sm:text-[20px]"
        >
          Shrink my day is a calm to-do list for ADHD brains. Put it all down, pick one thing, and start with a tiny step.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }} className="mt-8 flex flex-col items-center gap-3">
          <a href="/app" className={BTN}>
            Start now, it&apos;s free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <span className="text-[14px] text-ink-3">Opens in your browser. No sign up.</span>
        </motion.div>
      </div>

      {/* Tabs, like flicking between screens of the app */}
      <div className="mt-14 flex justify-center sm:mt-16">
        <div role="tablist" aria-label="See the app" className="flex rounded-full bg-white p-1 ring-1 ring-line">
          {SHOTS.map((t, i) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={on === i}
              onClick={() => pick(i)}
              className={`relative h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors sm:h-10 sm:px-5 sm:text-[14px] ${on === i ? "text-white" : "text-ink-2 hover:text-ink"}`}
            >
              {on === i && <motion.span layoutId="hero-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
              <span className="relative">{t.tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The product, on its own patch of sky */}
      <motion.div ref={stage} style={reduce ? {} : { scale: lift }} className="relative mx-auto mt-6 max-w-[1240px] origin-top overflow-hidden rounded-[24px] sm:rounded-[32px]">
        <Sky name="dawn" />
        {/* Desktop: the full app in a window, with the phone beside it */}
        <div className="relative hidden pl-[5%] pr-[17%] pt-[5%] md:block">
          <div className="relative">
            <Window title="shrinkmyday.com" bleed>
              <div className="relative aspect-[2560/1300] bg-paper">
                {SHOTS.map((t, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={t.key}
                    src={`/landing/desk-${t.key}.webp`}
                    alt={i === on ? t.alt : ""}
                    aria-hidden={i !== on}
                    width={1280}
                    height={650}
                    loading={i === 1 ? "eager" : "lazy"}
                    className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${i === on ? "opacity-100" : "opacity-0"}`}
                  />
                ))}
              </div>
            </Window>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, type: "spring", bounce: 0.15, duration: 0.9 }}
              className="absolute -right-[19%] bottom-[-12%] w-[23%] min-w-[180px] max-w-[260px]"
            >
              <div className="relative">
                {SHOTS.map((t, i) => (
                  <div key={t.key} className={`${i === 0 ? "relative" : "absolute inset-0"} transition-opacity duration-500 ${i === on ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== on}>
                    <Phone src={`/landing/mob-${t.key}.webp`} alt={i === on ? t.alt : ""} />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
        {/* Phone screens: just the phone, big and clear */}
        <div className="relative flex justify-center px-6 pt-10 md:hidden">
          <div className="relative w-[72%] max-w-[300px] translate-y-[8%]">
            {SHOTS.map((t, i) => (
              <div key={t.key} className={`${i === 0 ? "relative" : "absolute inset-0"} transition-opacity duration-500 ${i === on ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== on}>
                <Phone src={`/landing/mob-${t.key}.webp`} alt={i === on ? t.alt : ""} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${solid ? "bg-paper/80 shadow-[0_1px_0_rgba(6,11,43,0.06)] backdrop-blur-xl" : "bg-transparent"}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:grid sm:h-[72px] sm:grid-cols-[1fr_auto_1fr] sm:px-6">
        <a href="#" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: "smooth" }))} className="flex items-center gap-2 justify-self-start">
          <Logo className="size-6 sm:size-7" />
          <span className="whitespace-nowrap font-serif text-[18px] tracking-[-0.01em] text-ink sm:text-[21px]">Shrink my day</span>
        </a>
        <div className="hidden items-center gap-1 sm:flex">
          {[
            ["How it works", "#how"],
            ["Features", "#helpers"],
            ["Privacy", "#private"],
          ].map(([t, h]) => (
            <a key={h} href={h} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink">
              {t}
            </a>
          ))}
        </div>
        <a href="/app" className={`${BTN_SM} h-9 justify-self-end px-3.5 text-[13px] sm:h-10 sm:px-4 sm:text-[14px]`}>
          Open the app
        </a>
      </nav>
    </header>
  );
}

/** Words light up as you scroll past, like reading along. Small colour tiles sit inside the sentence. */
type Tok = { w: string; b?: boolean; tile?: "stack" | "wall" | "one" | "step" };
const SAY: Tok[] = [
  ..."Most to-do apps show you everything".split(" ").map((w) => ({ w, b: true })),
  { w: "", tile: "stack" },
  ..."at once.".split(" ").map((w) => ({ w, b: true })),
  ..."For a busy, scattered brain, a long list feels like a wall.".split(" ").map((w) => ({ w })),
  { w: "", tile: "wall" },
  ..."Shrink my day shows you one thing".split(" ").map((w) => ({ w, b: true })),
  { w: "", tile: "one" },
  ..."and the first small step,".split(" ").map((w) => ({ w, b: true })),
  { w: "", tile: "step" },
  ..."so starting feels easy.".split(" ").map((w) => ({ w })),
];
function InlineTile({ kind }: { kind: NonNullable<Tok["tile"]> }) {
  const base = "relative mx-[0.12em] inline-grid h-[0.9em] w-[1.25em] -translate-y-[0.06em] place-items-center rounded-[0.24em] align-middle";
  if (kind === "stack")
    return (
      <span className={`${base} bg-[linear-gradient(135deg,#ffc89e,#ff9bd0)]`}>
        <span className="absolute h-[0.36em] w-[0.7em] -translate-y-[0.12em] rotate-[-6deg] rounded-[0.08em] bg-white/70" />
        <span className="absolute h-[0.36em] w-[0.7em] translate-y-[0.06em] rotate-[4deg] rounded-[0.08em] bg-white" />
      </span>
    );
  if (kind === "wall") return <span className={`${base} bg-[linear-gradient(135deg,#d9ccff,#9cb8ff)] text-[0.55em]`}>🧱</span>;
  if (kind === "one")
    return (
      <span className={`${base} bg-[linear-gradient(135deg,#5f8bff,#1d4df5)]`}>
        <Check className="size-[0.55em] text-white" strokeWidth={3.5} />
      </span>
    );
  return <span className={`${base} bg-[linear-gradient(135deg,#e9ffb8,#8ff0d6)] text-[0.55em]`}>👣</span>;
}
function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  return (
    <section className="mx-auto max-w-5xl px-6 py-28 sm:py-40">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-signal-ink">Made for ADHD brains</p>
      <div ref={ref} className="mt-6 font-serif text-[34px] leading-[1.15] tracking-[-0.02em] sm:text-[56px]">
        {SAY.map((x, i) => (
          <Word key={i} p={p} at={i / SAY.length} bold={!!x.b}>
            {x.tile ? <InlineTile kind={x.tile} /> : x.w}
          </Word>
        ))}
      </div>
    </section>
  );
}
function Word({ p, at, bold, children }: { p: MotionValue<number>; at: number; bold: boolean; children: React.ReactNode }) {
  const opacity = useTransform(p, [at - 0.05, at + 0.05], [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className={bold ? "text-ink" : "text-ink-2"}>
      {children}{" "}
    </motion.span>
  );
}

const HOW = [
  { title: "Dump it all out", body: "Type it or say it in one go. Every pause becomes its own task, so nothing gets lost.", art: Capture, sky: "sunset" as SkyName },
  { title: "Shrink the big ones", body: "Ask the AI you already use to break a scary task into tiny steps. Paste them back in.", art: AiSteps, sky: "lilac" as SkyName },
  { title: "See one thing", body: "Home shows one task and its next step. Not feeling it? Pick another.", art: OneThing, sky: "sky" as SkyName },
  { title: "Do one step", body: "Focus hides everything else. Tick a step and the next one shows up. Add a timer if it helps.", art: Timer, sky: "mint" as SkyName },
];

function How() {
  const [on, setOn] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.4 });
  const ever = useInView(ref, { once: true, amount: 0.2 });
  useEffect(() => {
    if (!seen || paused) return;
    const t = setTimeout(() => setOn((v) => (v + 1) % HOW.length), 6500);
    return () => clearTimeout(t);
  }, [on, seen, paused]);
  const Pic = HOW[on].art;
  return (
    <section id="how" ref={ref} className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-signal-ink">How it works</p>
          <h2 className="mt-4 font-serif text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">From a full head to a first step</h2>
          <div className="mt-8 border-t border-line">
            {HOW.map((h, i) => (
              <button key={h.title} type="button" onClick={() => (setOn(i), setPaused(true))} className="block w-full border-b border-line py-5 text-left">
                <span className="flex items-baseline gap-3">
                  <span className={`text-[13px] font-semibold tabular-nums transition-colors ${i === on ? "text-signal-ink" : "text-ink-3"}`}>0{i + 1}</span>
                  <span className={`text-[20px] font-semibold tracking-[-0.01em] transition-colors ${i === on ? "text-ink" : "text-ink-3"}`}>{h.title}</span>
                </span>
                <AnimatePresence initial={false}>
                  {i === on && (
                    <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="block overflow-hidden">
                      <span className="block pl-8 pt-2 text-[16px] leading-snug text-ink-2">{h.body}</span>
                      {!paused && seen && (
                        <span className="ml-8 mt-4 block h-[2px] overflow-hidden rounded-full bg-line">
                          <motion.span key={on} className="block h-full bg-signal" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 6.5, ease: "linear" }} />
                        </span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </div>
        <div className="relative aspect-[5/4] overflow-hidden rounded-[24px] sm:rounded-[32px]">
          <AnimatePresence initial={false}>
            <motion.div key={HOW[on].sky} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
              <Sky name={HOW[on].sky} />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-[7%] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={on} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} transition={{ type: "spring", bounce: 0.15, duration: 0.6 }} className="w-full max-w-[420px]">
                <Window>
                  <div className="h-[250px] bg-paper">{ever && <Pic />}</div>
                </Window>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ title, body, children, sky, className = "" }: { title: string; body: string; children: React.ReactNode; sky: SkyName; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className={`flex flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-line ${className}`}>
      <div className="relative mx-2 mt-2 h-[250px] overflow-hidden rounded-[16px]">
        <Sky name={sky} />
        <div className="relative h-full">{seen && children}</div>
      </div>
      <div className="px-5 pb-5 pt-4">
        <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-snug text-ink-2">{body}</p>
      </div>
    </div>
  );
}

function Helpers() {
  return (
    <section id="helpers" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-32">
      <h2 className="max-w-[18ch] font-serif text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
        Small helpers <span className="text-ink-3">that stay out of your way</span>
      </h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Tile sky="sky" title="Sync multiple devices" body="Tick a task on your phone and it's done on your laptop too. Link them with a code. No sign up." className="md:col-span-2">
          <Devices />
        </Tile>
        <Tile sky="lime" title="Ideas come back" body="Save an idea and let it go. It comes back in a few days, when you have room for it.">
          <IdeasBack />
        </Tile>
        <Tile sky="sunset" title="Reminders that reach you" body="Your phone rings when it's time, even with the app closed. Your calendar events show up too.">
          <Reminders />
        </Tile>
        <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
          {[
            { i: <WifiOff className="size-5" />, t: "Works offline", b: "Add tasks on the bus. It all saves on your device.", c: "bg-[linear-gradient(135deg,#e9ffb8,#9bd65a)] text-[#2c4a06]" },
            { i: <ShieldCheck className="size-5" />, t: "Free, with no ads", b: "No plans, no paywall, no trial that runs out.", c: "bg-[linear-gradient(135deg,#ffc6ec,#b9a2ff)] text-[#3a1f7a]" },
            { i: <Moon className="size-5" />, t: "Dark mode", b: "Easy on the eyes late at night.", c: "bg-[linear-gradient(135deg,#101a4d,#060b2b)] text-moon" },
            { i: <Smartphone className="size-5" />, t: "Feels like an app", b: "Add it to your Home Screen and it opens full screen.", c: "bg-[linear-gradient(135deg,#ffdf9e,#ff9a7a)] text-[#6b2a12]" },
          ].map((f) => (
            <div key={f.t} className="rounded-[24px] bg-white p-5 ring-1 ring-line">
              <span className={`grid size-10 place-items-center rounded-[12px] ${f.c}`}>{f.i}</span>
              <h3 className="mt-4 text-[17px] font-semibold">{f.t}</h3>
              <p className="mt-1 text-[15px] leading-snug text-ink-2">{f.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Private() {
  return (
    <section id="private" className="scroll-mt-24 px-3 sm:px-4">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[24px] px-6 py-24 text-white sm:rounded-[32px] sm:py-32">
        <Sky name="night" />
        <div className="lp-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Lock className="size-6 text-moon" />
          </span>
          <h2 className="mt-8 font-serif text-[48px] leading-[0.98] tracking-[-0.025em] sm:text-[88px]">
            <span className="block">No account.</span>
            <span className="block text-white/70">No ads.</span>
            <span className="block text-white/45">No tracking.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-white/75 sm:text-[19px]">Your tasks live on your device. When you sync, they&apos;re locked before they leave, so the app only ever holds a scrambled copy nobody can read.</p>
          <a href="/privacy" className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-semibold text-moon hover:text-white">
            Read the privacy policy <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Final() {
  return (
    <section className="px-3 pt-24 sm:px-4 sm:pt-32">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[24px] sm:rounded-[32px]">
        <Sky name="sunset" />
        <div className="relative flex flex-col items-center px-6 py-24 text-center sm:py-36">
          <h2 className="font-serif text-[56px] leading-[0.95] tracking-[-0.03em] text-ink sm:text-[110px]">Shrink your day.</h2>
          <p className="mt-5 max-w-[32ch] text-[17px] text-ink/75 sm:text-[19px]">It&apos;s free, it opens in your browser, and there&apos;s nothing to sign up for.</p>
          <a href="/app" className={`${BTN} mt-8`}>
            Open Shrink my day <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="overflow-hidden px-4 pb-6 pt-16 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold">Made by Hassan</p>
          <p className="mt-1 text-[15px] text-ink-2">An independent designer who needed it too.</p>
          <div className="mt-3 flex gap-2">
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className={BTN_SM}>
              Say hi on X
            </a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}>
              ☕ Buy me a coffee
            </a>
          </div>
        </div>
        <div className="flex gap-5 text-[14px] text-ink-2">
          <a href="/app" className="hover:text-ink">
            Open the app
          </a>
          <a href="/privacy" className="hover:text-ink">
            Privacy
          </a>
          <span className="text-ink-3">© {new Date().getFullYear()}</span>
        </div>
      </div>
      <p aria-hidden className="lp-wordmark mx-auto mt-10 max-w-6xl select-none whitespace-nowrap text-center font-serif leading-[0.8] tracking-[-0.04em]">
        Shrink my day
      </p>
    </footer>
  );
}

export function Landing() {
  return (
    <main className="bg-paper text-ink">
      <Nav />
      <Hero />
      <Statement />
      <How />
      <Helpers />
      <Private />
      <Final />
      <Footer />
      <Petals />
    </main>
  );
}
