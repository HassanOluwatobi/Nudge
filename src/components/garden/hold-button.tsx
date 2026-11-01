"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HOLD_MS = 600;

/**
 * Press and hold to commit. The fill grows while you hold (slow, deliberate),
 * snaps back fast if you let go early. Keyboard users just press Enter.
 */
export function HoldButton({
  children,
  onCommit,
  className,
  hint = "Press and hold",
  "data-tour": dataTour,
}: {
  children: React.ReactNode;
  onCommit: () => void;
  className?: string;
  hint?: string;
  "data-tour"?: string;
}) {
  const [holding, setHolding] = useState(false);
  const [nudge, setNudge] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const committed = useRef(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const start = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    committed.current = false;
    started.current = performance.now();
    setHolding(true);
    try {
      navigator.vibrate?.(4);
    } catch {}
    timer.current = setTimeout(() => {
      committed.current = true;
      setHolding(false);
      try {
        navigator.vibrate?.([10, 40, 18]);
      } catch {}
      onCommit();
    }, HOLD_MS);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (!committed.current && holding && performance.now() - started.current < 250) setNudge((n) => n + 1);
    setHolding(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        data-tour={dataTour}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCommit();
          }
        }}
        aria-label={`${typeof children === "string" ? children : "Finish"}. ${hint}.`}
        className={cn("btn btn-primary relative h-[60px] w-full overflow-hidden text-[17px] [-webkit-touch-callout:none]", holding && "scale-[0.985]", className)}
      >
        {/* The fill. Slow while holding, quick to snap back. */}
        <span key={nudge} className={cn("relative flex items-center gap-2", nudge > 0 && "nm-nudge")}>
          {children}
        </span>
        {/* The fill, carrying its own copy of the label so the text stays readable as it passes. */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--forest)]"
          style={{
            clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
            transition: holding ? `clip-path ${HOLD_MS}ms linear` : "clip-path 220ms var(--ease-out)",
          }}
        >
          {children}
        </span>
      </button>
      <p className={cn("mt-2 text-center text-[13px] transition-colors duration-200", nudge > 0 ? "text-[var(--hot)]" : "text-[var(--ink-3)]")}>
        {nudge > 0 ? "Keep holding until it fills" : hint}
      </p>
    </div>
  );
}
