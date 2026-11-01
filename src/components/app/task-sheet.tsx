"use client";

import { ArrowRight, Check, Copy, ExternalLink, Plus, RotateCcw, Sparkles, SunMedium, Trash2, Wand2, X, Copy as Dup } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AI_NAME, aiLink, breakdownPrompt, copy } from "@/lib/ai";
import { type Bucket, type Settings, type Task, BUCKET_NAME, HUES, MAX_STEP, MAX_TITLE, MIN_CHOICES, PARTS, PART_NAME, addDays, fmtMins, parseSteps, suggestStep, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { RemindPicker } from "./remind";
import { Sheet } from "./sheet";
import { keepFocus } from "./steps";
import { StepCheck, Tile } from "./task-row";

const EMOJIS = ["✨", "📞", "✉️", "🛒", "💳", "🧺", "🏃", "📚", "✍️", "🎨", "🍳", "🩺", "🗓️", "💻", "🌱", "🧘", "🧹", "🎧", "🚗", "💡"];

export function TaskSheet({
  task,
  ai,
  onClose,
  actions,
  onFocus,
  onFinished,
  announce,
}: {
  task: Task | null;
  ai: Settings["ai"];
  onClose: () => void;
  actions: Actions;
  onFocus: (t: Task) => void;
  onFinished: (t: Task) => void;
  announce: (s: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [last, setLast] = useState<Task | null>(task);
  const [look, setLook] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const aiRef = useRef<HTMLDivElement>(null);
  const [dueOpen, setDueOpen] = useState(false);
  const [dueDraft, setDueDraft] = useState("");

  useEffect(() => {
    if (task) {
      setLast(task);
      setTitle(task.title);
      setConfirm(false);
      setLook(false);
      setAiOpen(false);
      setPasted("");
      setDraft("");
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (task) setLast(task);
  }, [task]);

  const t = task ?? last;
  if (!t) return null;
  const done = t.bucket === "done";
  const today = ymd();
  const commit = () => {
    if (task && title.trim() && title.trim() !== task.title) actions.patch(task.id, { title });
  };
  const close = () => {
    commit();
    onClose();
  };
  const parsed = parseSteps(pasted);
  const link = aiLink(ai, breakdownPrompt(t.title));

  return (
    <Sheet open={!!task} onClose={close} title="Task details" hideTitle>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setLook((v) => !v)} aria-expanded={look} aria-label="Change colour and icon" className="mt-1 rounded-[14px] ring-offset-2 transition-shadow hover:ring-2 hover:ring-line">
          <Tile task={t} size={48} />
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="t-title" className="sr-only">
            Task
          </label>
          <textarea id="t-title" value={title} rows={2} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} onBlur={commit} className="t-title w-full resize-none rounded-[16px] border border-line bg-white px-3.5 py-2.5 text-[23px] transition-[border-color,box-shadow] focus:border-signal focus:shadow-[0_0_0_4px_rgb(29_77_245/0.12)] focus:outline-none" />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {look && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="overflow-hidden">
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Colour">
              {HUES.map((h) => (
                <button key={h} type="button" aria-label={h} aria-pressed={t.hue === h} onClick={() => actions.patch(t.id, { hue: h })} className={`hue-${h} grid size-9 place-items-center rounded-full`} style={{ background: "var(--h)" }}>
                  {t.hue === h && <Check className="size-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Icon">
              {EMOJIS.map((e) => (
                <button key={e} type="button" aria-pressed={t.emoji === e} onClick={() => actions.patch(t.id, { emoji: e })} className={`grid size-10 place-items-center rounded-xl text-[20px] ${t.emoji === e ? "bg-white ring-2 ring-signal" : "bg-white/60"}`}>
                  {e}
                </button>
              ))}
              <button type="button" onClick={() => actions.patch(t.id, { emoji: undefined })} className="h-10 rounded-xl bg-white/60 px-3 text-[14px] text-ink-2">
                Letter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!done && (
        <>
          {/* Steps */}
          <div className="mt-6 flex items-baseline justify-between">
            <p className="t-label">Steps</p>
            {t.steps.length > 0 && <span className="t-small text-ink-3">{t.steps.filter((s) => s.d).length}/{t.steps.length} done</span>}
          </div>
          <ul className="mt-2 space-y-1.5">
            {t.steps.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-[14px] bg-white pl-2 pr-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-signal/50">
                <button type="button" aria-pressed={s.d} aria-label={s.d ? "Mark step not done" : "Mark step done"} onClick={() => (actions.toggleStep(t.id, s.id), feel(s.d ? "unstep" : "step", "light"))} className="grid size-9 shrink-0 place-items-center">
                  <StepCheck done={s.d} hue={t.hue} size={20} />
                </button>
                <input
                  defaultValue={s.t}
                  maxLength={MAX_STEP}
                  aria-label="Step"
                  onBlur={(e) => e.target.value !== s.t && actions.editStep(t.id, s.id, e.target.value)}
                  className={`min-w-0 flex-1 bg-transparent py-2.5 text-[15px] focus:outline-none ${s.d ? "text-ink-3 line-through" : ""}`}
                />
                <button type="button" className="icon-btn size-9 text-ink-3" aria-label="Remove step" onClick={() => (actions.removeStep(t.id, s.id), feel("tap"))}>
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              actions.addStep(t.id, draft);
              feel("save", "light");
              setDraft("");
            }}
          >
            <input value={draft} maxLength={MAX_STEP} onChange={(e) => setDraft(e.target.value)} placeholder={t.steps.length ? "Add a step" : "The smallest thing you could do first"} aria-label="New step" className="field min-w-0 flex-1" />
            <button type="submit" {...keepFocus} className="btn btn-ink btn-icon size-[50px] shrink-0 rounded-[14px]" aria-label="Add step">
              <Plus className="size-5" />
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-2">
            {!t.steps.length && (
              <button type="button" className="chip gap-1.5 text-left" onClick={() => actions.addStep(t.id, suggestStep(t.title))}>
                <Sparkles className="size-3.5 shrink-0 text-signal" /> {suggestStep(t.title)}
              </button>
            )}
            <button
              type="button"
              className="chip gap-1.5"
              aria-expanded={aiOpen}
              onClick={() => {
                setAiOpen((v) => !v);
                feel("tap", "light");
                // Bring the panel into view so the tap visibly leads somewhere.
                if (!aiOpen) setTimeout(() => aiRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 360);
              }}
            >
              <Wand2 className="size-3.5 text-signal" /> Break it down with {AI_NAME[ai]}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {aiOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden">
                <div ref={aiRef} className="mt-3 scroll-mb-6 rounded-2xl bg-white p-4 ring-1 ring-line">
                  <p className="text-[15px] font-semibold">Use your own {AI_NAME[ai]}</p>
                  <p className="t-small mt-1 text-ink-2">Free. Nothing is sent from NudgeMe. You choose what to paste back.</p>
                  <ol className="mt-3 space-y-3">
                    <li>
                      <p className="t-small font-semibold text-ink-2">1. Ask {AI_NAME[ai]}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async () => {
                          const ok = await copy(breakdownPrompt(t.title));
                          if (!link.prefilled) toast(ok ? `Question copied. Paste it into ${AI_NAME[ai]}.` : `Open ${AI_NAME[ai]} and ask it to break this task into tiny steps.`);
                        }}
                        className="btn btn-line mt-1.5 min-h-11 w-full gap-2 text-[15px]"
                      >
                        Open {AI_NAME[ai]} <ExternalLink className="size-4" />
                      </a>
                      <button type="button" className="btn btn-quiet mt-1 min-h-10 w-full gap-1.5 text-[14px]" onClick={async () => toast((await copy(breakdownPrompt(t.title))) ? "Question copied." : "Copy did not work in this browser.")}>
                        <Copy className="size-3.5" /> Copy the question instead
                      </button>
                    </li>
                    <li>
                      <label htmlFor="ai-paste" className="t-small font-semibold text-ink-2">
                        2. Paste the answer here
                      </label>
                      <textarea id="ai-paste" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste the list of steps" className="field mt-1.5 resize-none text-[15px]" />
                    </li>
                  </ol>
                  {parsed.length > 0 && (
                    <div className="mt-3">
                      <p className="t-small font-semibold text-ink-2">3. Check them</p>
                      <ul className="mt-1.5 space-y-1">
                        {parsed.map((p, i) => (
                          <li key={i} className="flex gap-2 text-[15px]">
                            <span className="text-ink-3">{i + 1}.</span> {p}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="btn btn-signal mt-3 min-h-12 w-full"
                        onClick={() => {
                          actions.addSteps(t.id, parsed);
                          feel("done", "success");
                          setPasted("");
                          setAiOpen(false);
                          announce(`${parsed.length} steps added.`);
                          toast(`${parsed.length} steps added.`);
                        }}
                      >
                        Add {parsed.length} steps
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="t-label mt-6">When</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["today", "week", "later"] as Exclude<Bucket, "done">[]).map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={t.bucket === b} onClick={() => (actions.move(t.id, b), announce(`Moved to ${BUCKET_NAME[b]}.`))}>
                {BUCKET_NAME[b]}
              </button>
            ))}
          </div>

          <p className="t-label mt-5">Time of day</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PARTS.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={t.part === p} onClick={() => actions.patch(t.id, { part: p })}>
                {PART_NAME[p]}
              </button>
            ))}
          </div>

          <p className="t-label mt-5">How long</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MIN_CHOICES.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={t.mins === m} onClick={() => actions.patch(t.id, { mins: t.mins === m ? undefined : m })}>
                {fmtMins(m)}
              </button>
            ))}
          </div>

          <p className="t-label mt-5">Due</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="chip" aria-pressed={t.due === today} onClick={() => actions.patch(t.id, { due: t.due === today ? undefined : today })}>
              Today
            </button>
            <button type="button" className="chip" aria-pressed={t.due === addDays(today, 1)} onClick={() => actions.patch(t.id, { due: t.due === addDays(today, 1) ? undefined : addDays(today, 1) })}>
              Tomorrow
            </button>
            <button type="button" className="chip" aria-expanded={dueOpen} aria-pressed={!!t.due && t.due !== today && t.due !== addDays(today, 1)} onClick={() => (setDueOpen((v) => !v), setDueDraft(t.due ?? ""), feel("tap"))}>
              {t.due && t.due !== today && t.due !== addDays(today, 1) ? new Date(t.due + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "Pick a date"}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {dueOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="overflow-hidden">
                <div className="mt-3 flex gap-2 rounded-2xl bg-white p-3 ring-1 ring-line">
                  <input type="date" aria-label="Due date" min={today} value={dueDraft} onChange={(e) => setDueDraft(e.target.value)} className="field min-w-0 flex-1" />
                  <button type="button" disabled={!dueDraft} className="btn btn-signal min-h-[50px] px-4" onClick={() => (actions.patch(t.id, { due: dueDraft }), feel("save", "light"), setDueOpen(false))}>
                    Set
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="t-label mt-5">Remind me</p>
          <RemindPicker task={t} actions={actions} />
        </>
      )}

      <div className="mt-7 flex flex-col gap-2">
        {done ? (
          <button type="button" className="btn btn-line w-full" onClick={() => (actions.restore(t.id), announce("Task is back on your list."), onClose())}>
            <RotateCcw className="size-4" /> Put it back on my list
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-signal w-full" onClick={() => (commit(), onFocus(t))}>
              Start focus <ArrowRight className="size-5" />
            </button>
            <button type="button" className="btn btn-line w-full" onClick={() => (commit(), actions.finish(t.id), onFinished(t))}>
              <Check className="size-4" /> Finish this task
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-quiet gap-1.5 text-[15px]" onClick={() => (actions.tomorrow(t.id), toast("Moved to tomorrow."), onClose())}>
                <SunMedium className="size-4" /> Tomorrow
              </button>
              <button type="button" className="btn btn-quiet gap-1.5 text-[15px]" onClick={() => (actions.duplicate(t.id), toast("Copy made."))}>
                <Dup className="size-4" /> Make a copy
              </button>
            </div>
          </>
        )}
        {confirm ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-danger-soft p-2 pl-4" role="group" aria-label="Confirm delete">
            <span className="text-[15px]">Delete this task?</span>
            <div className="flex gap-1">
              <button type="button" className="btn btn-quiet min-h-11" onClick={() => setConfirm(false)}>
                Keep
              </button>
              <button
                type="button"
                className="btn btn-danger min-h-11 px-4"
                onClick={() => {
                  const gone = actions.remove(t.id);
                  onClose();
                  if (gone) toast("Task deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet w-full gap-1.5 text-[15px] text-danger" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** Quick actions on a held task, after Tiimo's menu. */
export function TaskMenu({ task, onClose, actions, onOpen, onFocus }: { task: Task | null; onClose: () => void; actions: Actions; onOpen: (t: Task) => void; onFocus: (t: Task) => void }) {
  const [last, setLast] = useState<Task | null>(task);
  useEffect(() => {
    if (task) setLast(task);
  }, [task]);
  const t = task ?? last;
  if (!t) return null;
  const item = (label: string, icon: React.ReactNode, fn: () => void, danger = false) => (
    <li>
      <button type="button" className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] transition-colors active:bg-ink/5 ${danger ? "text-danger" : ""}`} onClick={() => (fn(), feel("tap", "light"), onClose())}>
        <span className="grid size-6 place-items-center">{icon}</span>
        {label}
      </button>
    </li>
  );
  return (
    <Sheet open={!!task} onClose={onClose} title={t.title}>
      <ul className="mt-1 pb-2">
        {t.bucket !== "done" && item("Start focus", <ArrowRight className="size-5" />, () => onFocus(t))}
        {t.bucket !== "done" && item("Do it tomorrow", <SunMedium className="size-5" />, () => (actions.tomorrow(t.id), toast("Moved to tomorrow.")))}
        {t.bucket !== "today" && t.bucket !== "done" && item("Move to Today", <span className="text-[15px]">→</span>, () => actions.move(t.id, "today"))}
        {t.bucket !== "week" && t.bucket !== "done" && item("Move to This week", <span className="text-[15px]">→</span>, () => actions.move(t.id, "week"))}
        {t.bucket !== "later" && t.bucket !== "done" && item("Move to Later", <span className="text-[15px]">→</span>, () => actions.move(t.id, "later"))}
        {t.bucket === "done" && item("Put it back", <RotateCcw className="size-5" />, () => actions.restore(t.id))}
        {item("Edit", <Sparkles className="size-5" />, () => onOpen(t))}
        {item("Make a copy", <Dup className="size-5" />, () => (actions.duplicate(t.id), toast("Copy made.")))}
        {item(
          "Delete",
          <Trash2 className="size-5" />,
          () => {
            const gone = actions.remove(t.id);
            if (gone) toast("Task deleted.", { action: { label: "Undo", onClick: () => actions.put(gone) } });
          },
          true
        )}
      </ul>
    </Sheet>
  );
}
