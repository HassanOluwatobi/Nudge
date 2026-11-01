import type { State } from "./tasks";
import { ymd } from "./tasks";

/** Download everything as one file. Nothing leaves the phone except to the person's own downloads. */
export function downloadBackup(state: State) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nudgeme-backup-${ymd()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** True when a gentle reminder to back up makes sense: enough to lose, and none in two weeks. */
export function backupDue(state: State, now = Date.now()) {
  const enough = state.tasks.length + state.entries.length >= 5;
  const last = state.settings.lastBackup ? Date.parse(state.settings.lastBackup) : 0;
  return enough && now - last > 14 * 864e5;
}
