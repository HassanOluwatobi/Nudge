/*
  Brand marks. Notion, Calendly and Google use their official shapes from the
  Simple Icons set. Apple Calendar is drawn as the iOS app icon: today's
  weekday in red over the date. Outlook keeps its envelope and O.
*/

type P = { className?: string };

export function GoogleMark({ className = "size-7" }: P) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="3" y="3" width="26" height="26" rx="5" fill="#fff" />
      <path d="M3 8a5 5 0 0 1 5-5h16v6H3z" fill="#4285F4" />
      <path d="M3 9h6v20H8a5 5 0 0 1-5-5z" fill="#4285F4" opacity=".85" />
      <path d="M9 23h14v6H9z" fill="#34A853" />
      <path d="M23 23h6v1a5 5 0 0 1-5 5h-1z" fill="#EA4335" />
      <path d="M23 9h6v14h-6z" fill="#FBBC04" />
      <text x="16" y="20.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="9.5" fill="#1a73e8">
        31
      </text>
    </svg>
  );
}

export function AppleMark({ className = "size-7" }: P) {
  const d = new Date();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#fff" />
      <rect x="1.25" y="1.25" width="29.5" height="29.5" rx="6.8" fill="none" stroke="#000" strokeOpacity=".1" strokeWidth=".5" />
      <text x="16" y="10.6" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="600" fontSize="6.2" fill="#FF3B30">
        {d.toLocaleDateString("en", { weekday: "short" })}
      </text>
      <text x="16" y="25.8" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="300" fontSize="15.5" fill="#000" letterSpacing="-.5">
        {d.getDate()}
      </text>
    </svg>
  );
}

export function OutlookMark({ className = "size-7" }: P) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="11" y="6" width="18" height="20" rx="2.5" fill="#28A8EA" />
      <path d="M11 15h18v9a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z" fill="#0078D4" />
      <rect x="3" y="9" width="14" height="14" rx="2.5" fill="#0A5CB8" />
      <ellipse cx="10" cy="16" rx="3.6" ry="4.3" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

const NOTION =
  "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z";

export function NotionMark({ className = "size-7" }: P) {
  return (
    <svg viewBox="-2 -2 28 28" className={className} aria-hidden>
      <path d="M2.4 2.6l15-1.1 4.6 3.2v16.6l-16.5 1-3.1-4z" fill="#fff" />
      <path d={NOTION} fill="#000" />
    </svg>
  );
}

const CALENDLY =
  "M19.655 14.262c.281 0 .557.023.828.064 0 .005-.005.01-.005.014-.105.267-.234.534-.381.786l-1.219 2.106c-1.112 1.936-3.177 3.127-5.411 3.127h-2.432c-2.23 0-4.294-1.191-5.412-3.127l-1.218-2.106a6.251 6.251 0 0 1 0-6.252l1.218-2.106C6.736 4.832 8.8 3.641 11.035 3.641h2.432c2.23 0 4.294 1.191 5.411 3.127l1.219 2.106c.147.252.271.519.381.786 0 .004.005.009.005.014-.267.041-.543.064-.828.064-1.816 0-2.501-.607-3.291-1.306-.764-.676-1.711-1.517-3.44-1.517h-1.029c-1.251 0-2.387.455-3.2 1.278-.796.805-1.233 1.904-1.233 3.099v1.411c0 1.196.437 2.295 1.233 3.099.813.823 1.949 1.278 3.2 1.278h1.034c1.729 0 2.676-.841 3.439-1.517.791-.703 1.471-1.306 3.287-1.301Zm.005-3.237c.399 0 .794-.036 1.179-.11-.002-.004-.002-.01-.002-.014-.073-.414-.193-.823-.349-1.218.731-.12 1.407-.396 1.986-.819 0-.004-.005-.013-.005-.018-.331-1.085-.832-2.101-1.489-3.03-.649-.915-1.435-1.719-2.331-2.395-1.867-1.398-4.088-2.138-6.428-2.138-1.448 0-2.855.28-4.175.841-1.273.543-2.423 1.315-3.407 2.299S2.878 6.552 2.341 7.83c-.557 1.324-.842 2.726-.842 4.175 0 1.448.281 2.855.842 4.174.542 1.274 1.314 2.423 2.298 3.407s2.129 1.761 3.407 2.299c1.324.556 2.727.841 4.175.841 2.34 0 4.561-.74 6.428-2.137a10.815 10.815 0 0 0 2.331-2.396c.652-.929 1.158-1.949 1.489-3.03 0-.004.005-.014.005-.018-.579-.423-1.255-.699-1.986-.819.161-.395.276-.804.349-1.218.005-.009.005-.014.005-.023.869.166 1.692.506 2.404 1.035.685.505.552 1.075.446 1.416C22.184 20.437 17.619 24 12.221 24c-6.625 0-12-5.375-12-12s5.37-12 12-12c5.398 0 9.963 3.563 11.471 8.464.106.341.239.915-.446 1.421-.717.529-1.535.873-2.404 1.034.128.716.128 1.45 0 2.166-.387-.074-.782-.11-1.182-.11-4.184 0-3.968 2.823-6.736 2.823h-1.029c-1.899 0-3.15-1.357-3.15-3.095v-1.411c0-1.738 1.251-3.094 3.15-3.094h1.034c2.768 0 2.552 2.823 6.731 2.827Z";

export function CalendlyMark({ className = "size-7" }: P) {
  return (
    <svg viewBox="-1 -1 26 26" className={className} aria-hidden>
      <path d={CALENDLY} fill="#006BFF" />
    </svg>
  );
}

/** A logo on a small white tile. Apple and Google already are tiles, so they fill it. */
export function LogoTile({ children, bleed = false, size = 40 }: { children: React.ReactNode; bleed?: boolean; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden bg-white ${bleed ? "" : "ring-1 ring-line"}`}
      style={{ width: size, height: size, borderRadius: size * 0.27 }}
    >
      {children}
    </span>
  );
}
