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
  themeColor: "#0d2a8c",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistSerif.variable}`}>
      <body>
        {children}
        <Toaster position="top-center" offset={16} mobileOffset={{ top: 12 }} />
      </body>
    </html>
  );
}
