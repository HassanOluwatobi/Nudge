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

export function useSpeech(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec | null>(null);
  const cb = useRef(onText);
  const pending = useRef("");
  const muted = useRef(false);
  cb.current = onText;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    // Each result is sent as final once only. Some browsers repeat earlier results.
    const sent = new Set<number>();
    (r as Rec & { onstart: (() => void) | null }).onstart = () => (sent.clear(), (pending.current = ""), (muted.current = false));
    r.onresult = (e) => {
      if (muted.current) return;
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          if (!sent.has(i)) {
            sent.add(i);
            finalText += ` ${res[0].transcript}`;
          }
        } else interim += res[0].transcript;
      }
      // Finished words are kept. Words still being heard show live, and are
      // replaced as the browser refines them.
      if (finalText.trim()) cb.current(finalText.trim(), true);
      pending.current = interim.trim();
      cb.current(pending.current, false);
    };
    // If listening stops before the browser marks the last words final, keep them anyway.
    const finish = () => {
      setListening(false);
      if (pending.current) cb.current(pending.current, true);
      pending.current = "";
      cb.current("", false);
    };
    r.onend = finish;
    r.onerror = finish;
    rec.current = r;
    setSupported(true);
    return () => {
      try {
        r.stop();
      } catch {}
    };
  }, []);

  const toggle = useCallback(() => {
    const r = rec.current;
    if (!r) return;
    if (listening) {
      r.stop();
      setListening(false);
    } else {
      try {
        muted.current = false;
        r.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }, [listening]);

  /** Stop without keeping the words still being heard (the caller already used them). */
  const stopQuiet = useCallback(() => {
    pending.current = "";
    muted.current = true;
    try {
      rec.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, toggle, stopQuiet };
}
