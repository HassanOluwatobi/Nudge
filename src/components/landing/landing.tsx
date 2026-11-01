"use client";

import { AnimatePresence, motion, useInView, useMotionTemplate, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Lock, Moon, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/app/art";
import { AiSteps, Capture, Devices, IdeasBack, OneThing, Reminders, Timer } from "@/components/app/guide";
import { Petals } from "@/components/app/petals";

/*
  The Shrink my day landing page.

  The idea in one picture: a head full of loose tasks floats over the blue
  silk. Scroll, and they pull together and shrink away until one task is left,
  with its first small step. That is what the app does every day.
*/

const X_URL = "https://x.com/Art_sassin";
const SUPPORT_URL = "https://selar.com/showlove/hassanx";

// The loose thoughts. x and y are % of the hero panel.
// m is the spot on a phone, or null to leave it out there.
type Loose = { t: string; e: string; hue: string; x: number; y: number; r: number; m: [number, number] | null };
const LOOSE: Loose[] = [
  { t: "Reply to Tunde", e: "✉️", hue: "aqua", x: 14, y: 26, r: -6, m: [24, 19] },
  { t: "Pay rent", e: "💳", hue: "cyan", x: 84, y: 24, r: 5, m: [80, 16] },
  { t: "Gym?", e: "🏋️", hue: "lime", x: 8, y: 58, r: 4, m: [84, 76] },
  { t: "Call mum back", e: "📞", hue: "peach", x: 88, y: 50, r: -4, m: null },
  { t: "Fix the leaking tap", e: "🔧", hue: "lilac", x: 20, y: 82, r: 3, m: [30, 81] },
  { t: "Renew passport", e: "🛂", hue: "blue", x: 76, y: 84, r: -5, m: [68, 89] },
  { t: "Send the invoice", e: "🧾", hue: "coral", x: 32, y: 17, r: 3, m: null },
  { t: "Book the dentist", e: "🩺", hue: "pink", x: 66, y: 15, r: -3, m: null },
  { t: "Laundry", e: "🧺", hue: "aqua", x: 94, y: 70, r: 6, m: null },
  { t: "Newsletter idea", e: "💡", hue: "lime", x: 9, y: 40, r: -3, m: null },
  { t: "Water the plants", e: "🪴", hue: "lime", x: 36, y: 90, r: 2, m: null },
];

function Logo({ className = "size-7" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="" className={className} />;
}

function Chip({ c, p, i, phone }: { c: Loose; p: MotionValue<number>; i: number; phone: boolean }) {
  const [x, y] = phone && c.m ? c.m : [c.x, c.y];
  const left = useTransform(p, [0.08, 0.42], [`${x}%`, "50%"]);
  const top = useTransform(p, [0.08, 0.42], [`${y}%`, "50%"]);
  const scale = useTransform(p, [0.08, 0.42], [1, 0.35]);
  const opacity = useTransform(p, [0, 0.3, 0.42], [1, 1, 0]);
  const rotate = useTransform(p, [0.08, 0.42], [c.r, 0]);
  return (
    <motion.div style={{ left, top, scale, opacity, rotate, x: "-50%", y: "-50%" }} className={`absolute z-10 ${phone && !c.m ? "hidden" : ""}`}>
      <div className="lp-float flex items-center gap-2 rounded-[14px] bg-white/90 py-1.5 pl-1.5 pr-3 shadow-[0_12px_32px_-12px_rgba(6,11,43,0.45)] ring-1 ring-white/60 backdrop-blur" style={{ animationDelay: `${-i * 0.7}s` }}>
        <span className={`hue-${c.hue} tile grid size-7 place-items-center rounded-[9px] text-[14px]`}>{c.e}</span>
        <span className="whitespace-nowrap text-[14px] font-semibold text-ink">{c.t}</span>
      </div>
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const headOpacity = useTransform(p, [0, 0.1, 0.24], [1, 1, 0]);
  const headY = useTransform(p, [0, 0.24], [0, -60]);
  const blurPx = useTransform(p, [0.1, 0.24], [0, 10]);
  const headBlur = useMotionTemplate`blur(${blurPx}px)`;
  const cardOpacity = useTransform(p, [0.4, 0.52], [0, 1]);
  const cardScale = useTransform(p, [0.4, 0.56], [0.6, 1]);
  const cardY = useTransform(p, [0.4, 0.56], [30, 0]);
  const endOpacity = useTransform(p, [0.56, 0.68], [0, 1]);
  const endY = useTransform(p, [0.56, 0.68], [20, 0]);
  const hintOpacity = useTransform(p, [0, 0.06], [1, 0]);
  const [stepDone, setStepDone] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => p.on("change", (v) => setStepDone(v > 0.8)), [p]);

  return (
    <section ref={ref} className={reduce ? "" : "h-[260svh]"}>
      <div className="sticky top-0 h-svh p-2 sm:p-3">
        <div className="relative h-full overflow-hidden rounded-[28px] bg-signal sm:rounded-[36px]">
          <div className="absolute inset-0">
            <Art mode={1} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,11,43,0.28),transparent_70%)]" />

          {/* The loose thoughts */}
          {!reduce && LOOSE.map((c, i) => <Chip key={c.t} c={c} p={p} i={i} phone={phone} />)}

          {/* Headline */}
          <motion.div style={reduce ? {} : { opacity: headOpacity, y: headY, filter: headBlur }} className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
            <p className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white ring-1 ring-white/25 backdrop-blur">A calm to-do list for ADHD brains</p>
            <h1 className="mt-5 max-w-[14ch] font-serif text-[52px] leading-[0.95] tracking-[-0.03em] text-white sm:text-[84px] lg:text-[104px]">Too much on your mind?</h1>
            <p className="mt-5 max-w-[34ch] text-[17px] leading-snug text-white/85 sm:text-[19px]">Put it all down. Pick one thing. Start with a tiny step.</p>
            <div className="pointer-events-auto mt-7 flex flex-col items-center gap-3">
              <a href="/app" className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-ink shadow-[0_10px_30px_-10px_rgba(6,11,43,0.5)] transition-transform hover:scale-[1.03] active:scale-[0.98]">
                Start now, it&apos;s free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <span className="text-[13px] text-white/75">No sign up. Works on your phone and laptop.</span>
            </div>
          </motion.div>

          {/* What's left: one thing */}
          {!reduce && (
            <>
              <motion.div style={{ opacity: cardOpacity, scale: cardScale, y: cardY, x: "-50%" }} className="absolute left-1/2 top-[44%] z-30 w-[min(86vw,360px)] -translate-y-1/2">
                <div className="rounded-[26px] bg-white p-5 shadow-[0_30px_80px_-24px_rgba(6,11,43,0.6)]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Your one thing</p>
                  <p className="mt-2 font-serif text-[30px] leading-none tracking-[-0.02em] text-ink">Reply to Tunde</p>
                  <div className="mt-4 space-y-2">
                    {["Open the email", "Write two lines", "Send it"].map((s, i) => (
                      <div key={s} className={`flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-[15px] ${i === (stepDone ? 1 : 0) ? "bg-signal-soft font-semibold text-ink" : "text-ink-2"}`}>
                        <span className={`grid size-5 place-items-center rounded-full border-2 transition-colors ${i === 0 && stepDone ? "border-signal bg-signal" : "border-ink-3/50"}`}>
                          {i === 0 && stepDone && (
                            <svg viewBox="0 0 16 16" className="size-3" fill="none">
                              <path d="M3.5 8.4 6.6 11.4 12.6 4.8" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
                            </svg>
                          )}
                        </span>
                        <span className={i === 0 && stepDone ? "text-ink-3 line-through" : ""}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="btn btn-signal mt-4 min-h-11 w-full text-[16px]">Start</div>
                </div>
              </motion.div>
              <motion.div style={{ opacity: endOpacity, y: endY }} className="absolute inset-x-0 bottom-[7%] z-30 px-6 text-center">
                <p className="font-serif text-[34px] leading-none tracking-[-0.02em] text-white sm:text-[48px]">One thing. One tiny step.</p>
                <p className="mt-3 text-[16px] text-white/80">That&apos;s how a big day gets small.</p>
              </motion.div>
              <motion.div style={{ opacity: hintOpacity }} className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
                <span className="lp-hint h-9 w-[22px] rounded-full ring-2 ring-white/60" />
              </motion.div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 2.4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-5 sm:px-7 sm:pt-7">
      <nav className={`pointer-events-auto flex w-full max-w-6xl items-center justify-between rounded-full py-2 pl-3 pr-2 transition-colors duration-300 ${solid ? "bg-white/85 shadow-[0_8px_30px_-12px_rgba(6,11,43,0.25)] ring-1 ring-line backdrop-blur-xl" : "bg-white/10 ring-1 ring-white/20 backdrop-blur-md"}`}>
        <a href="#" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: "smooth" }))} className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-white">
            <Logo className="size-5" />
          </span>
          <span className={`font-serif text-[20px] tracking-[-0.01em] transition-colors ${solid ? "text-ink" : "text-white"}`}>Shrink my day</span>
        </a>
        <div className="flex items-center gap-1">
          <a href="#how" className={`hidden rounded-full px-3 py-2 text-[14px] font-medium transition-colors sm:block ${solid ? "text-ink-2 hover:text-ink" : "text-white/85 hover:text-white"}`}>
            How it works
          </a>
          <a href="#private" className={`hidden rounded-full px-3 py-2 text-[14px] font-medium transition-colors sm:block ${solid ? "text-ink-2 hover:text-ink" : "text-white/85 hover:text-white"}`}>
            Privacy
          </a>
          <a href="/app" className={`ml-1 inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold transition-colors ${solid ? "bg-ink text-white" : "bg-white text-ink"}`}>
            Open the app
          </a>
        </div>
      </nav>
    </header>
  );
}

/** Words light up as you scroll past, like reading along. */
function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const bold = "Most to-do apps show you everything at once.";
  const rest = "For a busy, scattered brain, a long list feels like a wall. Shrink my day shows you one thing and the first small step, so starting feels easy.";
  const words = [...bold.split(" ").map((w) => ({ w, b: true })), ...rest.split(" ").map((w) => ({ w, b: false }))];
  return (
    <section className="mx-auto max-w-5xl px-6 py-28 sm:py-40">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-signal-ink">Made for ADHD brains</p>
      <div ref={ref} className="mt-6 font-serif text-[34px] leading-[1.12] tracking-[-0.02em] sm:text-[56px]">
        {words.map((x, i) => (
          <Word key={i} p={p} at={i / words.length} bold={x.b}>
            {x.w}
          </Word>
        ))}
      </div>
    </section>
  );
}
function Word({ p, at, bold, children }: { p: MotionValue<number>; at: number; bold: boolean; children: string }) {
  const opacity = useTransform(p, [at - 0.05, at + 0.05], [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className={bold ? "text-ink" : "text-ink-2"}>
      {children}{" "}
    </motion.span>
  );
}

const HOW = [
  { title: "Dump it all out", body: "Type it or say it in one go. Every pause becomes its own task, so nothing gets lost.", art: Capture },
  { title: "Shrink the big ones", body: "Ask the AI you already use to break a scary task into tiny steps. Paste them back in.", art: AiSteps },
  { title: "See one thing", body: "Home shows one task and its next step. Not feeling it? Pick another.", art: OneThing },
  { title: "Do one step", body: "Focus hides everything else. Tick a step and the next one shows up. Add a timer if it helps.", art: Timer },
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
        <div className="relative aspect-[5/4] overflow-hidden rounded-[32px] bg-signal">
          <div className="absolute inset-0">
            <Art mode={0} />
          </div>
          <div className="absolute inset-[8%] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={on} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} transition={{ type: "spring", bounce: 0.15, duration: 0.6 }} className="h-[250px] w-full max-w-[400px] overflow-hidden rounded-[24px] bg-[#efe9dd] shadow-[0_30px_70px_-24px_rgba(6,11,43,0.55)]">
                {ever && <Pic />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ title, body, children, className = "" }: { title: string; body: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className={`flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-line ${className}`}>
      <div className="relative mx-3 mt-3 h-[230px] overflow-hidden rounded-[20px] bg-[#efe9dd]">{seen && children}</div>
      <div className="px-6 pb-6 pt-5">
        <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-snug text-ink-2">{body}</p>
      </div>
    </div>
  );
}

function Helpers() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
      <h2 className="max-w-[18ch] font-serif text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
        Small helpers <span className="text-ink-3">that stay out of your way</span>
      </h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Tile title="Sync multiple devices" body="Tick a task on your phone and it's done on your laptop too. Link them with a code. No sign up." className="md:col-span-2">
          <Devices />
        </Tile>
        <Tile title="Ideas come back" body="Save an idea and let it go. It comes back in a few days, when you have room for it.">
          <IdeasBack />
        </Tile>
        <Tile title="Reminders that reach you" body="Your phone rings when it's time, even with the app closed. Your calendar events show up too.">
          <Reminders />
        </Tile>
        <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
          {[
            { i: <WifiOff className="size-5" />, t: "Works offline", b: "Add tasks on the bus. It all saves on your device." },
            { i: <ShieldCheck className="size-5" />, t: "Free, with no ads", b: "No plans, no paywall, no trial that runs out." },
            { i: <Moon className="size-5" />, t: "Dark mode", b: "Easy on the eyes late at night." },
            { i: <Smartphone className="size-5" />, t: "Feels like an app", b: "Add it to your Home Screen and it opens full screen." },
          ].map((f) => (
            <div key={f.t} className="rounded-[24px] bg-white p-6 ring-1 ring-line">
              <span className="grid size-10 place-items-center rounded-[12px] bg-signal-soft text-signal-ink">{f.i}</span>
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
    <section id="private" className="scroll-mt-24 px-2 sm:px-3">
      <div className="lp-grid relative overflow-hidden rounded-[28px] bg-night px-6 py-24 text-white sm:rounded-[36px] sm:py-32">
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
    <section className="px-2 pt-24 sm:px-3 sm:pt-32">
      <div className="relative overflow-hidden rounded-[28px] bg-signal sm:rounded-[36px]">
        <div className="absolute inset-0">
          <Art mode={1} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,11,43,0.32),transparent_72%)]" />
        <div className="relative flex flex-col items-center px-6 py-24 text-center sm:py-36">
          <h2 className="font-serif text-[56px] leading-[0.95] tracking-[-0.03em] text-white sm:text-[110px]">Shrink your day.</h2>
          <p className="mt-5 max-w-[32ch] text-[17px] text-white/85 sm:text-[19px]">It&apos;s free, it opens in your browser, and there&apos;s nothing to sign up for.</p>
          <a href="/app" className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-ink shadow-[0_10px_30px_-10px_rgba(6,11,43,0.5)] transition-transform hover:scale-[1.03] active:scale-[0.98]">
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
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ink min-h-10 px-4 text-[14px]">
              Say hi on X
            </a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-line min-h-10 px-4 text-[14px]">
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
