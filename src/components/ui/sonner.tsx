"use client";

import { useEffect } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/*
  Sheets are native dialogs, which sit in the browser's top layer above every
  z-index. To keep toasts in front of them, the toast area joins the top layer
  too, as a popover, and steps forward again whenever a sheet opens.
*/
export function Toaster(props: ToasterProps) {
  useEffect(() => {
    const promote = () => {
      const sec = document.querySelector<HTMLElement>('section[aria-label^="Notifications"]');
      if (!sec || !("showPopover" in sec)) return;
      if (!sec.hasAttribute("popover")) {
        sec.setAttribute("popover", "manual");
        Object.assign(sec.style, { position: "fixed", inset: "0 auto auto 0", margin: "0", padding: "0", border: "0", background: "transparent", overflow: "visible", width: "0", height: "0" });
      }
      try {
        if (sec.matches(":popover-open")) sec.hidePopover();
        sec.showPopover();
      } catch {
        /* older browsers keep the normal stacking */
      }
    };
    const mo = new MutationObserver((list) => {
      if (list.some((m) => m.target instanceof HTMLDialogElement && m.target.open)) promote();
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    const t = setTimeout(promote, 0);
    return () => (mo.disconnect(), clearTimeout(t));
  }, []);
  return <Sonner theme="light" className="toaster group" {...props} />;
}
