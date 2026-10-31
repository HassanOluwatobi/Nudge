"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Bucket, type EntryKind, parseCapture, splitDump } from "@/lib/nudge";
import type { Actions } from "@/lib/use-nudge";
import { useSpeech } from "@/lib/use-speech";

type Ref = { type: "task" | EntryKind; id: string };
type Place = { type: "task" | EntryKind; bucket?: Bucket };

const placeLabel = (p: Place) =>
  p.type === "idea"
    ? "Saved as an idea. I'll bring it back in 3 days."
    : p.type === "note"
      ? "Saved as a note."
      : p.bucket === "today"
        ? "Added to today."
        : p.bucket === "later"
          ? "Saved for later."
          : "Added to this week.";

const OPTIONS: { label: string; place: Place }[] = [
  { label: "Today", place: { type: "task", bucket: "today" } },
  { label: "This week", place: { type: "task", bucket: "week" } },
  { label: "Later", place: { type: "task", bucket: "later" } },
  { label: "Idea", place: { type: "idea" } },
  { label: "Note", place: { type: "note" } },
];

function SortToast({ toastId, initial, initialPlace, actions }: { toastId: string | number; initial: Ref; initialPlace: Place; actions: Actions }) {
  const [ref, setRef] = useState(initial);
  const [place, setPlace] = useState(initialPlace);
  const same = (p: Place) => p.type === place.type && (p.type !== "task" || p.bucket === place.bucket);
  return (
    <div className="nm-rise w-full rounded-3xl bg-white p-4 text-popover-foreground shadow-[0_18px_40px_-18px_rgb(120_70_90/0.45)]">
      <p className="text-[15px] font-semibold text-[var(--plum)]">🌱 {placeLabel(place)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Wrong spot? Move to</span>
        {OPTIONS.filter((o) => !same(o.place)).map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => {
              const next = actions.convert(ref, o.place.type, o.place.bucket);
              setRef(next);
              setPlace(o.place);
              setTimeout(() => toast.dismiss(toastId), 900);
            }}
            className="h-8 rounded-full bg-[#f4eff8] px-3 text-xs font-semibold text-[var(--plum)] transition-colors hover:bg-[#ebe3f7]"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CaptureBar({ actions, placeholder = "What's on your mind?" }: { actions: Actions; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [interim, setInterim] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeech((text, final) => {
    if (final) {
      setValue((v) => (v ? v + " " : "") + text);
      setInterim("");
    } else setInterim(text);
  });

  const submit = () => {
    const raw = (value + (interim ? " " + interim : "")).trim();
    if (!raw) return;
    if (speech.listening) speech.toggle();
    const parts = splitDump(raw);
    const results = parts.map((p) => parseCapture(p)).filter(Boolean) as NonNullable<ReturnType<typeof parseCapture>>[];
    if (!results.length) return;
    const refs = results.map((r) => ({ ref: actions.addParsed(r), r }));
    setValue("");
    setInterim("");
    if (refs.length === 1) {
      const { ref, r } = refs[0];
      const place: Place = r.kind === "task" ? { type: "task", bucket: r.bucket } : { type: r.kind };
      toast.custom((id) => <SortToast toastId={id} initial={ref} initialPlace={place} actions={actions} />, { duration: 6000 });
    } else {
      toast(`Saved ${refs.length} things. Open your list to tidy any of them.`, { duration: 4000 });
    }
  };

  const hasText = !!value.trim() || !!interim;

  return (
    <form
      data-tour="capture"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 rounded-full bg-white/95 p-2 pl-6 shadow-[0_2px_0_#fff_inset,0_20px_40px_-18px_rgb(120_70_90/0.4)] backdrop-blur focus-within:ring-4 focus-within:ring-[#e6dcff]"
    >
      <input
        ref={inputRef}
        value={interim ? (value ? value + " " : "") + interim : value}
        onChange={(e) => {
          setInterim("");
          setValue(e.target.value);
        }}
        placeholder={speech.listening ? "Listening. Say anything." : placeholder}
        aria-label="Tell Nudge what's on your mind"
        enterKeyHint="send"
        className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-[var(--plum)] outline-none placeholder:text-[#a08ea6]"
      />
      {hasText ? (
        <button type="submit" aria-label="Save" className="candy grid size-[52px] shrink-0 place-items-center rounded-full p-0">
          <ArrowUp className="size-5" strokeWidth={2.6} />
        </button>
      ) : speech.supported ? (
        <button
          type="button"
          onClick={speech.toggle}
          aria-label={speech.listening ? "Stop listening" : "Speak a thought"}
          aria-pressed={speech.listening}
          className={cn("candy candy-grape relative grid size-[52px] shrink-0 place-items-center rounded-full p-0")}
        >
          {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-[#ad92ff]/50 motion-reduce:hidden" />}
          {speech.listening ? <Square className="size-4 fill-current" /> : <Mic className="size-[22px]" strokeWidth={2.2} />}
        </button>
      ) : (
        <button type="submit" aria-label="Save" disabled className="candy grid size-[52px] shrink-0 place-items-center rounded-full p-0">
          <ArrowUp className="size-5" strokeWidth={2.6} />
        </button>
      )}
    </form>
  );
}
