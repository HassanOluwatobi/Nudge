"use client";

import { useEffect } from "react";

/**
 * iPhone Safari does not shrink the page when the keyboard opens, so anything
 * pinned to the bottom ends up behind the keys. We read the visual viewport and
 * publish two CSS variables:
 *   --kb   how much of the screen the keyboard covers
 *   --vvh  the height that is actually visible
 * Sheets use them to sit right on top of the keyboard.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        // Ignore small changes from the browser toolbar sliding.
        root.style.setProperty("--kb", `${kb > 80 ? Math.round(kb) : 0}px`);
        root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
        root.dataset.kb = kb > 80 ? "open" : "closed";
        if (kb > 80) {
          const el = document.activeElement as HTMLElement | null;
          if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.closest("dialog")) {
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
}
