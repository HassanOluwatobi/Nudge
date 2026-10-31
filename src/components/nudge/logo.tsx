export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <circle cx="16" cy="16" r="7.5" fill="none" strokeWidth="2.2" className="stroke-primary-foreground" opacity="0.55" />
      <circle cx="16" cy="16" r="3" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-serif text-lg tracking-tight">NudgeMe</span>
    </span>
  );
}
