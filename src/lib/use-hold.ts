"use client";

import { useRef, useState } from "react";
import { haptic } from "@/lib/feedback";

/**
 * Press and hold to open options. Works the same on iPhone, Android and with
 * a mouse (right-click). A small finger drift is fine, a real move (a scroll
 * or swipe) cancels it. The tap that follows a hold is swallowed, so holding
 * never also opens the item.
 */
export function useHold(onHold: () => void, ms = 420) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const [pressing, setPressing] = useState(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
    setPressing(false);
  };
  const fire = () => {
    held.current = true;
    cancel();
    haptic("medium");
    onHold();
  };

  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button > 0) return;
      held.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      setPressing(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(fire, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!held.current) fire();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (held.current) {
        e.preventDefault();
        e.stopPropagation();
        held.current = false;
      }
    },
    // Stops iOS from selecting text or showing its own callout on a long press.
    style: { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } as React.CSSProperties,
  };
  return { bind, pressing, cancel };
}
