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
  title: "Shrink my day",
  description: "One calm step at a time. Put down what is on your mind, choose one thing, and start with a small first step. Free, no account, works offline.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Shrink my day", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const SPLASH = `<div class="splash-inner"><svg viewBox="0 0 240 240" width="88" height="88" aria-hidden="true"><path style="--i:0" d="M33.5099 36.18L31.7999 38.55L31.0499 40.38L30.6599 42.3V44.28L31.0499 46.2L32.2799 48.9L33.5399 50.43L35.8799 52.2L45.2699 55.86L51.1799 57.48L55.6499 58.32L61.4399 58.83L65.5499 58.8L73.8299 57.69L82.1399 55.23L90.4199 51.6L98.7299 47.1L117.3 35.79L127.62 30.03L135.96 26.13L147.03 22.23L148.8 21.3L151.02 19.32L152.58 16.77L153.36 13.89L153.24 10.89L152.67 8.97L151.74 7.2L149.76 4.98L148.11 3.84L145.32 2.82L137.13 1.29L125.4 0.12L116.34 0L104.85 0.87L95.8799 2.31L87.2699 4.35L78.8699 7.02L70.6499 10.32L62.7299 14.19L55.1099 18.66L47.8199 23.67L40.9199 29.19L33.5099 36.18Z"/><path style="--i:1" d="M125.34 46.6806L122.85 48.3306L120.93 50.6106L119.79 53.3706L119.49 55.3206L119.55 57.3306L120.39 60.1806L122.04 62.6706L124.32 64.5906L127.05 65.7606L156.51 68.8806L166.8 70.4106L177.12 72.3906L185.43 74.4306L193.68 76.8306L218.07 85.4106L221.07 85.4706L223.02 85.0206L224.82 84.1806L226.47 83.0106L227.82 81.5706L228.87 79.8606L229.59 77.9706L229.92 75.0006L229.65 73.0206L228.99 71.1006L223.74 60.7206L217.44 50.7606L212.07 43.7406L204.33 35.2206L196.56 28.0806L194.85 26.9106L192.96 26.1306L185.61 25.1406L179.43 25.2006L173.19 26.0406L166.71 27.6306L160.56 29.7606L152.46 33.2106L125.34 46.6806Z"/><path style="--i:2" d="M6.15008 80.3731L5.58008 83.2231L5.88008 86.1631L6.99008 88.8631L8.16008 90.4531L9.57008 91.7731L12.1501 93.2131L15.0001 93.8431L22.6201 93.3331L28.8001 92.1931L36.8101 89.8831L45.0901 86.7631L52.2901 83.5231L54.6601 81.6331L56.3701 79.1131L57.2701 76.2031L57.2401 73.1431L56.3401 70.2331L54.6001 67.7431L53.0701 66.3931L50.3401 65.0431L48.3601 64.5931L36.8401 63.6631L30.6601 62.5231L23.4301 60.6331L20.4001 60.4531L17.4301 61.1731L15.6301 62.1331L14.0701 63.4531L12.7801 65.0131L9.66008 71.4631L6.15008 80.3731Z"/><path style="--i:3" d="M62.43 91.2916L59.64 92.4616L58.02 93.6616L56.67 95.1616L55.65 96.8716L54.99 98.7916L54.72 101.792L55.35 104.732L56.22 106.532L57.45 108.152L59.79 110.012L61.62 110.852L63.6 111.302L117.3 114.302L133.86 115.802L142.11 117.032L152.37 119.072L185.46 127.172L193.74 128.522L202.02 129.242L210.03 129.182L216.45 128.612L224.49 127.202L232.71 125.102L235.26 123.692L237.33 121.622L238.32 119.942L239.19 117.152L239.25 114.212L238.83 108.422L238.17 105.602L237.3 103.862L236.1 102.302L234.63 101.042L232.95 100.052L230.16 99.2116L222.57 98.5816L216.27 97.6516L210.09 96.3616L203.91 94.6216L191.55 90.0916L168.93 79.8616L160.74 76.4716L152.28 73.6516L144 71.8216L137.79 71.1616L131.61 71.1016L125.43 71.6116L117.24 73.1716L105 76.8016L76.14 87.3316L62.43 91.2916Z"/><path style="--i:4" d="M0 107.91V109.95L0.36 111.93L1.11 113.79L2.25 115.47L3.66 116.91L5.34 118.05L7.2 118.8L9.21 119.19H11.22L13.2 118.77L15.21 117.93L16.83 116.85L18.24 115.44L19.32 113.82L20.07 111.99L20.49 110.07V108.09L20.13 106.14L19.41 104.31L18.33 102.66L16.98 101.25L15.36 100.11L13.56 99.3003L11.64 98.8503L9.48 98.8203L7.5 99.1503L5.58 99.8703L3.87 100.95L2.4 102.36L1.26 104.01L0.450002 105.87L0 107.91Z"/><path style="--i:5" d="M10.4099 130.528L7.58988 131.278L5.84988 132.238L4.34988 133.498L3.08988 134.998L2.15988 136.738L1.58988 138.628L1.37988 140.578L1.67988 143.248L2.87988 148.618L3.98988 151.378L5.12988 152.998L6.59988 154.348L8.27988 155.398L10.1699 156.118L26.5799 157.438L41.0699 158.128L53.4299 158.188L80.1899 157.588L94.6799 157.978L106.98 159.118L137.91 163.828L150.42 165.058L160.74 165.238L172.95 164.338L183.39 162.778L210.09 157.828L228.63 155.728L230.52 155.038L232.23 153.988L233.73 152.638L234.9 151.018L236.01 148.228L237.06 142.618L236.7 139.708L235.98 137.878L234.93 136.198L233.58 134.788L231.99 133.648L230.22 132.808L228.3 132.358L226.35 132.268L183.39 134.578H172.98L162.66 133.828L154.41 132.628L144.12 130.348L115.32 121.528L107.1 119.338L98.6699 117.658L90.3899 116.758L80.3399 116.788L69.8099 117.988L59.5499 120.088L30.7499 127.228L20.4299 129.178L10.4099 130.528Z"/><path style="--i:6" d="M21.9599 162.602L20.0099 163.022L17.3099 164.342L15.8099 165.632L14.5499 167.192L13.6499 168.962L13.0799 170.882L12.9299 172.892L13.4099 175.832L14.9399 179.012L18.0899 184.262L21.3599 189.182L26.0999 195.422L27.4799 196.832L29.0999 197.942L30.8999 198.752L32.8199 199.172L47.2499 198.602L59.5499 198.752L69.8699 199.412L94.6799 201.692L109.14 202.352L125.55 201.842L154.44 199.262L166.86 198.632L181.23 198.842L204.54 200.612L206.49 200.222L208.32 199.472L209.97 198.392L211.38 197.012L215.85 191.342L220.32 184.892L221.25 183.092L221.94 180.122L221.91 178.082L221.46 176.102L220.62 174.272L219.45 172.622L217.98 171.212L216.24 170.162L214.35 169.442L212.34 169.142L199.86 169.352L175.05 168.782H162.75L150.36 169.262L123.57 170.972L109.11 171.002L100.86 170.462L92.5499 169.472L61.6199 163.862L49.3499 162.242L36.8099 161.672L28.7099 161.972L21.9599 162.602Z"/><path style="--i:7" d="M70.4101 208.474L67.5301 209.164L64.9801 210.604L62.9701 212.734L61.6201 215.344L61.0801 218.254L61.3801 221.164L62.5201 223.894L64.3801 226.174L65.9401 227.344L70.6501 229.624L81.8701 233.944L93.2401 237.094L104.85 239.074L116.34 239.944L128.1 239.644L139.8 238.234L148.68 236.344L159.93 232.924L170.91 228.304L172.53 227.104L174.48 224.794L175.35 222.964L175.86 220.984L175.95 218.974L175.65 216.964L174.93 215.074L173.88 213.334L172.5 211.864L170.85 210.664L169.02 209.824L167.04 209.374L154.5 208.714L125.64 206.104L113.16 205.594L96.7501 206.104L70.4101 208.474Z"/></svg><p class="splash-name">Shrink my day</p></div>`;

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
        {/* Splash: the logo draws itself in, then fades once the app is ready. Once per visit. */}
        <div id="splash" aria-hidden="true" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SPLASH }} />
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(sessionStorage.getItem('nudgeme.splashed')){document.documentElement.classList.add('no-splash');}else{sessionStorage.setItem('nudgeme.splashed','1');window.__splashAt=Date.now();}}catch(e){}",
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
