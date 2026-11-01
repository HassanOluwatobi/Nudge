import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Two font files only, so the first screen loads fast on slow phones.
const GeistSans = localFont({ src: "./fonts/Geist-Variable.woff2", variable: "--font-geist-sans", weight: "100 900", display: "swap" });
const GeistSerif = localFont({
  src: "./fonts/GeistSerifVF.woff2",
  variable: "--font-geist-serif",
  weight: "400",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "NudgeMe",
  description: "One calm step at a time. Put down what is on your mind, choose one thing, and start with a small first step. Free, no account, works offline.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NudgeMe", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistSerif.variable}`}>
      <body>
        {/* Set light or dark before the first paint, so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=(JSON.parse(localStorage.getItem('nudgeme.v11')||'{}').settings||{}).theme||'light';if(t==='auto')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;if(!/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)||matchMedia('(display-mode: standalone)').matches){var m=document.createElement('meta');m.name='theme-color';m.content=t==='dark'?'#08090a':'#f3eee4';document.head.appendChild(m);}}catch(e){}",
          }}
        />
        {/* Catch Chrome's install offer as early as possible, so the Install button can use it with one tap. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;window.dispatchEvent(new Event('nudge:installable'))});",
          }}
        />
        {children}
        <Toaster position="top-center" offset={16} mobileOffset={{ top: 12 }} />
      </body>
    </html>
  );
}
