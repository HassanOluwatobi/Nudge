"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Free, built-in speech recognition. Hidden when the browser lacks it. */
type Rec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** How long a pause has to be before what you said counts as one item. */
const PAUSE_MS = 1100;

/**
 * Speech to text, one item per pause. Say a thing, pause, say the next thing.
 * Each pause sends what came before it as a finished line, so a spoken list
 * becomes a list. Phones that stop listening on silence are quietly restarted
 * until you tap the mic again.
 */
export function useSpeech(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  const want = useRef(false);
  const muted = useRef(false);
  const pending = useRef("");
  const done = useRef(0); // words of this session already sent as lines
  const words = useRef(0); // words heard so far this session
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const line = pending.current.trim();
    pending.current = "";
    done.current = words.current;
    if (line && !muted.current) cb.current(line, true);
    cb.current("", false);
  }, []);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    (r as Rec & { onstart: (() => void) | null }).onstart = () => {
      done.current = 0;
      words.current = 0;
      pending.current = "";
    };
    r.onresult = (e) => {
      if (muted.current) return;
      // Everything heard this session. Some phones repeat the whole phrase in each piece, so don't double it.
      let full = "";
      for (let i = 0; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript.replace(/\s+/g, " ").trim();
        if (!seg) continue;
        full = full && seg.toLowerCase().startsWith(full.toLowerCase()) ? seg : full ? `${full} ${seg}` : seg;
      }
      const all = full ? full.split(" ") : [];
      words.current = all.length;
      if (done.current > all.length) done.current = all.length;
      pending.current = all.slice(done.current).join(" ");
      cb.current(pending.current, false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(commit, PAUSE_MS);
    };
    r.onend = () => {
      commit();
      if (want.current) {
        // The phone stopped on its own after a silence. Keep listening.
        setTimeout(() => {
          if (!want.current) return;
          try {
            r.start();
          } catch {
            want.current = false;
            setListening(false);
          }
        }, 120);
      } else setListening(false);
    };
    r.onerror = ((ev: { error?: string }) => {
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed" || ev?.error === "audio-capture") want.current = false;
    }) as unknown as () => void;
    rec.current = r;
    setSupported(true);
    return () => {
      want.current = false;
      try {
        r.stop();
      } catch {}
    };
  }, [commit]);

  const toggle = useCallback(() => {
    const r = rec.current;
    if (!r) return;
    if (want.current) {
      want.current = false;
      setListening(false);
      try {
        r.stop();
      } catch {}
    } else {
      try {
        muted.current = false;
        want.current = true;
        r.start();
        setListening(true);
      } catch {
        want.current = false;
        setListening(false);
      }
    }
  }, []);

  /** Stop without keeping the words still being heard (the caller already used them). */
  const stopQuiet = useCallback(() => {
    want.current = false;
    if (timer.current) clearTimeout(timer.current);
    pending.current = "";
    muted.current = true;
    try {
      rec.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, toggle, stopQuiet };
}
