"use client";

import { Archive, ArrowUp, ChevronDown, Lightbulb, Mic, NotebookPen, Pencil, Sparkles, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Entry, type EntryKind, type State, prettyDue, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { useSpeech } from "@/lib/use-speech";
import { feel } from "@/lib/feedback";
import { useHold } from "@/lib/use-hold";
import { keepFocus } from "./steps";
import { Sheet } from "./sheet";
import { TopBar } from "./today";

const ago = (iso: string) => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 864e5);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};

/** Ideas and notes. Ideas come back on Today after a while. Notes stay here. */
export function Ideas({ state, actions, onAdd, onSettings, onHelp, doneCount, totalCount }: { state: State; actions: Actions; onAdd: () => void; onSettings: () => void; onHelp: () => void; doneCount: number; totalCount: number }) {
  const [kind, setKind] = useState<EntryKind>("idea");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<Entry | null>(null);
  const [menu, setMenu] = useState<Entry | null>(null);
  // Keep the last item while the menu sheet slides away.
  const [menuLast, setMenuLast] = useState<Entry | null>(null);
  useEffect(() => {
    if (menu) setMenuLast(menu);
  }, [menu]);
  const [edit, setEdit] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const speech = useSpeech((t, final) => final && setText((v) => (v ? `${v} ${t}` : t)));
  const today = ymd();
  const list = state.entries.filter((e) => e.kind === kind && e.status === "open");
  const archived = state.entries.filter((e) => e.kind === kind && e.status !== "open");

  const save = () => {
    const e = actions.addEntry(text, kind);
    if (!e) return;
    setText("");
    feel("save", "success");
    toast(kind === "idea" ? "Idea saved. It will come back in a few days." : "Note saved.");
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-36 safe-t">
      <TopBar done={doneCount} total={totalCount} onSettings={onSettings} onAdd={onAdd} onHelp={onHelp} />
      <h1 className="mt-4 text-center font-serif text-[44px] leading-none tracking-[-0.025em]">Ideas</h1>
      <p className="t-small mt-2 text-center text-ink-3">Ideas come back on Today later. Notes stay here.</p>

      <div className="mx-auto mt-6 seg grid w-full max-w-[260px] grid-cols-2 p-1" role="tablist" aria-label="Ideas or notes">
        {(["idea", "note"] as EntryKind[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => (setKind(k), feel("tap"))} className="relative h-10 rounded-full text-[15px] font-semibold">
            {kind === k && <motion.span layoutId="seg" className="seg-knob absolute inset-0" transition={{ type: "spring", bounce: 0, duration: 0.35 }} />}
            <span className={`relative ${kind === k ? "text-ink" : "text-ink-3"}`}>{k === "idea" ? "Ideas" : "Notes"}</span>
          </button>
        ))}
      </div>

      <form
        className="task-row mt-5 flex items-end gap-2 p-2 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label htmlFor="jot" className="sr-only">
          {kind === "idea" ? "Jot an idea" : "Write a note"}
        </label>
        <textarea
          id="jot"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
          placeholder={kind === "idea" ? "Jot an idea…" : "Write a note…"}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] placeholder:text-ink-3 focus:outline-none [field-sizing:content]"
        />
        {speech.supported && (
          <button type="button" onClick={speech.toggle} aria-pressed={speech.listening} aria-label={speech.listening ? "Stop listening" : "Speak"} className={`btn btn-icon size-11 ${speech.listening ? "btn-danger" : "btn-line"}`}>
            <Mic className="size-5" />
          </button>
        )}
        <button type="submit" {...keepFocus} disabled={!text.trim()} aria-label={kind === "idea" ? "Save idea" : "Save note"} className="btn btn-signal btn-icon size-11 shrink-0">
          <ArrowUp className="size-5" />
        </button>
      </form>
      {speech.listening && <p className="t-small mt-2 px-2 text-ink-3">Listening. Your browser turns speech into text, and some browsers use their own online service for this.</p>}

      {list.length === 0 ? (
        <div className="mt-10 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-signal-soft text-signal-ink">{kind === "idea" ? <Lightbulb className="size-6" /> : <NotebookPen className="size-6" />}</span>
          <p className="t-body mt-3 text-ink-2">{kind === "idea" ? "No ideas yet. Put them here so they stop circling in your head." : "No notes yet. Keep numbers, addresses and little facts here."}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          <AnimatePresence initial={false}>
            {list.map((e) => (
              <EntryItem key={e.id} entry={e} today={today} onOpen={() => (setOpen(e), setEdit(e.text))} onMenu={() => setMenu(e)} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <button type="button" className="btn btn-quiet gap-1 px-1 text-[14px]" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
            <ChevronDown className={`size-4 transition-transform ${showArchived ? "rotate-180" : ""}`} /> Archived and turned into tasks ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2">
              {archived.map((e) => (
                <li key={e.id} className="row">
                  <span className="min-w-0 flex-1 text-[15px] text-ink-3 [overflow-wrap:anywhere]">{e.text}</span>
                  <span className="t-small shrink-0 text-ink-3">{e.status === "task" ? "Now a task" : ""}</span>
                  {e.status === "archived" && (
                    <button type="button" className="btn btn-quiet min-h-10 text-[14px]" onClick={() => actions.reopenEntry(e.id)}>
                      Bring back
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Sheet open={!!open} onClose={() => (open && edit.trim() && edit !== open.text && actions.editEntry(open.id, edit), setOpen(null))} title={open?.kind === "note" ? "Note" : "Idea"}>
        {open && (
          <div>
            <label htmlFor="entry-edit" className="sr-only">
              Text
            </label>
            <textarea id="entry-edit" value={edit} onChange={(e) => setEdit(e.target.value)} rows={4} className="field mt-2 resize-none text-[17px]" />
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                className="btn btn-signal w-full"
                onClick={() => {
                  if (edit.trim() && edit !== open.text) actions.editEntry(open.id, edit);
                  actions.entryToTask(open.id);
                  setOpen(null);
                  toast("Added to This week.");
                }}
              >
                <Sparkles className="size-4" /> Make it a task
              </button>
              <button type="button" className="btn btn-line w-full" onClick={() => (actions.archiveEntry(open.id), setOpen(null), toast("Archived."))}>
                Archive
              </button>
              <button
                type="button"
                className="btn btn-quiet w-full gap-1.5 text-danger"
                onClick={() => {
                  const gone = actions.removeEntry(open.id);
                  setOpen(null);
                  if (gone) toast("Deleted.", { action: { label: "Undo", onClick: () => actions.putEntry(gone) } });
                }}
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Sheet>
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.kind === "note" ? "Note" : "Idea"}>
        {menuLast && (
          <ul className="mt-1 pb-2">
            {[
              { label: "Edit", icon: <Pencil className="size-5" />, fn: () => (setOpen(menuLast), setEdit(menuLast.text)) },
              { label: "Make it a task", icon: <Sparkles className="size-5" />, fn: () => (actions.entryToTask(menuLast.id), toast("Added to This week.")) },
              { label: "Archive", icon: <Archive className="size-5" />, fn: () => (actions.archiveEntry(menuLast.id), toast("Archived.")) },
              {
                label: "Delete",
                icon: <Trash2 className="size-5" />,
                danger: true,
                fn: () => {
                  const gone = actions.removeEntry(menuLast.id);
                  if (gone) toast("Deleted.", { action: { label: "Undo", onClick: () => actions.putEntry(gone) } });
                },
              },
            ].map((it) => (
              <li key={it.label}>
                <button type="button" className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] transition-colors active:bg-ink/5 ${it.danger ? "text-danger" : ""}`} onClick={() => (setMenu(null), feel("tap", "light"), it.fn())}>
                  <span className="grid size-6 place-items-center">{it.icon}</span>
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}

function EntryItem({ entry: e, today, onOpen, onMenu }: { entry: Entry; today: string; onOpen: () => void; onMenu: () => void }) {
  const { bind, pressing } = useHold(() => (feel("open"), onMenu()));
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, scale: pressing ? 0.975 : 1 }} exit={{ opacity: 0, scale: 0.97 }} className="task-row">
      <button type="button" {...bind} className="w-full p-4 text-left" onClick={onOpen} aria-label={`${e.text}. Open. Hold for options.`}>
        <p className="whitespace-pre-wrap text-[16px] leading-snug [overflow-wrap:anywhere]">{e.text}</p>
        <p className="t-small mt-1.5 text-ink-3">
          {ago(e.createdAt)}
          {e.kind === "idea" && e.resurfaceAt && ` · comes back ${e.resurfaceAt <= today ? "today" : prettyDue(e.resurfaceAt, today).toLowerCase()}`}
        </p>
      </button>
    </motion.li>
  );
}
