"use client";

import { Check, MoreVertical, Share, SquarePlus } from "lucide-react";
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

const standalone = () =>
  typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** Add to Home Screen. Installed, NudgeMe opens full screen with no address bar. */
export function InstallButton() {
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

  if (installed)
    return (
      <div className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white text-[15px] font-medium text-signal-ink ring-1 ring-line">
        <Check className="size-4" /> On your home screen
      </div>
    );

  return (
    <>
      <button
        type="button"
        className="btn btn-ink w-full gap-2"
        onClick={async () => {
          feel("tap", "medium");
          const o = offer();
          if (o) {
            await o.prompt();
            const r = await o.userChoice;
            clearOffer();
            setReady(false);
            if (r.outcome === "accepted") setInstalled(true);
          } else setHelp(true);
        }}
      >
        <SquarePlus className="size-[18px]" /> Add NudgeMe to Home Screen
      </button>
      <p className="t-small mt-2 text-center text-ink-3">{ready ? "One tap. Opens full screen, like an app." : plat === "ios" ? "iPhone asks for two taps in Safari. We show you where." : "Opens full screen, like an app. Works offline."}</p>
      <Sheet open={help} onClose={() => setHelp(false)} title="Add to Home Screen">
        <ol className="mt-2 space-y-3">
          {(plat === "ios"
            ? [
                { icon: <Share className="size-5" />, t: "Tap the Share button", s: "At the bottom of Safari, or next to the address." },
                { icon: <SquarePlus className="size-5" />, t: "Choose Add to Home Screen", s: "Scroll the list if you do not see it." },
                { icon: <Check className="size-5" />, t: "Tap Add", s: "Open NudgeMe from your home screen. It fills the whole screen." },
              ]
            : [
                { icon: <MoreVertical className="size-5" />, t: "Open the browser menu", s: "The three dots at the top right." },
                { icon: <SquarePlus className="size-5" />, t: "Choose Install app or Add to Home screen", s: "The name depends on your browser." },
                { icon: <Check className="size-5" />, t: "Confirm", s: "Open NudgeMe from your home screen. It fills the whole screen." },
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
