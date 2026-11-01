"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { feel } from "@/lib/feedback";
import { type ExtEvent, type Source, GOOGLE_CLIENT_ID, MS_CLIENT_ID, SOURCE_NAME, calendlyEvents, extKey, linkEvents, googleEvents, notionEvents, outlookEvents, outlookSignOut, parseIcs } from "@/lib/sync";
import type { State } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { AppleMark, CalendlyMark, GoogleMark, LogoTile, NotionMark, OutlookMark } from "./brands";
import { Sheet } from "./sheet";

export { CalendlyMark, NotionMark } from "./brands";

export const MARK: Record<Source, (p: { className?: string }) => React.ReactElement> = { google: GoogleMark, outlook: OutlookMark, ics: AppleMark, notion: NotionMark, calendly: CalendlyMark };
// Outlook shows up once its app ID is set. Until then, Outlook users import a file.
export const SOURCES: Source[] = (["google", "outlook", "ics", "notion", "calendly"] as Source[]).filter((s) => s !== "outlook" || !!MS_CLIENT_ID);

const SUB: Record<Source, string> = {
  google: "Next two weeks of events",
  outlook: "Next two weeks of events",
  ics: "Paste your calendar link once",
  notion: "Pages that have a date",
  calendly: "Meetings booked with you",
};
const NAME: Record<Source, string> = { google: "Google Calendar", outlook: "Outlook", ics: "Apple Calendar", notion: "Notion", calendly: "Calendly" };
const TILE: Record<Source, { el: React.ReactNode; bleed: boolean }> = {
  google: { el: <GoogleMark className="size-6" />, bleed: false },
  ics: { el: <AppleMark className="size-full" />, bleed: true },
  outlook: { el: <OutlookMark className="size-7" />, bleed: false },
  notion: { el: <NotionMark className="size-7" />, bleed: false },
  calendly: { el: <CalendlyMark className="size-7" />, bleed: false },
};

/** A grouped list of sources, used in Settings and the import sheet. */
export function SourceButtons({ state, onPick }: { state: State; onPick: (s: Source) => void }) {
  const on = (s: Source) => (s === "google" ? state.settings.sync.google : s === "outlook" ? state.settings.sync.outlook : s === "notion" ? !!state.settings.sync.notion : s === "calendly" ? !!state.settings.sync.calendly : !!state.settings.sync.ics);
  return (
    <ul className="overflow-hidden rounded-[20px] bg-white ring-1 ring-line">
      {SOURCES.map((s, i) => (
        <motion.li key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, type: "spring", bounce: 0, duration: 0.45 }} className={i ? "border-t border-line/70" : ""}>
          <button type="button" onClick={() => onPick(s)} aria-label={`Bring in from ${SOURCE_NAME[s]}`} className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[rgb(6_11_43/0.04)]">
            <LogoTile bleed={TILE[s].bleed}>{TILE[s].el}</LogoTile>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight text-ink">{NAME[s]}</span>
              <span className="t-small mt-0.5 block leading-snug text-ink-3">{SUB[s]}</span>
            </span>
            {on(s) ? (
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-success">
                <Check className="size-4" strokeWidth={2.6} /> On
              </span>
            ) : (
              <span className="inline-flex h-8 items-center rounded-full bg-paper px-3.5 text-[13px] font-semibold text-ink">Connect</span>
            )}
          </button>
        </motion.li>
      ))}
    </ul>
  );
}

const dayLabel = (d: Date) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t.getTime()) / 864e5);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
};

/** Bring events in: pick a source, connect, then approve what becomes a task. */
export function ImportSheet({
  open,
  source: initial,
  preload,
  onClose,
  state,
  actions,
}: {
  open: boolean;
  source?: Source | null;
  preload?: ExtEvent[] | null;
  onClose: () => void;
  state: State;
  actions: Actions;
}) {
  const [source, setSource] = useState<Source | null>(initial ?? null);
  const [events, setEvents] = useState<ExtEvent[] | null>(preload ?? null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");
  const [link, setLink] = useState(state.settings.sync.ics ?? "");
  const file = useRef<HTMLInputElement>(null);

  const have = new Set(state.tasks.map((t) => t.ext).filter(Boolean) as string[]);
  const skipped = new Set(state.settings.sync.skipped ?? []);

  const show = (list: ExtEvent[]) => {
    setEvents(list);
    setPicked(new Set(list.filter((e) => !have.has(extKey(e)) && !skipped.has(extKey(e))).map(extKey)));
  };

  useEffect(() => {
    if (!open) return;
    setSource(initial ?? null);
    setErr("");
    setToken(initial === "notion" ? (state.settings.sync.notion ?? "") : initial === "calendly" ? (state.settings.sync.calendly ?? "") : "");
    if (preload) show(preload);
    else setEvents(null);
  }, [open, initial, preload]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<ExtEvent[]>, after?: () => void) => {
    setBusy(true);
    setErr("");
    try {
      const list = await fn();
      after?.();
      show(list);
      feel(list.length ? "save" : "tap", list.length ? "success" : "light");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      feel("undo", "warning");
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const chosen = (events ?? []).filter((e) => picked.has(extKey(e)));
    const n = actions.importEvents(chosen.map((e) => ({ key: extKey(e), title: e.title, start: e.start, end: e.end, allDay: e.allDay })));
    const rest = (events ?? []).filter((e) => !picked.has(extKey(e)) && !have.has(extKey(e))).map(extKey);
    if (rest.length) actions.skipEvents(rest);
    feel("done", "success");
    toast(n ? `Added ${n} ${n === 1 ? "task" : "tasks"} from your calendar.` : "Nothing new to add.");
    onClose();
  };

  const title = events ? "Choose what to add" : source ? SOURCE_NAME[source] : "Bring in your calendar";
  const fresh = (events ?? []).filter((e) => !have.has(extKey(e)));
  const groups = new Map<string, ExtEvent[]>();
  for (const e of events ?? []) {
    const k = dayLabel(e.start);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <AnimatePresence mode="wait" initial={false}>
        {events ? (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
            {!preload && (
              <button type="button" className="btn btn-quiet -ml-3 min-h-10 gap-1 px-3 text-[14px]" onClick={() => setEvents(null)}>
                <ArrowLeft className="size-4" /> Back
              </button>
            )}
            <p className="t-small mt-1 text-ink-2">{events.length ? "The next two weeks. Tick what you want as tasks. Each one gets its time and a reminder 10 minutes before." : "Nothing in the next two weeks."}</p>
            <div className="mt-3 max-h-[52vh] space-y-4 overflow-auto pb-1">
              {[...groups.entries()].map(([day, list]) => (
                <section key={day}>
                  <h4 className="t-label mb-1.5">{day}</h4>
                  <ul className="space-y-1.5">
                    {list.map((e) => {
                      const k = extKey(e);
                      const added = have.has(k);
                      const on = picked.has(k);
                      const M = MARK[e.src];
                      return (
                        <li key={k}>
                          <button
                            type="button"
                            disabled={added}
                            aria-pressed={on}
                            onClick={() => {
                              feel(on ? "unstep" : "step", "light");
                              setPicked((p) => {
                                const n = new Set(p);
                                if (n.has(k)) n.delete(k);
                                else n.add(k);
                                return n;
                              });
                            }}
                            className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-white px-3 text-left ring-1 transition-shadow ${on ? "ring-2 ring-signal" : "ring-line"} disabled:opacity-60`}
                          >
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper [&_svg]:size-5">
                              <M />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-medium">{e.title}</span>
                              <span className="t-small text-ink-3">{added ? "Already added" : e.allDay ? "All day" : e.start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                            </span>
                            {!added && (
                              <motion.span className="grid size-6 place-items-center rounded-[8px] border-2" initial={false} animate={{ backgroundColor: on ? "#1d4df5" : "rgba(0,0,0,0)", borderColor: on ? "#1d4df5" : "#c9c2b4" }} transition={{ duration: 0.2 }}>
                                {on && <Check className="size-3.5 text-white" strokeWidth={3} />}
                              </motion.span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
            {fresh.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <button type="button" className="btn btn-quiet -ml-3 min-h-10 px-3 text-[14px]" onClick={() => setPicked(picked.size === fresh.length ? new Set() : new Set(fresh.map(extKey)))}>
                  {picked.size === fresh.length ? "Select none" : "Select all"}
                </button>
                <span className="t-small text-ink-3">{picked.size} selected</span>
              </div>
            )}
            <button type="button" className="btn btn-signal mt-3 w-full" disabled={!picked.size} onClick={add}>
              {picked.size ? `Add ${picked.size} to NudgeMe` : "Nothing selected"}
            </button>
          </motion.div>
        ) : !source ? (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="t-small mt-1 text-ink-2">Events from the next two weeks can become tasks. You choose which ones. NudgeMe only reads, it never changes your calendar.</p>
            <div className="mt-4">
              <SourceButtons state={state} onPick={(s) => (setSource(s), setToken(s === "notion" ? (state.settings.sync.notion ?? "") : s === "calendly" ? (state.settings.sync.calendly ?? "") : ""))} />
            </div>
          </motion.div>
        ) : (
          <motion.div key={source} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
            {!initial && (
              <button type="button" className="btn btn-quiet -ml-3 min-h-10 gap-1 px-3 text-[14px]" onClick={() => (setSource(null), setErr(""))}>
                <ArrowLeft className="size-4" /> All calendars
              </button>
            )}
            <div className="mt-2 flex items-center gap-3">
              <LogoTile bleed={TILE[source].bleed} size={48}>{TILE[source].el}</LogoTile>
              <p className="t-small flex-1 text-ink-2">
                {source === "google" && "Sign in with Google and allow read-only access. The sign-in lasts about an hour and is never saved."}
                {source === "outlook" && "Sign in with your Microsoft account and allow read-only access to your calendar."}
                {source === "ics" && "Share a calendar from your iPhone as a link, once. NudgeMe reads it and never changes it."}
                {source === "notion" && "Connect a Notion database that has a date column. Each page with a date in the next two weeks can become a task."}
                {source === "calendly" && "Bring in the meetings people have booked with you."}
              </p>
            </div>

            {source === "google" &&
              (GOOGLE_CLIENT_ID ? (
                <button type="button" className="btn btn-signal mt-5 w-full" disabled={busy} onClick={() => run(googleEvents, () => actions.setSync({ google: true }))}>
                  {busy ? <Loader2 className="size-5 animate-spin" /> : state.settings.sync.google ? "Check Google Calendar" : "Connect Google Calendar"}
                </button>
              ) : (
                <SetupNote name="Google" />
              ))}

            {source === "outlook" &&
              (MS_CLIENT_ID ? (
                <div className="mt-5 grid gap-2">
                  <button type="button" className="btn btn-signal w-full" disabled={busy} onClick={() => run(() => outlookEvents(true), () => actions.setSync({ outlook: true }))}>
                    {busy ? <Loader2 className="size-5 animate-spin" /> : state.settings.sync.outlook ? "Check Outlook" : "Connect Outlook"}
                  </button>
                  {state.settings.sync.outlook && (
                    <button type="button" className="btn btn-quiet w-full text-[14px]" onClick={async () => (await outlookSignOut(), actions.setSync({ outlook: false }), toast("Outlook disconnected."))}>
                      Disconnect Outlook
                    </button>
                  )}
                </div>
              ) : (
                <SetupNote name="Outlook" />
              ))}

            {source === "ics" && (
              <>
                <form
                  className="mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const u = link.trim();
                    if (!u) return;
                    run(() => linkEvents(u), () => actions.setSync({ ics: u }));
                  }}
                >
                  <ol className="space-y-2.5">
                    {[
                      "On your iPhone, open the Calendar app and tap Calendars.",
                      "Tap the ⓘ next to the calendar you want.",
                      "Turn on Public Calendar, then tap Share Link and Copy.",
                      "Paste it below. NudgeMe checks it each time you open the app.",
                    ].map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink-2">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-semibold tabular-nums text-ink ring-1 ring-line">{i + 1}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ol>
                  <label htmlFor="ics-link" className="t-small mt-4 block font-semibold text-ink-2">
                    Calendar link
                  </label>
                  <input id="ics-link" value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="webcal://p01-caldav.icloud.com/…" className="field mt-1.5" />
                  <button type="submit" className="btn btn-signal mt-4 w-full" disabled={busy || !link.trim()}>
                    {busy ? <Loader2 className="size-5 animate-spin" /> : state.settings.sync.ics ? "Check my calendar" : "Connect"}
                  </button>
                  {state.settings.sync.ics && (
                    <button type="button" className="btn btn-quiet mt-1 w-full text-[14px]" onClick={() => (actions.setSync({ ics: undefined }), setLink(""), toast("Calendar link removed."))}>
                      Remove this link
                    </button>
                  )}
                </form>
                <p className="t-small mt-5 text-center text-ink-3">
                  Have an .ics file instead?{" "}
                  <button type="button" className="font-semibold text-signal-ink underline underline-offset-2" disabled={busy} onClick={() => file.current?.click()}>
                    Choose a file
                  </button>
                </p>
                <input
                  ref={file}
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) run(async () => parseIcs(await f.text()));
                  }}
                />
              </>
            )}

            {(source === "notion" || source === "calendly") && (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = token.trim();
                  if (!t) return;
                  run(() => (source === "notion" ? notionEvents(t) : calendlyEvents(t)), () => actions.setSync(source === "notion" ? { notion: t } : { calendly: t }));
                }}
              >
                <ol className="t-small list-decimal space-y-1 pl-5 text-ink-2">
                  {source === "notion" ? (
                    <>
                      <li>
                        Go to{" "}
                        <a className="font-medium text-signal-ink underline" href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer">
                          notion.so/my-integrations
                        </a>{" "}
                        and create an integration.
                      </li>
                      <li>Copy its secret and paste it below.</li>
                      <li>In Notion, open your database, tap ••• then Connections, and add the integration.</li>
                    </>
                  ) : (
                    <>
                      <li>
                        In Calendly, open{" "}
                        <a className="font-medium text-signal-ink underline" href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer">
                          Integrations, API and webhooks
                        </a>
                        .
                      </li>
                      <li>Create a personal access token.</li>
                      <li>Paste it below.</li>
                    </>
                  )}
                </ol>
                <label htmlFor="ext-token" className="t-small mt-4 block font-semibold text-ink-2">
                  {source === "notion" ? "Notion secret" : "Calendly token"}
                </label>
                <input id="ext-token" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} placeholder={source === "notion" ? "ntn_…" : "eyJ…"} className="field mt-1.5 font-mono text-[14px]" />
                <p className="t-small mt-1.5 text-ink-3">Saved only on this phone. NudgeMe passes it to {source === "notion" ? "Notion" : "Calendly"} through a relay that stores nothing.</p>
                <button type="submit" className="btn btn-signal mt-4 w-full" disabled={busy || !token.trim()}>
                  {busy ? <Loader2 className="size-5 animate-spin" /> : "Connect and check"}
                </button>
                {(source === "notion" ? state.settings.sync.notion : state.settings.sync.calendly) && (
                  <button type="button" className="btn btn-quiet mt-1 w-full text-[14px]" onClick={() => (actions.setSync(source === "notion" ? { notion: undefined } : { calendly: undefined }), setToken(""), toast("Disconnected and token removed."))}>
                    Disconnect and remove token
                  </button>
                )}
              </form>
            )}

            {err && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-[15px] text-danger" role="alert">{err}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function SetupNote({ name }: { name: string }) {
  return <p className="mt-5 rounded-2xl bg-paper px-4 py-3 text-[15px] text-ink-2">{name} needs a one-time setup by the person running NudgeMe. Until then, use the file option for any calendar.</p>;
}
