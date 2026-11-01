import { FallbackNudge } from "@/components/garden/companion";

/** Shown instantly while the app wakes up, so the screen is never blank. */
export function Splash() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <FallbackNudge className="" />
      <p className="mt-6 font-serif text-[30px] tracking-tight text-[var(--plum)]">
        Nudge<span className="serif-em">Me</span>
      </p>
      <p className="mt-1 text-[15px] text-muted-foreground">One calm step at a time.</p>
    </main>
  );
}
