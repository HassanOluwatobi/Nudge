"use client";

import { Bell, Check, Maximize2, MoreHorizontal, MoreVertical, Share, ShieldCheck, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { feel } from "@/lib/feedback";
import { platform } from "@/lib/reminders";
import { Sheet } from "./sheet";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
// The offer is caught by a tiny script in the page head, before React loads.
const offer = () => (typeof window === "undefined" ? null : ((window as Window & { __bip?: Prompt | null }).__bip ?? null));
const clearOffer = () => {
  (window as Window & { __bip?: Prompt | null }).__bip = null;
};

export const standalone = () =>
  typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** Add to Home Screen. Installed, Shrink my day opens full screen with no address bar. */
export function InstallButton({ compact = false, variant = "button" }: { compact?: boolean; variant?: "button" | "row" }) {
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setInstalled(standalone());
    setReady(!!offer());
    const on = () => setReady(true);
    const done = () => setInstalled(true);
    window.addEventListener("nudge:installable", on);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("nudge:installable", on);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  const plat = typeof window === "undefined" ? "other" : platform();
  const go = async () => {
    feel("tap", "medium");
    const o = offer();
    if (o) {
      await o.prompt();
      const r = await o.userChoice;
      clearOffer();
      setReady(false);
      if (r.outcome === "accepted") setInstalled(true);
    } else setHelp(true);
  };

  if (installed && variant === "row") return null;
  if (installed)
    return (
      <div className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white text-[15px] font-medium text-signal-ink ring-1 ring-line">
        <Check className="size-4" /> On your home screen
      </div>
    );

  return (
    <>
      {variant === "row" ? (
        <button type="button" onClick={go} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-line transition-transform active:scale-[0.99]">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-signal-soft text-signal-ink">
            <SquarePlus className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Add to Home Screen</span>
            <span className="t-small block text-ink-3">Opens like an app and keeps your list safe.</span>
          </span>
          <span className="inline-flex h-8 items-center rounded-full bg-signal px-3.5 text-[13px] font-semibold text-white">Add</span>
        </button>
      ) : (
        <button type="button" className="btn btn-ink w-full gap-2" onClick={go}>
          <SquarePlus className="size-[18px]" /> Add Shrink my day to Home Screen
        </button>
      )}
      {!compact && variant === "button" && <p className="t-small mt-2 text-center text-ink-3">{ready ? "One tap. Opens full screen, like an app." : plat === "ios" ? "iPhone asks for two taps in Safari. We show you where." : "Opens full screen, like an app. Works offline."}</p>}
      <Sheet open={help} onClose={() => setHelp(false)} title="Add to Home Screen">
        <ol className="mt-2 space-y-3">
          {(plat === "ios"
            ? [
                { icon: <Share className="size-5" />, t: "Tap the Share button", s: "At the bottom of Safari, or next to the address." },
                { icon: <SquarePlus className="size-5" />, t: "Choose Add to Home Screen", s: "Scroll down if you don't see it." },
                { icon: <Check className="size-5" />, t: "Tap Add", s: "Open Shrink my day from your home screen. It fills the whole screen." },
              ]
            : [
                { icon: <MoreVertical className="size-5" />, t: "Open the browser menu", s: "The three dots at the top right." },
                { icon: <SquarePlus className="size-5" />, t: "Choose Install app or Add to Home screen", s: "The name depends on your browser." },
                { icon: <Check className="size-5" />, t: "Confirm", s: "Open Shrink my day from your home screen. It fills the whole screen." },
              ]
          ).map((x, i) => (
            <li key={x.t} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-ink">{x.icon}</span>
              <span>
                <span className="block font-semibold">
                  {i + 1}. {x.t}
                </span>
                <span className="t-small text-ink-2">{x.s}</span>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-signal mt-5 w-full" onClick={() => setHelp(false)}>
          Got it
        </button>
      </Sheet>
    </>
  );
}

/**
 * A gentle card on Home from the second day of use, until Shrink my day is on the
 * Home Screen. On iPhone, Safari can clear a website's saved data after about
 * a week without a visit. Installed apps keep it.
 */
export function InstallCard() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (standalone()) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const days: string[] = JSON.parse(localStorage.getItem("nudgeme.days") || "[]");
      if (!days.includes(today)) days.push(today);
      localStorage.setItem("nudgeme.days", JSON.stringify(days.slice(-10)));
      const snoozed = localStorage.getItem("nudgeme.installLater");
      if (days.length >= 2 && (!snoozed || Date.now() - Number(snoozed) > 7 * 864e5)) setShow(true);
    } catch {
      /* private mode: skip the card */
    }
  }, []);
  if (!show) return null;
  return (
    <section className="mt-6 rounded-[20px] bg-white p-4 ring-1 ring-line" aria-label="Keep your tasks safe">
      <p className="text-[15px] font-semibold">Keep your tasks safe</p>
      <p className="t-small mt-1 text-ink-2">Add Shrink my day to your Home Screen. Phones sometimes wipe websites you haven't opened in a while. Home Screen apps keep everything.</p>
      <div className="mt-3">
        <InstallButton compact />
      </div>
      <button
        type="button"
        className="btn btn-quiet mt-1 min-h-10 w-full text-[14px]"
        onClick={() => {
          try {
            localStorage.setItem("nudgeme.installLater", String(Date.now()));
          } catch {}
          setShow(false);
        }}
      >
        Not now
      </button>
    </section>
  );
}

const ASK = "nudgeme.installAsk";
/** Should the Home Screen popup show now? Never when installed, at most 3 times, 3 days apart. */
export function installAskDue() {
  if (typeof window === "undefined" || standalone()) return false;
  try {
    const a = JSON.parse(localStorage.getItem(ASK) || "{}") as { n?: number; at?: number; never?: boolean };
    if (a.never || (a.n ?? 0) >= 3) return false;
    return !a.at || Date.now() - a.at > 3 * 864e5;
  } catch {
    return false;
  }
}
function noteAsk(never = false) {
  try {
    const a = JSON.parse(localStorage.getItem(ASK) || "{}") as { n?: number };
    localStorage.setItem(ASK, JSON.stringify({ n: (a.n ?? 0) + 1, at: Date.now(), never }));
  } catch {
    /* fine */
  }
}

/** The popup that sells the Home Screen in three plain reasons, then helps you do it. */
export function InstallPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!open) return;
    noteAsk();
    setReady(!!offer());
    const on = () => setReady(true);
    window.addEventListener("nudge:installable", on);
    return () => window.removeEventListener("nudge:installable", on);
  }, [open]);
  const plat = typeof window === "undefined" ? "other" : platform();
  const add = async () => {
    const o = offer();
    if (!o) return;
    feel("tap");
    await o.prompt();
    const r = await o.userChoice;
    clearOffer();
    if (r.outcome === "accepted") (feel("done"), noteAsk(true), onClose());
  };
  const reasons = [
    { icon: <Bell className="size-5" />, t: "Reminders that actually ring", s: plat === "ios" ? "iPhone only lets Shrink my day ring when it's closed once it's on your Home Screen." : "Your reminders ring even when Shrink my day is closed." },
    { icon: <ShieldCheck className="size-5" />, t: "Your list stays safe", s: "Phones can wipe websites you haven't opened in a while. Home Screen apps keep everything." },
    { icon: <Maximize2 className="size-5" />, t: "One tap away", s: "It opens full screen, like any other app." },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Add to Home Screen" hideTitle>
      <div className="flex flex-col items-center pt-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={52} height={52} className="size-[52px] rounded-[14px]" />
        <h2 className="mt-3 font-serif text-[24px] leading-tight tracking-[-0.01em]">Put Shrink my day on your Home Screen</h2>
        <p className="t-small mt-1 text-ink-2">Ten seconds, and everything works better.</p>
      </div>
      <ul className="mt-4 divide-y divide-line/70 overflow-hidden rounded-[18px] bg-white ring-1 ring-line">
        {reasons.map((r) => (
          <li key={r.t} className="flex items-start gap-3 px-3 py-2.5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] bg-signal-soft text-signal-ink [&>svg]:size-[18px]">{r.icon}</span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{r.t}</span>
              <span className="block text-[13px] leading-snug text-ink-2">{r.s}</span>
            </span>
          </li>
        ))}
      </ul>

      {ready ? (
        <button type="button" className="btn btn-signal mt-4 w-full" onClick={add}>
          <SquarePlus className="size-5" /> Add to Home Screen
        </button>
      ) : (
        <div className="mt-3 rounded-[18px] bg-paper px-4 py-3">
          <p className="text-[14px] font-semibold">How to add it</p>
          <ol className="mt-2 space-y-2 text-[14px] text-ink-2">
            {(plat === "ios"
              ? [
                  <>Tap <Share className="inline size-4 -translate-y-0.5 text-ink" /> Share in Safari. If you don&apos;t see it, tap <MoreHorizontal className="inline size-4 -translate-y-0.5 text-ink" /> first.</>,
                  <>Choose <span className="font-semibold text-ink">Add to Home Screen</span>. Scroll down if it&apos;s hidden.</>,
                  <>Tap <span className="font-semibold text-ink">Add</span>, then open Shrink my day from its new icon.</>,
                ]
              : [
                  <>Open the browser menu <MoreVertical className="inline size-4 -translate-y-0.5 text-ink" /> at the top right.</>,
                  <>Choose <span className="font-semibold text-ink">Install app</span> or <span className="font-semibold text-ink">Add to Home screen</span>.</>,
                  <>Confirm, then open Shrink my day from its new icon.</>,
                ]
            ).map((x, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-ink ring-1 ring-line">{i + 1}</span>
                <span>{x}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <button type="button" className="btn btn-quiet mt-2 w-full text-[15px]" onClick={onClose}>
        {ready ? "Maybe later" : "Got it, I'll do it now"}
      </button>
    </Sheet>
  );
}
