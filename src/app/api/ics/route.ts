// Stateless relay for calendar links (iCloud, Outlook, Google and others).
// Browsers cannot read these feeds directly. The link arrives in the body, so
// it never appears in request logs. Nothing is logged or stored.
export const runtime = "edge";

const HOSTS = ["icloud.com", "google.com", "outlook.com", "office365.com", "live.com", "fastmail.com", "proton.me", "yahoo.com", "zoho.com"];
const MAX = 3_000_000;

export async function POST(req: Request) {
  let url = "";
  try {
    url = String(((await req.json()) as { url?: string }).url ?? "").trim();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  url = url.replace(/^webcals?:\/\//i, "https://");
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return Response.json({ error: "That does not look like a calendar link." }, { status: 400 });
  }
  if (u.protocol !== "https:" || !HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`)))
    return Response.json({ error: "Use a link from iCloud, Google, Outlook or another calendar service." }, { status: 400 });

  const r = await fetch(u.toString(), { headers: { accept: "text/calendar, text/plain" }, redirect: "follow" }).catch(() => null);
  if (!r || !r.ok) return Response.json({ error: "That calendar did not answer. Check the link is still shared." }, { status: 502 });
  const text = await r.text();
  if (text.length > MAX) return Response.json({ error: "That calendar is too large to read." }, { status: 413 });
  if (!text.includes("BEGIN:VCALENDAR")) return Response.json({ error: "That link is not a calendar feed." }, { status: 400 });
  return new Response(text, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
}
