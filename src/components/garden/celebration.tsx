"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { Companion } from "./companion";

const COLORS = ["#ffb4a2", "#ffd6a5", "#fdffb6", "#caffbf", "#bdb2ff", "#ffc6ff", "#f2603f"];

/** The big moment when the one thing is finished. Full screen, then gets out of the way. */
export function Celebration({
  title,
  plants,
  canPick,
  askReminders,
  onMore,
  onRest,
  onReminders,
  onUndo,
}: {
  title: string;
  plants: number;
  canPick: boolean;
  askReminders: boolean;
  onMore: () => void;
  onRest: () => void;
  onReminders: () => void;
  onUndo?: () => void;
}) {
  const petals = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: Math.random() * 100,
        size: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 1.2,
        dur: 2.8 + Math.random() * 2.2,
        dx: (Math.random() - 0.5) * 120,
        rot: 360 + Math.random() * 540,
      })),
    []
  );

  // Grow the new flower in front of you, a moment after the screen opens.
  const [shown, setShown] = useState(Math.max(0, plants - 1));
  const [hop, setHop] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setShown(plants);
      setHop(1);
    }, 1100);
    return () => clearTimeout(t);
  }, [plants]);

  useEffect(() => {
    try {
      navigator.vibrate?.([12, 60, 24]);
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onRest();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRest]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your one thing is done"
      className="nm-fade-in fixed inset-0 z-[70] overflow-hidden bg-[radial-gradient(90%_60%_at_50%_30%,#fff4e8_0%,#ffd9c4_45%,#ffb59e_100%)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {petals.map((p, i) => (
          <span
            key={i}
            className="nm-petal"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                "--delay": `${p.delay}s`,
                "--dur": `${p.dur}s`,
                "--dx": `${p.dx}px`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col items-center px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
        {onUndo && (
          <button type="button" onClick={onUndo} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 h-10 rounded-full px-3 text-[14px] font-medium text-[var(--ink-2)]">
            Undo
          </button>
        )}
        <p className="eyebrow nm-fade-in mt-2 text-[var(--ink-2)]">Your one thing</p>
        <h1 className="nm-big-in mt-2 font-serif text-[76px] leading-[0.9] tracking-[-0.03em] text-[var(--ink)]">
          Done<span className="text-[var(--coral)]">.</span>
        </h1>
        <p className="nm-rise mt-3 line-clamp-2 max-w-[28ch] text-[17px] font-medium text-[var(--ink-2)] line-through decoration-[var(--coral)]/60 decoration-2 [overflow-wrap:anywhere]" style={{ animationDelay: "350ms" }}>
          {title}
        </p>
        <Companion plants={shown} cheer={hop} className="mt-2 h-[clamp(180px,40dvh,360px)] w-full flex-1" />
        <p className="nm-rise max-w-[30ch] text-[16px] leading-snug text-[var(--ink)] text-pretty" style={{ animationDelay: "600ms" }}>
          A new flower grew. That&apos;s a real win, and today counts.
        </p>
        <div className="nm-rise mt-5 w-full space-y-2.5" style={{ animationDelay: "750ms" }}>
          {canPick ? (
            <button type="button" onClick={onMore} className="candy h-[58px] w-full text-[17px]">
              Do one more
            </button>
          ) : (
            <button type="button" onClick={onRest} className="candy h-[58px] w-full text-[17px]">
              Back to my garden
            </button>
          )}
          {askReminders && (
            <button type="button" onClick={onReminders} className="candy candy-soft h-[52px] w-full text-[15px]">
              <BellRing className="size-4" /> Remind me every day
            </button>
          )}
          {canPick && (
            <button type="button" onClick={onRest} className="h-11 w-full text-[15px] font-medium text-[var(--ink-2)]">
              I&apos;m done for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
