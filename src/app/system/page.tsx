"use client";

import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { Contours, Dot, Field, Ribbon, type Tone } from "@/components/app/motifs";
import { Mark, Thread } from "@/components/app/thread";

type Swatch = { name: string; token: string; hex: string; role: string; dark?: boolean };

const PALETTE: { group: string; note: string; items: Swatch[] }[] = [
  {
    group: "Anchors",
    note: "Midnight and electric carry the brand. Electric always means the next action.",
    items: [
      { name: "Midnight", token: "--night", hex: "#060B2B", role: "Focus, hero base, primary text", dark: true },
      { name: "Midnight raised", token: "--night-2", hex: "#101A4D", role: "Evening field, raised night", dark: true },
      { name: "Electric", token: "--signal", hex: "#1D4DF5", role: "Primary button, Finish field · white text 6.1:1", dark: true },
      { name: "Electric pressed", token: "--signal-ink", hex: "#1236C2", role: "Pressed state, blue text on cream", dark: true },
      { name: "Electric tint", token: "--signal-soft", hex: "#E8EDFF", role: "Focus rings, selected tint" },
    ],
  },
  {
    group: "Surfaces",
    note: "Calm places for reading and doing. No texture, no glow.",
    items: [
      { name: "Cream", token: "--paper", hex: "#F3EEE4", role: "Page background" },
      { name: "Ivory", token: "--ivory", hex: "#FBF8F1", role: "Sheets" },
      { name: "White", token: "--sheet", hex: "#FFFFFF", role: "Inputs, the one primary card" },
      { name: "Hairline", token: "--line", hex: "#E3DDD0", role: "Row dividers, borders" },
    ],
  },
  {
    group: "Text",
    note: "Three levels only. All pass WCAG AA on cream.",
    items: [
      { name: "Ink", token: "--ink", hex: "#060B2B", role: "Titles, body · 16.7:1", dark: true },
      { name: "Ink 2", token: "--ink-2", hex: "#3D4566", role: "Secondary · 8.1:1", dark: true },
      { name: "Ink 3", token: "--ink-3", hex: "#5F6584", role: "Hints, meta · 4.9:1", dark: true },
    ],
  },
  {
    group: "Accents",
    note: "Only inside the ribbon, the fields and the done dot. Never on a plain control.",
    items: [
      { name: "Cyan", token: "--cyan", hex: "#19D3E6", role: "Ribbon, morning" },
      { name: "Aqua", token: "--aqua", hex: "#5EF0CF", role: "Ribbon, day" },
      { name: "Lime", token: "--lime", hex: "#C3EF6E", role: "Ribbon, Finish" },
      { name: "Coral", token: "--coral", hex: "#FF6B4A", role: "The done dot, evening" },
      { name: "Peach", token: "--peach", hex: "#FFB98A", role: "Ribbon, warm end" },
      { name: "Pink", token: "--pink", hex: "#FF9BD6", role: "Ribbon, evening" },
      { name: "Lilac", token: "--lilac", hex: "#B9A2FF", role: "Ribbon, night" },
    ],
  },
  {
    group: "States",
    note: "Used in words and icons, always with a label. Never color alone.",
    items: [
      { name: "Success", token: "--success", hex: "#0E7351", role: "Saved, restored · 5.1:1", dark: true },
      { name: "Warning", token: "--warning", hex: "#955300", role: "Storage full, unreadable data · 5.2:1", dark: true },
      { name: "Danger", token: "--danger", hex: "#C3321F", role: "Delete, clear everything · 4.8:1", dark: true },
      { name: "Danger tint", token: "--danger-soft", hex: "#FDF1EE", role: "Confirm strip behind delete" },
    ],
  },
];

const TYPE = [
  { cls: "t-display", name: "Display", spec: "Sans 44 / 1.0 · −0.04em · 500", use: "Greetings, page titles, Finish", sample: "Good morning." },
  { cls: "t-title", name: "Title", spec: "Serif 28 / 1.12 · −0.02em", use: "Task titles, the step in Focus", sample: "Reply to Tunde about the deck" },
  { cls: "t-heading", name: "Heading", spec: "Sans 19 / 1.3 · −0.01em · 600", use: "List groups, sheet headings", sample: "This week" },
  { cls: "t-body", name: "Body", spec: "Sans 16 / 1.5", use: "Everything you read", sample: "NudgeMe holds it, then helps you start with one small step." },
  { cls: "t-small", name: "Small", spec: "Sans 14 / 1.45", use: "Meta, hints, steps under a title", sample: "Due tomorrow · Open a new message" },
  { cls: "t-label", name: "Label", spec: "Sans 12 / 1.2 · +0.09em · 600 · caps", use: "Eyebrows above content", sample: "Start here" },
];

const SPACE = [4, 8, 12, 16, 24, 32, 48, 64];

const MOTIFS: { name: string; what: string; yes: string; no: string; render: React.ReactNode }[] = [
  {
    name: "Field",
    what: "A painted midnight or electric color field. Soft blobs, a printed stipple in one corner, fine grain underneath.",
    yes: "Today hero, Finish, Rest, empty Today.",
    no: "Lists, sheets, forms, or behind body text.",
    render: <Field tone="night" className="h-full w-full" />,
  },
  {
    name: "Ribbon",
    what: "A broad sculptural band that loops once, then runs straight. The thread at full size, lit from above.",
    yes: "One per field. Ends on the coral dot when something is finished.",
    no: "Working surfaces, buttons, decoration in lists.",
    render: (
      <Field tone="day" stipple={false} grain={0.2} className="h-full w-full">
        <Ribbon tone="day" className="absolute inset-0 h-full w-full" />
      </Field>
    ),
  },
  {
    name: "Contours",
    what: "Fine orbital lines that add movement and precision.",
    yes: "At most one set per field, under 30% opacity.",
    no: "Stacked with more line work, or on cream.",
    render: (
      <Field tone="evening" stipple={false} grain={0} className="h-full w-full">
        <Contours className="absolute inset-0 h-full w-full" count={7} opacity={0.4} />
      </Field>
    ),
  },
  {
    name: "Thread and dot",
    what: "The small, working-surface version of the ribbon. Strands gather as steps are done. The coral dot means finished, and only that.",
    yes: "On the suggested task, in Focus, in Done today.",
    no: "As a loading spinner or general decoration.",
    render: (
      <div className="flex h-full w-full flex-col justify-center gap-3 bg-sheet px-6">
        <Thread pull={0} className="h-7 w-48" />
        <Thread pull={0.5} className="h-7 w-48" />
        <Thread pull={1} done className="h-7 w-48" />
      </div>
    ),
  },
];

const FIELDS: Tone[] = ["morning", "day", "evening", "night"];

export default function SystemPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <Field tone="night" className="on-color text-white">
        <Contours className="pointer-events-none absolute inset-0 -z-10 h-full w-full" count={6} />
        <Ribbon tone="night" dot className="pointer-events-none absolute right-0 top-[8%] -z-10 hidden h-[84%] w-[52%] md:block" />
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-6 md:px-10 md:pb-28">
          <Link href="/" className="btn btn-glass min-h-11 gap-1.5 px-4 text-[15px]">
            <ArrowLeft className="size-4" /> Back to NudgeMe
          </Link>
          <div className="mt-16 flex items-center gap-2">
            <Mark light className="h-5 w-auto" />
            <span className="t-label text-white/70">Design system</span>
          </div>
          <h1 className="t-display mt-3 max-w-[14ch] text-[56px] md:text-[72px]">Thread</h1>
          <p className="t-body mt-4 max-w-[38ch] text-white/85">
            A loose thought is a tangle. Each step pulls it straighter. Finishing lays it flat and lights the dot at the end. Brand moments are vivid and printed. Working surfaces are calm and crisp.
          </p>
        </div>
      </Field>

      <main className="mx-auto max-w-5xl space-y-20 px-6 py-16 md:px-10">
        <Section n="01" title="Two kinds of surface" lead="The contrast is the system. Color and texture give NudgeMe character in a few places, so the rest can stay quiet and easy to use.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-[28px]">
              <Field tone="day" className="on-color h-72 text-white">
                <Ribbon tone="day" className="absolute inset-x-0 bottom-0 -z-10 h-[48%] w-full" />
                <div className="p-6">
                  <p className="t-label text-white/75">Brand moment</p>
                  <p className="t-display mt-2 text-[34px]">Expressive</p>
                  <p className="t-small mt-2 max-w-[28ch] text-white/85">Field, ribbon, contours, stipple. Today hero, Finish, Rest.</p>
                </div>
              </Field>
            </div>
            <div className="rounded-[28px] border border-line bg-ivory p-6">
              <p className="t-label">Working surface</p>
              <p className="t-display mt-2 text-[34px]">Restrained</p>
              <p className="t-small mt-2 max-w-[30ch] text-ink-2">Cream and white, hairlines, three text levels. Lists, sheets, forms, Focus text.</p>
              <ul className="mt-4">
                <li className="row">
                  <span className="size-2 rounded-full bg-signal" aria-hidden />
                  <span className="flex-1">Call mum about the weekend</span>
                </li>
                <li className="row">
                  <Dot />
                  <span className="flex-1 text-ink-3 line-through">Buy airtime</span>
                </li>
              </ul>
            </div>
          </div>
        </Section>

        <Section n="02" title="Palette" lead="A deliberate set. Anchors and surfaces do almost all the work. Accents stay inside brand moments.">
          <div className="space-y-10">
            {PALETTE.map((g) => (
              <div key={g.group}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/80 pb-2">
                  <h3 className="t-heading">{g.group}</h3>
                  <p className="t-small text-ink-3">{g.note}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {g.items.map((c) => (
                    <div key={c.token}>
                      <div className="flex h-24 items-end rounded-2xl p-3 ring-1 ring-ink/10" style={{ background: c.hex }}>
                        <span className={`t-small font-medium ${c.dark ? "text-white" : "text-ink"}`}>{c.name}</span>
                      </div>
                      <p className="t-small mt-2 font-mono text-ink-2">
                        {c.hex} <span className="text-ink-3">{c.token}</span>
                      </p>
                      <p className="t-small text-ink-3">{c.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section n="03" title="Type" lead="Geist Sans for structure, Geist Serif for the things you will do. Tracking tightens as size grows. Hierarchy comes from size, weight and leading together.">
          <div>
            {TYPE.map((t) => (
              <div key={t.cls} className="grid gap-2 border-b border-line py-5 md:grid-cols-[180px_1fr] md:gap-8">
                <div>
                  <p className="t-small font-semibold">{t.name}</p>
                  <p className="t-small text-ink-3">{t.spec}</p>
                  <p className="t-small text-ink-3">{t.use}</p>
                </div>
                <p className={t.cls}>{t.sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section n="04" title="Spacing and shape" lead="A 4 point scale, and only these steps. Rows have no box. Controls are pills. The one primary card and sheets share a 28px radius.">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-2">
              {SPACE.map((s) => (
                <div key={s} className="flex items-center gap-4">
                  <span className="t-small w-10 font-mono text-ink-3">{s}</span>
                  <span className="h-3 rounded-full bg-signal" style={{ width: s * 3 }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Control", "999px pill", "rounded-full"],
                ["Input", "14px", "rounded-[14px]"],
                ["Card / sheet", "28px", "rounded-[28px]"],
              ].map(([n, v, r]) => (
                <div key={n}>
                  <div className={`h-20 border border-line bg-sheet ${r}`} />
                  <p className="t-small mt-2 font-semibold">{n}</p>
                  <p className="t-small text-ink-3">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section n="05" title="Motifs" lead="Four shapes that belong to NudgeMe. Reused, never reinvented per screen. Never more than one ribbon and one set of contours in view.">
          <div className="grid gap-6 md:grid-cols-2">
            {MOTIFS.map((m) => (
              <div key={m.name}>
                <div className="relative h-48 overflow-hidden rounded-[28px] ring-1 ring-ink/10">{m.render}</div>
                <h3 className="t-heading mt-4">{m.name}</h3>
                <p className="t-small mt-1 text-ink-2">{m.what}</p>
                <p className="t-small mt-2">
                  <span className="font-semibold text-success">Use · </span>
                  <span className="text-ink-2">{m.yes}</span>
                </p>
                <p className="t-small">
                  <span className="font-semibold text-danger">Avoid · </span>
                  <span className="text-ink-2">{m.no}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <p className="t-label">The field through the day</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {FIELDS.map((f) => (
                <div key={f}>
                  <Field tone={f} className="h-32 rounded-2xl">
                    <Ribbon tone={f} className="absolute inset-0 h-full w-full" />
                  </Field>
                  <p className="t-small mt-2 capitalize text-ink-2">{f}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section n="06" title="Controls" lead="One electric button per screen. Everything else steps down.">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-[28px] border border-line bg-ivory p-6">
              <p className="t-label">On cream</p>
              <button type="button" className="btn btn-signal w-full">
                Start <ArrowRight className="size-5" />
              </button>
              <button type="button" className="btn btn-line w-full">
                Put it back on my list
              </button>
              <button type="button" className="btn btn-quiet w-full">
                Not this one
              </button>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="chip" aria-pressed="true">
                  Today
                </span>
                <span className="chip">This week</span>
                <span className="chip">Later</span>
              </div>
              <input className="field" placeholder="The smallest thing you could do first" aria-label="Example step field" />
            </div>
            <Field tone="finish" className="on-color space-y-3 rounded-[28px] p-6 text-white">
              <p className="t-label text-white/75">On a field</p>
              <button type="button" className="btn btn-white w-full">
                Stop for now
              </button>
              <button type="button" className="btn btn-glass w-full">
                Choose another task
              </button>
              <div className="dock mt-6 flex items-center gap-1 rounded-full p-1.5">
                <span className="btn btn-white min-h-[50px] flex-1 text-[16px]">
                  <Plus className="size-5" /> Add a thought
                </span>
                <span className="btn min-h-[50px] px-4 text-[15px] text-white/90">My list</span>
              </div>
            </Field>
          </div>
        </Section>

        <Section n="07" title="Rules" lead="Short enough to remember.">
          <ol className="t-body list-decimal space-y-2 pl-5 text-ink-2">
            <li>Electric blue means the next action. One electric button per screen.</li>
            <li>The coral dot means finished. Nothing else uses coral.</li>
            <li>Texture lives behind content on brand fields. Never over text, never on cream.</li>
            <li>One ribbon and one set of contours per screen, at most.</li>
            <li>Only the suggested task gets a card. Lists are rows with hairlines.</li>
            <li>Focus stays quiet: midnight, one soft glow, the thread, the step.</li>
            <li>Status is never color alone. Every state has words.</li>
            <li>Reduced motion turns drawing and drifting into still frames.</li>
          </ol>
        </Section>
      </main>
    </div>
  );
}

function Section({ n, title, lead, children }: { n: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`s${n}`}>
      <div className="grid gap-2 md:grid-cols-[180px_1fr] md:gap-8">
        <p className="t-label pt-2">{n}</p>
        <div>
          <h2 id={`s${n}`} className="t-display text-[36px]">
            {title}
          </h2>
          <p className="t-body mt-2 max-w-[60ch] text-ink-2">{lead}</p>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
