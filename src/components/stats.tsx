"use client";

import { Analytics } from "@vercel/analytics/next";

// Cookieless page counts. Only the page path is sent: never the #link code or anything after "?".
export function Stats() {
  return (
    <Analytics
      beforeSend={(event) => {
        const u = new URL(event.url);
        return { ...event, url: u.origin + u.pathname };
      }}
    />
  );
}
