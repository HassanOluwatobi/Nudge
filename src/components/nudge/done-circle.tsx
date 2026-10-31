"use client";

import { cn } from "@/lib/utils";

/** The check circle. Fills sage and draws a check when tapped. */
export function DoneCircle({
  done,
  onClick,
  size = "md",
  label,
}: {
  done: boolean;
  onClick: () => void;
  size?: "md" | "lg";
  label: string;
}) {
  const box = size === "lg" ? "size-9" : "size-7";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={done}
      className={cn(
        "group/done relative grid shrink-0 place-items-center rounded-full outline-none",
        "before:absolute before:-inset-2.5 before:content-['']",
        "focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
    >
      <span
        className={cn(
          box,
          "grid place-items-center rounded-full border-[1.5px] transition-all duration-200 ease-out",
          done
            ? "border-primary bg-primary text-primary-foreground scale-100"
            : "border-muted-foreground/40 bg-card group-hover/done:border-primary group-hover/done:bg-accent group-active/done:scale-90"
        )}
      >
        {done && (
          <svg viewBox="0 0 24 24" className={size === "lg" ? "size-5" : "size-4"} fill="none" aria-hidden>
            <path
              className="nm-check-path"
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
