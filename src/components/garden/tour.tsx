"use client";

import { useEffect, useLayoutEffect, useState } from "react";

export type TourStep = { target: string; title: string; body: string };

export const HOME_TOUR: TourStep[] = [
  { target: "card", title: "This is your one thing", body: "Just one, so your head stays clear. I made the first step tiny on purpose." },
  { target: "done", title: "Did it? Tap here", body: "Or swipe the card right. Every win grows something new in the garden. Swipe left to save it for later." },
  { target: "smaller", title: "Feels too big?", body: "Tap Make it smaller and I'll shrink the step until it feels easy to start." },
  { target: "capture", title: "New thought? Tell me", body: "Type it or tap the mic and talk. I'll sort it into today, later, an idea or a note." },
  { target: "menu", title: "Everything else lives here", body: "Your full list, ideas and settings. Out of sight until you need them. You can replay this tour from there too." },
];

/** A gentle walkthrough. Dims the screen and points at one thing at a time. */
export function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const live = steps.filter((s) => typeof document !== "undefined" && document.querySelector(`[data-tour="${s.target}"]`));
  const step = live[i];

  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 380);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (!step || !rect) return null;
  const pad = 10;
  const below = rect.top + rect.height / 2 < window.innerHeight * 0.55;
  const last = i === live.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="How NudgeMe works">
      <div
        className="pointer-events-none absolute rounded-[28px] transition-all duration-300 ease-out"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgb(45 25 45 / 0.55), 0 0 0 3px rgb(255 255 255 / 0.9)",
        }}
      />
      <div
        key={i}
        className="bubble nm-pop absolute left-4 right-4 mx-auto max-w-sm p-5 after:hidden"
        style={below ? { top: Math.min(rect.bottom + pad + 16, window.innerHeight - 220) } : { bottom: Math.max(16, window.innerHeight - rect.top + pad + 16) }}
      >
        <p className="text-[12px] font-semibold text-muted-foreground">
          {i + 1} of {live.length}
        </p>
        <p className="mt-1 text-[18px] font-semibold text-[var(--plum)]">{step.title}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground text-pretty">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={onDone} className="rounded-full px-2 py-2 text-[14px] font-medium text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <button type="button" onClick={() => (last ? onDone() : setI(i + 1))} className="candy h-11 px-6 text-[15px]">
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
