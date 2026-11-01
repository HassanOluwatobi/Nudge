"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBackClose } from "@/lib/use-back";

/**
 * A bottom sheet built on the native <dialog>. The browser handles focus,
 * Escape and screen readers. The phone's Back button closes it too.
 */
export function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  children,
  initialFocus,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hideTitle?: boolean;
  children: React.ReactNode;
  initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [show, setShow] = useState(open);
  useBackClose(open, onClose);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.classList.remove("closing");
      setShow(true);
      d.showModal();
      initialFocus?.current?.focus();
    } else if (!open && d.open) {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        d.close();
        setShow(false);
        return;
      }
      d.classList.add("closing");
      const t = setTimeout(() => {
        d.classList.remove("closing");
        d.close();
        setShow(false);
      }, 190);
      return () => clearTimeout(t);
    }
  }, [open, initialFocus]);

  // Drag the top of the sheet down to close it, like a native sheet.
  const drag = useRef<{ y0: number; t: number; y: number; v: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, t: e.timeStamp, y: 0, v: 0 };
    if (ref.current) ref.current.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    const d = ref.current;
    if (!g || !d) return;
    const raw = e.clientY - g.y0;
    // Rubber-band when pulled up, follow the finger 1:1 when pulled down.
    const y = raw < 0 ? -((-raw * 0.55 * 80) / (80 + 0.55 * -raw)) : raw;
    const dt = Math.max(1, e.timeStamp - g.t);
    g.v = ((y - g.y) / dt) * 1000;
    g.y = y;
    g.t = e.timeStamp;
    d.style.transform = `translateY(${y}px)`;
  };
  const onUp = () => {
    const g = drag.current;
    const d = ref.current;
    drag.current = null;
    if (!g || !d) return;
    // Project where the flick is heading, then decide.
    const projected = g.y + ((g.v / 1000) * 0.99) / (1 - 0.99);
    d.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
    if (projected > 140) {
      d.style.transform = `translateY(${d.offsetHeight}px)`;
      setTimeout(() => {
        d.style.transition = "";
        d.style.transform = "";
        d.close();
        setShow(false);
        closeRef.current();
      }, 260);
    } else {
      d.style.transform = "";
      setTimeout(() => (d.style.transition = ""), 330);
    }
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onClick={(e) => {
        // A tap on the dimmed area outside closes the sheet.
        if (e.target === ref.current) closeRef.current();
      }}
    >
      <div className="safe-b">
        <div className="touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="grabber" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-2">
          <h2 className={hideTitle ? "sr-only" : "text-[17px] font-semibold"}>{title}</h2>
          <button type="button" className="icon-btn -mr-2" aria-label="Close" onClick={() => closeRef.current()}>
            <X className="size-5" />
          </button>
        </div>
        </div>
        {(open || show) && <div className="px-5 pb-2">{children}</div>}
      </div>
    </dialog>
  );
}
