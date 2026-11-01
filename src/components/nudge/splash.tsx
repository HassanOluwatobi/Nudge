import { Mark } from "@/components/garden/bird";

/** Shown instantly while the app wakes up, so the screen is never blank. */
export function Splash() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <Mark className="size-16" />
      <p className="mt-4 text-[26px] font-semibold tracking-[-0.03em]">NudgeMe</p>
      <p className="mt-1 text-[15px] text-[var(--ink-3)]">One calm step at a time.</p>
    </main>
  );
}
