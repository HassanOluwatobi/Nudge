"use client";

import { ArrowRight, Bell, Lightbulb, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { feel } from "@/lib/feedback";
import { Art } from "./art";

/*
  The user guide. Five short pages, each with a small live illustration.
  Swipe, tap Next, or use the arrow keys. It opens on first visit and from the
  help button. Enter and exit ride springs, so it never snaps.
*/

const ease = [0.32, 0.72, 0, 1] as const;

function Row({ emoji, text, hue, delay, done = false }: { emoji: string; text: string; hue: string; delay: number; done?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, type: "spring", bounce: 0.2, duration: 0.6 }} className="task-row flex items-center gap-2.5 px-2.5 py-2">
      <span className={`hue-${hue} tile grid size-8 place-items-center rounded-[10px] text-[15px]`}>{emoji}</span>
      <span className="flex-1 truncate text-[13px] font-semibold">{text}</span>
      <motion.span className={`hue-${hue} grid size-5 place-items-center rounded-full border-2`} initial={false} animate={{ backgroundColor: done ? "var(--h)" : "rgba(0,0,0,0)", borderColor: done ? "var(--h)" : "#1b2044" }} transition={{ delay: delay + 0.9, duration: 0.3 }}>
        {done && (
          <svg viewBox="0 0 16 16" className="size-3" fill="none">
            <motion.path d="M3.5 8.4 6.6 11.4 12.6 4.8" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: delay + 1, duration: 0.3 }} />
          </svg>
        )}
      </motion.span>
    </motion.div>
  );
}

function Capture() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.5 }} className="mb-1 rounded-[14px] bg-white px-3 py-2.5 font-serif text-[17px] shadow-sm ring-1 ring-line">
        call mum tomorrow<motion.span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-signal" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
      </motion.div>
      <Row emoji="📞" text="Call mum" hue="cyan" delay={0.25} />
      <Row emoji="🧺" text="Laundry" hue="aqua" delay={0.4} />
      <Row emoji="💳" text="Buy airtime" hue="lime" delay={0.55} />
    </div>
  );
}

function OneThing() {
  return (
    <div className="flex h-full flex-col justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.15, duration: 0.7 }} className="relative h-24 overflow-hidden rounded-[18px]">
        <Art mode={0} />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">Start here</span>
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: "spring", bounce: 0, duration: 0.5 }} className="mt-3 font-serif text-[19px] leading-tight">
        Reply to Tunde
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-[12px] text-ink-2">
        <span className="font-semibold text-signal-ink">Next:</span> Write the first line
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: "spring", bounce: 0.2, duration: 0.5 }} className="mt-2.5 grid h-9 place-items-center rounded-full bg-signal text-[13px] font-semibold text-white">
        Start
      </motion.div>
    </div>
  );
}

function Timer() {
  const reduce = useReducedMotion();
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex h-full items-center justify-center gap-5 px-6">
      <div className="relative size-[120px]">
        <svg viewBox="0 0 110 110" className="absolute inset-0 size-full -rotate-90">
          <defs>
            <linearGradient id="g-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#19d3e6" />
              <stop offset="60%" stopColor="#c3ef6e" />
              <stop offset="100%" stopColor="#ffb98a" />
            </linearGradient>
          </defs>
          <circle cx="55" cy="55" r={R} fill="none" stroke="#e8e1d3" strokeWidth="10" />
          <motion.circle cx="55" cy="55" r={R} fill="none" stroke="url(#g-ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: reduce ? C * 0.35 : [0, C * 0.7] }} transition={{ duration: 6, ease: "linear", repeat: Infinity, repeatType: "reverse" }} />
        </svg>
        <div className="absolute inset-[18%] overflow-hidden rounded-full">
          <Art mode={2} />
        </div>
      </div>
      <div className="flex w-[120px] flex-col gap-1.5">
        {["Open the deck", "Write one line", "Send it"].map((t, i) => (
          <motion.div key={t} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }} className="flex items-center gap-1.5 text-[11px]">
            <motion.span className="hue-blue grid size-4 shrink-0 place-items-center rounded-full border-2" initial={{ backgroundColor: "rgba(0,0,0,0)", borderColor: "#5f6584" }} animate={i < 2 ? { backgroundColor: "#1d4df5", borderColor: "#1d4df5" } : {}} transition={{ delay: 0.9 + i * 0.6, duration: 0.3 }} />
            <span className="truncate">{t}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Checkins() {
  const items = [
    { icon: Sun, t: "Morning kickoff", s: "8:30 am", hue: "hue-peach" },
    { icon: Moon, t: "Evening wrap-up", s: "8:00 pm", hue: "hue-lilac" },
    { icon: Bell, t: "Reminder", s: "Call mum, 6 pm", hue: "hue-blue" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      {items.map(({ icon: I, t, s, hue }, i) => (
        <motion.div key={t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.14, type: "spring", bounce: 0.2, duration: 0.6 }} className={`${hue} tile flex items-center gap-2.5 rounded-[14px] px-3 py-2.5`}>
          <motion.span animate={i === 2 ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ delay: 1, duration: 0.7, repeat: Infinity, repeatDelay: 2.2 }}>
            <I className="size-4" />
          </motion.span>
          <span className="flex-1 text-[13px] font-semibold text-ink">{t}</span>
          <span className="text-[11px] text-ink-2">{s}</span>
        </motion.div>
      ))}
    </div>
  );
}

function IdeasBack() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 30, rotate: -4 }} animate={{ opacity: 1, y: [30, -6, 0], rotate: [-4, 2, 0] }} transition={{ duration: 0.9, ease }} className="w-full rounded-[16px] border border-[#dfe9c8] bg-[#f6fbe9] p-3">
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4d7a12]">
          <Lightbulb className="size-3" /> An idea came back
        </p>
        <p className="mt-1 text-[13px]">A newsletter about design in African fintech</p>
        <div className="mt-2 flex gap-1.5">
          {["Make it a task", "Not yet", "Let it go"].map((c) => (
            <span key={c} className="rounded-full bg-white px-2 py-1 text-[10px] font-medium ring-1 ring-line">
              {c}
            </span>
          ))}
        </div>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-center text-[11px] text-ink-3">
        3 days · 7 days · 14 days · 30 days
      </motion.p>
    </div>
  );
}

const PAGES = [
  { art: Capture, title: "Put it all down", body: "Tap + and type or speak whatever is on your mind. Messy is fine. NudgeMe tidies it into a task, an idea or a note." },
  { art: OneThing, title: "Start with one thing", body: "Today picks one task and shows its next small step. Not feeling it? Tap Not this one, or Make today easy." },
  { art: Timer, title: "Focus, one step at a time", body: "Drag the ring to set a timer if you want one. Tick steps as you go. Finishing a step never finishes the task by itself." },
  { art: Checkins, title: "Gentle check-ins", body: "A two-minute morning kickoff, an evening wrap-up and a weekly reset. Add them to your calendar so your phone reminds you." },
  { art: IdeasBack, title: "Ideas come back", body: "Park ideas in the Ideas tab. They return on Today later, so they stop circling in your head. Everything stays on your phone." },
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
          <motion.button type="button" aria-label="Close guide" tabIndex={-1} className="absolute inset-0 cursor-default bg-night/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} onClick={close} />
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="How NudgeMe works"
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
              <motion.button layout type="button" className="btn btn-signal min-h-12 px-5" onClick={() => (last ? (feel("save", "success"), onClose()) : go(i + 1))} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
                {last ? "Get started" : "Next"} <ArrowRight className="size-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
