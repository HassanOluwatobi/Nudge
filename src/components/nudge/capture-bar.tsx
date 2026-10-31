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
    ? "Saved as an idea. It comes back in 3 days."
    : p.type === "note"
      ? "Saved as a note."
      : p.bucket === "today"
        ? "Added to Today."
        : p.bucket === "later"
          ? "Added to Later."
          : "Added to This week.";

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
    <div className="nm-rise w-full rounded-2xl border bg-popover p-3.5 text-popover-foreground shadow-[0_8px_30px_-12px_rgb(60_45_20/0.25)]">
      <p className="text-sm font-medium">{placeLabel(place)}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Move to</span>
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
            className="h-7 rounded-full bg-muted px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
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
      toast(`Saved ${refs.length} things. Tap any of them to change where it lives.`, { duration: 4000 });
    }
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 rounded-full border bg-card p-1.5 pl-5 shadow-[0_6px_24px_-14px_rgb(60_45_20/0.35)] focus-within:ring-3 focus-within:ring-ring/30"
    >
      <input
        ref={inputRef}
        value={interim ? (value ? value + " " : "") + interim : value}
        onChange={(e) => {
          setInterim("");
          setValue(e.target.value);
        }}
        placeholder={speech.listening ? "Listening. Say anything." : placeholder}
        aria-label="Capture a thought"
        enterKeyHint="send"
        className="h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground/80"
      />
      {speech.supported && (
        <button
          type="button"
          onClick={speech.toggle}
          aria-label={speech.listening ? "Stop listening" : "Speak a thought"}
          aria-pressed={speech.listening}
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-full transition-colors",
            speech.listening ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent"
          )}
        >
          {speech.listening && (
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/30 motion-reduce:hidden" />
          )}
          {speech.listening ? <Square className="size-3.5 fill-current" /> : <Mic className="size-[18px]" />}
        </button>
      )}
      <button
        type="submit"
        aria-label="Save"
        disabled={!value.trim() && !interim}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-all disabled:bg-muted disabled:text-muted-foreground"
      >
        <ArrowUp className="size-[18px]" />
      </button>
    </form>
  );
}
