import type { Metadata } from "next";
import Link from "next/link";
import { LaunchHero } from "@/stageshow/hero";
import { Mark } from "@/components/garden/bird";

export const metadata: Metadata = {
  title: "NudgeMe · One calm step at a time",
  description: "A free to-do helper for ADHD brains. Write everything down. NudgeMe chooses one thing and makes the first step small.",
};

export default function Launch() {
  return (
    <main className="relative z-10 mx-auto min-h-dvh w-full max-w-6xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-16 text-[var(--ink)]">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.03em]">
          <Mark className="size-8" /> NudgeMe
        </span>
        <Link href="/" className="btn btn-primary h-10 px-4 text-[14px]">
          Open the app
        </Link>
      </header>

      <section className="mt-10 grid items-center gap-10 md:mt-16 md:grid-cols-[1fr_620px] md:gap-12">
        <div className="max-w-[30rem]">
          <h1 className="text-[44px] leading-[1.02] font-semibold tracking-[-0.04em] md:text-[60px]">One calm step at a time.</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-[var(--ink-2)]">
            A free to-do helper for busy ADHD brains. Write everything down. NudgeMe chooses one thing, makes the first step small, and lights a stone on your path every time you finish.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className="btn btn-primary h-14 px-7 text-[17px]">
              Start for free
            </Link>
            <span className="text-[14px] text-[var(--ink-3)]">No sign-up. Your list stays on your phone.</span>
          </div>
        </div>
        <div className="w-full">
          <LaunchHero />
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[var(--ink-3)]">
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy and about
        </Link>
        <span>Made for people who feel overwhelmed by their to-do list.</span>
      </footer>
    </main>
  );
}
