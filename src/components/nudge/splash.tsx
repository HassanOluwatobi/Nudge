/** Shown instantly while the app wakes up, so the screen is never blank. */
export function Splash() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-[28px] font-semibold tracking-[-0.03em]">
        NudgeMe<span className="text-[var(--hot)]">.</span>
      </p>
      <p className="mt-1 text-[15px] text-[var(--ink-3)]">One calm step at a time.</p>
    </main>
  );
}
