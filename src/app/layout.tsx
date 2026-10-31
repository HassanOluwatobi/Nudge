import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistSerif } from "geist/font/serif";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "NudgeMe",
  description:
    "One calm step at a time. Dump everything on your mind. NudgeMe picks out one thing and makes it small enough to start.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#221f1b" },
  ],
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="bottom-center" offset={160} mobileOffset={{ bottom: 160 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
