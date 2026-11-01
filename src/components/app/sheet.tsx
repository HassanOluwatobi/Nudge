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
        <div className="grabber" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-2">
          <h2 className={hideTitle ? "sr-only" : "text-[17px] font-semibold"}>{title}</h2>
          <button type="button" className="icon-btn -mr-2" aria-label="Close" onClick={() => closeRef.current()}>
            <X className="size-5" />
          </button>
        </div>
        {(open || show) && <div className="px-5 pb-2">{children}</div>}
      </div>
    </dialog>
  );
}
