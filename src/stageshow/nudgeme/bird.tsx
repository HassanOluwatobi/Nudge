/** Nudge, the hummingbird. Darts around like a busy mind, then hovers on one flower. */
export function Bird({ className, color = "currentColor", flap = false }: { className?: string; color?: string; flap?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill={color}>
      {/* Far wing, a shade lighter */}
      <path className={flap ? "nm-flap-b" : undefined} style={{ transformOrigin: "56px 40px" }} d="M56 40 C 48 26, 44 14, 46 2 C 54 12, 60 24, 62 38 Z" opacity="0.5" />
      {/* Tail, forked */}
      <path d="M38 64 L 22 90 L 33 80 L 34 96 L 44 70 Z" />
      {/* Body, tilted up the way a hovering hummingbird holds itself */}
      <path d="M58 34 C 47 40, 38 52, 35 63 C 33 71, 39 74, 45 69 C 55 60, 63 50, 68 39 Z" />
      {/* Head */}
      <circle cx="64" cy="31" r="9.5" />
      {/* Beak */}
      <path d="M71 27 L 99 20 L 72 34 Z" />
      {/* Near wing, swept back */}
      <path className={flap ? "nm-flap" : undefined} style={{ transformOrigin: "54px 42px" }} d="M54 42 C 40 34, 26 22, 14 6 C 30 12, 46 22, 62 38 Z" />
    </svg>
  );
}

