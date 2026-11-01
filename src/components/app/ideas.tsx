"use client";

import { Archive, ChevronDown, Lightbulb, NotebookPen, Pencil, Sparkles, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Entry, type EntryKind, type State, dueIdeas, prettyDue, ymd } from "@/lib/tasks";
import type { Actions } from "@/lib/use-tasks";
import { feel } from "@/lib/feedback";
import { useHold } from "@/lib/use-hold";
import { Sheet } from "./sheet";

const ago = (iso: string) => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 864e5);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};

/**
 * Ideas or notes as a list, shown on Home under the Ideas and Notes toggle.
 * Tap to open, hold for options. Ideas come back on Home after a while.
 */
export function EntryList({ kind, state, actions }: { kind: EntryKind; state: State; actions: Actions }) {
  const [open, setOpen] = useState<Entry | null>(null);
  const [menu, setMenu] = useState<Entry | null>(null);
  // Keep the last item while the menu sheet slides away.
  const [menuLast, setMenuLast] = useState<Entry | null>(null);
  useEffect(() => {
    if (menu) setMenuLast(menu);
  }, [menu]);
  const [edit, setEdit] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const today = ymd();
  const list = state.entries.filter((e) => e.kind === kind && e.status === "open");
  const archived = state.entries.filter((e) => e.kind === kind && e.status !== "open");

  // Ideas that came back, reviewed one at a time.
  const back = kind === "idea" ? dueIdeas(state, today) : [];
  const first = back[0];

  return (
    <div>
      <AnimatePresence initial={false} mode="popLayout">
        {first && (
          <motion.section key={first.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", bounce: 0, duration: 0.32 }} className="mt-5 rounded-[20px] bg-white p-4 ring-1 ring-signal/40" aria-label="Ideas that came back">
            <div className="flex items-center justify-between">
              <p className="t-label flex items-center gap-1.5 text-signal-ink">
                <Lightbulb className="size-3.5" /> {back.length === 1 ? "An idea came back" : `${back.length} ideas came back`}
              </p>
              {back.length > 1 && <span className="t-small text-ink-3">One at a time</span>}
            </div>
            <p className="mt-2 text-[16px] leading-snug [overflow-wrap:anywhere]">{first.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="chip" onClick={() => (actions.entryToTask(first.id), feel("save", "success"), toast("Added to This week."))}>
                <Sparkles className="mr-1 size-3.5" /> Make it a task
              </button>
              <button type="button" className="chip" onClick={() => (actions.snoozeEntry(first.id), feel("tap", "light"))}>
                Not yet
              </button>
              <button type="button" className="chip" onClick={() => (actions.archiveEntry(first.id), feel("tap", "light"))}>
                Let it go
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {list.length === 0 ? (
        <div className="mt-8 rounded-[24px] bg-white px-5 py-7 text-center ring-1 ring-line">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-signal-soft text-signal-ink">{kind === "idea" ? <Lightbulb className="size-6" /> : <NotebookPen className="size-6" />}</span>
          <p className="t-body mt-3 text-ink-2">{kind === "idea" ? "No ideas yet. Type one above so it stops circling in your head. It comes back in a few days." : "No notes yet. Type one above. Numbers, addresses, little facts."}</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
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
