import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Two font files only, so the first screen loads fast on slow phones.
const GeistSans = localFont({ src: "./fonts/Geist-Variable.woff2", variable: "--font-geist-sans", weight: "100 900", display: "swap" });
const GeistSerif = localFont({ src: "./fonts/GeistSerifVF.woff2", variable: "--font-geist-serif", weight: "400", display: "swap", fallback: ["Georgia", "Times New Roman", "serif"] });

export const metadata: Metadata = {
  title: "NudgeMe",
  description:
    "One calm step at a time. A free, simple to-do helper for ADHD. Write everything down, NudgeMe picks one thing and makes it small enough to start. No sign-up.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NudgeMe", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fde6da",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistSerif.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light">
          {children}
          <Toaster position="top-center" offset={16} mobileOffset={{ top: 12 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
