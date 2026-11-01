"use client";

import { ArrowRight, Bell, Lightbulb, Sparkles } from "lucide-react";
import { AppleMark, GoogleMark, LogoTile, OutlookMark } from "./brands";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { feel } from "@/lib/feedback";
import { Art } from "./art";
import { burstFrom } from "./petals";

/*
  The user guide. Seven short pages, each with a small live illustration.
  Swipe, tap Next, or use the arrow keys. It opens on first visit and from the
  help button. Enter and exit ride springs, so it never snaps.
*/

const ease = [0.32, 0.72, 0, 1] as const;

function Row({ emoji, text, hue, delay, done = false }: { emoji: string; text: string; hue: string; delay: number; done?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, type: "spring", bounce: 0.2, duration: 0.6 }} className="task-row flex items-center gap-2.5 px-2.5 py-2">
      <span className={`hue-${hue} tile grid size-8 place-items-center rounded-[10px] text-[15px]`}>{emoji}</span>
      <span className="flex-1 truncate text-[15px] font-semibold">{text}</span>
      <motion.span className={`hue-${hue} grid size-5 place-items-center rounded-full border-2`} initial={false} animate={{ backgroundColor: done ? "var(--signal)" : "rgba(0,0,0,0)", borderColor: done ? "var(--signal)" : "var(--ink)" }} transition={{ delay: delay + 0.9, duration: 0.3 }}>
        {done && (
          <svg viewBox="0 0 16 16" className="size-3" fill="none">
            <motion.path d="M3.5 8.4 6.6 11.4 12.6 4.8" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: delay + 1, duration: 0.3 }} />
          </svg>
        )}
      </motion.span>
    </motion.div>
  );
}

const DUMP = "pay rent, email Sade, book the dentist";

function Capture() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? DUMP.length : 0);
  useEffect(() => {
    if (n >= DUMP.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 38);
    return () => clearTimeout(t);
  }, [n]);
  const typed = n >= DUMP.length;
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      <div className="mb-1 overflow-hidden whitespace-nowrap rounded-[14px] bg-white px-3 py-2.5 font-serif text-[15px] ring-1 ring-line">
        <span className={typed ? "text-ink-3 transition-colors duration-500" : ""}>{DUMP.slice(0, n)}</span>
        {!typed && <motion.span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-signal" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />}
      </div>
      {typed && (
        <>
          <Row emoji="💳" text="Pay rent" hue="cyan" delay={0.15} />
          <Row emoji="✉️" text="Email Sade" hue="aqua" delay={0.27} />
          <Row emoji="🩺" text="Book the dentist" hue="blue" delay={0.39} />
        </>
      )}
    </div>
  );
}

function AiSteps() {
  const steps = ["Find last year's forms", "Make a folder for receipts", "Log in to the tax site", "Fill in page one"];
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => (setOpen(true), feel("tick")), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex h-full flex-col justify-center px-6">
      <div className="rounded-[18px] bg-white p-3.5 ring-1 ring-line">
        <p className="font-serif text-[20px] leading-tight tracking-[-0.01em]">Sort out my taxes</p>
        <motion.span
          className="ai-chip mt-2 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"
          aria-expanded={open}
          animate={open ? { scale: [1, 0.94, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Sparkles className="size-3.5" /> Break it down with ChatGPT
        </motion.span>
        <div className="mt-2.5 space-y-1.5">
          {open &&
            steps.map((t, i) => (
              <motion.div key={t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.16, type: "spring", bounce: 0.25, duration: 0.5 }} className="flex items-center gap-2 text-[14px] leading-snug">
                <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-signal-soft text-[10px] font-bold text-signal-ink">{i + 1}</span>
                <span className="truncate">{t}</span>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}

function OneThing() {
  return (
    <div className="flex h-full flex-col justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.15, duration: 0.6 }} className="rounded-[20px] bg-white p-4 ring-1 ring-line">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: "spring", bounce: 0, duration: 0.5 }} className="mt-2 font-serif text-[22px] leading-tight tracking-[-0.01em]">
          Reply to Tunde
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-1 text-[14px] leading-snug text-ink-2">
          <span className="font-semibold text-signal-ink">Next:</span> Say thanks for the intro
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: "spring", bounce: 0.2, duration: 0.5 }} className="btn btn-signal mt-3 min-h-10 w-full text-[15px]">
          Start
        </motion.div>
      </motion.div>
    </div>
  );
}

function Timer() {
  const reduce = useReducedMotion();
  const ring = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const R = 44;
  const C = 2 * Math.PI * R;
  const STEP = 0.7; // seconds between ticks
  // All three steps get ticked, the task finishes, then a burst of confetti.
  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true);
      feel("finish", "success");
      burstFrom(ring.current, 28);
    }, (0.9 + 3 * STEP + 0.35) * 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex h-full items-center justify-center gap-5 px-6">
      <div ref={ring} className="relative size-[120px]">
        <svg viewBox="0 0 110 110" className="absolute inset-0 size-full -rotate-90">
          <defs>
            <linearGradient id="g-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1d4df5" />
              <stop offset="60%" stopColor="#1d4df5" />
              <stop offset="100%" stopColor="#6f97ff" />
            </linearGradient>
          </defs>
          <circle cx="55" cy="55" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
          <motion.circle cx="55" cy="55" r={R} fill="none" stroke="url(#g-ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: reduce ? 0 : C * 0.8 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.9 + 3 * STEP, ease: "linear" }} />
        </svg>
        <div className="absolute inset-[18%] overflow-hidden rounded-full">
          <Art mode={2} />
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.45, duration: 0.6 }} className="absolute inset-0 grid place-items-center">
                <span className="grid size-11 place-items-center rounded-full bg-white">
                  <svg viewBox="0 0 16 16" className="size-6" fill="none" aria-hidden>
                    <motion.path d="M3.5 8.4 6.6 11.4 12.6 4.8" stroke="var(--signal)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.3 }} />
                  </svg>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex w-[138px] flex-col gap-2.5">
        {["Open the deck", "Write one line", "Send it"].map((t, i) => (
          <motion.div key={t} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }} className="flex items-center gap-2 text-[14px] font-medium">
            <motion.span
              className="grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2"
              initial={{ backgroundColor: "rgba(29,77,245,0)", borderColor: "var(--ink-3)" }}
              animate={{ backgroundColor: "#1d4df5", borderColor: "#1d4df5", scale: [1, 0.85, 1.1, 1] }}
              transition={{ delay: 0.9 + i * STEP, duration: 0.35 }}
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                <motion.path d="M3.5 8.4 6.6 11.4 12.6 4.8" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1 + i * STEP, duration: 0.3 }} />
              </svg>
            </motion.span>
            <motion.span className="truncate" initial={{ opacity: 1 }} animate={{ opacity: 0.45 }} transition={{ delay: 1.2 + i * STEP }}>
              {t}
            </motion.span>
          </motion.div>
        ))}
        <AnimatePresence>
          {done && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.3, duration: 0.5 }} className="mt-1 text-[13px] font-semibold text-signal-ink">
              Task finished
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function IdeasBack() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 30, rotate: -4 }} animate={{ opacity: 1, y: [30, -6, 0], rotate: [-4, 2, 0] }} transition={{ duration: 0.9, ease }} className="w-full rounded-[16px] bg-white p-3 ring-1 ring-line">
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-signal-ink">
          <Lightbulb className="size-3" /> Remember this idea?
        </p>
        <p className="mt-1 text-[15px] leading-snug">A newsletter about design in African fintech</p>
        <div className="mt-2 flex gap-1.5">
          {["Make it a task", "Not yet", "Let it go"].map((c) => (
            <span key={c} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium ring-1 ring-line">
              {c}
            </span>
          ))}
        </div>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-center text-[13px] text-ink-3">
        3 days · 7 days · 14 days · 30 days
      </motion.p>
    </div>
  );
}

function Reminders() {
  const marks = [
    { el: <GoogleMark className="size-7" />, bleed: false, name: "Google" },
    { el: <AppleMark className="size-full" />, bleed: true, name: "Apple" },
    { el: <OutlookMark className="size-8" />, bleed: false, name: "Outlook" },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
      <div className="flex gap-3">
        {marks.map((m, i) => (
          <motion.div key={m.name} initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 + i * 0.1, type: "spring", bounce: 0.4, duration: 0.6 }} className="flex flex-col items-center gap-1.5">
            <span className="rounded-[14px]">
              <LogoTile bleed={m.bleed} size={52}>{m.el}</LogoTile>
            </span>
            <span className="text-[12px] font-medium text-ink-2">{m.name}</span>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, type: "spring", bounce: 0.2, duration: 0.6 }} className="flex w-full items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 ring-1 ring-line">
        <motion.span animate={{ rotate: [0, -14, 12, -8, 0] }} transition={{ delay: 1.1, duration: 0.7, repeat: Infinity, repeatDelay: 2 }}>
          <Bell className="size-5 text-signal-ink" />
        </motion.span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold">Pay rent</span>
          <span className="block text-[13px] text-ink-2">Today at 5:00 pm</span>
        </span>
      </motion.div>
    </div>
  );
}

function Devices() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? 2 : 0);
  useEffect(() => {
    if (reduce) return;
    const a = setTimeout(() => setStage(1), 700);
    const b = setTimeout(() => (setStage(2), feel("tick")), 1900);
    return () => (clearTimeout(a), clearTimeout(b));
  }, [reduce]);
  const row = (
    <span className="flex items-center gap-1.5 rounded-[8px] bg-paper px-1.5 py-1">
      <span className="hue-lime tile grid size-4 place-items-center rounded-[5px] text-[9px]">🏋️</span>
      <span className="truncate text-[10px] font-semibold">Gym</span>
    </span>
  );
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
      <div className="flex w-full items-center justify-center gap-2">
        {/* Phone */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} className="flex h-[118px] w-[76px] flex-col gap-1 rounded-[14px] bg-white p-1.5 pt-3 ring-1 ring-line">
          {row}
          <span className="h-2 w-3/4 rounded-full bg-paper" />
          <span className="h-2 w-1/2 rounded-full bg-paper" />
        </motion.div>
        {/* The link between them */}
        <svg className="h-6 w-12 shrink-0" viewBox="0 0 64 24" fill="none" aria-hidden>
          <motion.path d="M4 12 C 20 2, 44 22, 60 12" stroke="var(--signal)" strokeWidth={2} strokeLinecap="round" strokeDasharray="3 5" initial={{ pathLength: 0, opacity: 0 }} animate={stage >= 1 ? { pathLength: 1, opacity: 1 } : {}} transition={{ duration: 0.6 }} />
        </svg>
        {/* Laptop */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: "spring", bounce: 0.2, duration: 0.6 }} className="flex flex-col items-center">
          <div className="flex h-[86px] w-[132px] flex-col gap-1 rounded-t-[10px] bg-white p-2 ring-1 ring-line">
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div initial={{ opacity: 0, x: -24, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}>
                  {row}
                </motion.div>
              )}
            </AnimatePresence>
            <span className="h-2 w-2/3 rounded-full bg-paper" />
            <span className="h-2 w-1/2 rounded-full bg-paper" />
          </div>
          <div className="h-[7px] w-[156px] rounded-b-[6px] bg-line" />
        </motion.div>
      </div>
      <AnimatePresence>
        {stage >= 1 && (
          <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} className="rounded-full bg-white px-3 py-1.5 font-mono text-[14px] font-semibold tracking-[0.08em] ring-1 ring-line">
            7KQ2-M9XA-P4TD
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

const PAGES = [
  { art: Capture, tag: "Brain dump", title: "Get it out of your head", body: "Type it or say it, all in one go. I'll split it into tasks so nothing gets lost." },
  { art: AiSteps, tag: "AI helper", title: "Big task? Let AI shrink it", body: "Your own ChatGPT, Claude, Gemini or Grok splits it into tiny steps. Paste them back and you're good. No sign up, no cost." },
  { art: OneThing, tag: "Home", title: "One thing at a time", body: "You only see one task and its next step. Not feeling it? Pick another." },
  { art: Timer, tag: "Focus", title: "One step at a time", body: "Focus hides everything else. Tick a step and the next one shows up. Add a timer if it helps." },
  { art: IdeasBack, tag: "Ideas", title: "Save ideas for later", body: "Write it down and stop holding it in your head. I'll bring it back in a few days." },
  { art: Reminders, tag: "Reminders", title: "Timely reminders", body: "Your phone notifies you when it's time, even with the site closed." },
  { art: Devices, tag: "Devices", title: "Your phone and laptop, in step", body: "In Settings, tap Show a code and type it on your other device. Your tasks stay the same on both. No account, and I still can't see them." },
];

export function Guide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const back = useRef<Element | null>(null);
  const last = i === PAGES.length - 1;

  const go = (n: number) => {
    if (n < 0 || n >= PAGES.length || n === i) return;
    setDir(n > i ? 1 : -1);
    setI(n);
    feel("tick", "light");
  };

  useEffect(() => {
    if (!open) return;
    setI(0);
    back.current = document.activeElement;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    requestAnimationFrame(() => box.current?.focus());
    return () => {
      html.style.overflow = prev;
      (back.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  const close = () => {
    feel("tap");
    onClose();
  };

  const Page = PAGES[i].art;

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="guide" className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.button type="button" aria-label="Close guide" tabIndex={-1} className="guide-scrim absolute inset-0 cursor-default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} onClick={close} />
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="How Shrink my day works"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowRight") go(i + 1);
              if (e.key === "ArrowLeft") go(i - 1);
            }}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6, transition: { duration: 0.34, ease } }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.6 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y + info.velocity.y * 0.2 > 140) close();
            }}
            className="relative w-full max-w-[420px] overflow-hidden rounded-t-[30px] bg-ivory pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-30px_rgb(6_11_43/0.6)] focus:outline-none sm:mb-0 sm:rounded-[30px]"
          >
            <div className="grabber" aria-hidden />
            <div className="flex items-center justify-between px-5 pt-2">
              <p className="t-label">
                {i + 1} of {PAGES.length}
              </p>
              {!last && (
                <button type="button" onClick={close} className="btn btn-quiet -mr-2 min-h-10 px-3 text-[15px]">
                  Skip
                </button>
              )}
              {last && <span className="h-10" />}
            </div>

            <div className="relative mx-5 mt-2 h-[230px] overflow-hidden rounded-[22px] bg-[#efe9dd]">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div
                  key={i}
                  custom={dir}
                  className="absolute inset-0 touch-pan-y"
                  variants={{
                    enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (d: number) => ({ x: d * -60, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.5}
                  onDragEnd={(_, info) => {
                    const swipe = info.offset.x + info.velocity.x * 0.25;
                    if (swipe < -60) go(i + 1);
                    else if (swipe > 60) go(i - 1);
                  }}
                >
                  <Page />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative min-h-[148px] px-6 pt-5">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div key={i} custom={dir} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
                  <h2 className="t-title">{PAGES[i].title}</h2>
                  <p className="t-body mt-2 text-ink-2">{PAGES[i].body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-2 flex items-center gap-3 px-5 pb-2">
              <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Guide pages">
                {PAGES.map((p, k) => (
                  <button key={p.title} type="button" role="tab" aria-selected={k === i} aria-label={`Page ${k + 1}: ${p.title}`} onClick={() => go(k)} className="grid h-8 place-items-center">
                    <motion.span className="block h-2 rounded-full bg-ink" initial={false} animate={{ width: k === i ? 22 : 8, opacity: k === i ? 1 : 0.18 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} />
                  </button>
                ))}
              </div>
              {i > 0 && (
                <button type="button" className="btn btn-quiet min-h-12 px-4" onClick={() => go(i - 1)}>
                  Back
                </button>
              )}
              <motion.button layout type="button" className="btn btn-signal min-h-12 whitespace-nowrap px-5" onClick={() => (last ? (feel("save", "success"), onClose()) : go(i + 1))} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
                {last ? "Let\u2019s go" : "Next"} <ArrowRight className="size-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
