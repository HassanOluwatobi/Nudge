import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy and about · NudgeMe",
  description: "NudgeMe is free, needs no account, and keeps your list on your own phone.",
};

const Item = ({ q, children }: { q: string; children: React.ReactNode }) => (
  <section className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_-20px_rgb(120_70_90/0.35)]">
    <h2 className="text-[17px] font-semibold text-[var(--plum)]">{q}</h2>
    <div className="mt-1.5 space-y-2 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <main className="relative z-10 mx-auto min-h-dvh w-full max-w-md px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      <Link href="/" aria-label="Back to NudgeMe" className="candy candy-soft grid size-11 place-items-center rounded-full p-0">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="mt-5 font-serif text-[36px] leading-tight tracking-tight text-[var(--plum)]">
        Privacy <em className="serif-em">and about</em>
      </h1>
      <p className="mt-2 text-[16px] text-muted-foreground">The short version: your list is yours, and it stays on your phone.</p>

      <div className="mt-6 space-y-3">
        <Item q="What is NudgeMe?">
          <p>A calm to-do helper made for people with ADHD, and anyone who feels overwhelmed. You write everything down, it picks one thing, and it makes the first step small.</p>
        </Item>
        <Item q="Does it cost anything?">
          <p>No. NudgeMe is free. No ads, no trial, no card details.</p>
        </Item>
        <Item q="Where is my list saved?">
          <p>Only in this browser on this device. There is no account and no server that stores your tasks. Sorting your list happens on your phone. Nothing you type is sent anywhere.</p>
          <p>Because of this, clearing your browser data deletes your list. Use Export in Settings to keep a copy or move to a new phone.</p>
        </Item>
        <Item q="What about speaking instead of typing?">
          <p>The Speak button uses your browser&apos;s own voice typing. On some browsers, like Chrome, your voice is sent to the browser maker (for example Google) to turn it into text. If you prefer, just type.</p>
        </Item>
        <Item q="How do reminders work?">
          <p>NudgeMe adds reminders to your phone&apos;s own calendar. Your calendar app shows them, even when NudgeMe is closed. To stop them, delete them in your calendar.</p>
        </Item>
        <Item q="Do you track me?">
          <p>No analytics, no cookies, no trackers. The site is hosted on Vercel, which keeps standard server logs, like any website.</p>
        </Item>
        <Item q="How do I delete everything?">
          <p>Open My list, then Settings, then Clear everything. It is gone right away.</p>
        </Item>
        <Item q="Who made this?">
          <p>NudgeMe is made by Hassan, an independent designer who builds tools that make busy heads feel lighter.</p>
        </Item>
      </div>

      <Link href="/" className="candy mt-8 h-[56px] w-full text-[16px]">
        Back to NudgeMe
      </Link>
    </main>
  );
}
