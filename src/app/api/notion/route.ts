// Stateless relay to Notion. Notion blocks browsers from calling it directly.
// The person's own token passes straight through. Nothing is logged or stored.
export const runtime = "edge";

type Prop = { type: string; title?: { plain_text: string }[]; date?: { start: string; end?: string | null } | null };
type Page = { id: string; properties?: Record<string, Prop> };

export async function POST(req: Request) {
  let body: { token?: string; from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const token = (body.token ?? "").trim();
  if (!/^(secret_|ntn_)[A-Za-z0-9_]{20,}$/.test(token)) return Response.json({ error: "That does not look like a Notion integration token." }, { status: 400 });
  const from = new Date(body.from ?? Date.now());
  const to = new Date(body.to ?? Date.now() + 14 * 864e5);

  const r = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "content-type": "application/json" },
    body: JSON.stringify({ filter: { property: "object", value: "page" }, sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 100 }),
  });
  if (r.status === 401) return Response.json({ error: "Notion did not accept that token." }, { status: 401 });
  if (!r.ok) return Response.json({ error: "Notion did not answer." }, { status: 502 });
  const j = (await r.json()) as { results?: Page[] };

  const events = [];
  for (const p of j.results ?? []) {
    const props = Object.values(p.properties ?? {});
    const title = props.find((x) => x.type === "title")?.title?.map((t) => t.plain_text).join("").trim();
    const date = props.find((x) => x.type === "date" && x.date?.start)?.date;
    if (!title || !date) continue;
    const allDay = date.start.length === 10;
    const start = new Date(allDay ? `${date.start}T09:00:00` : date.start);
    if (start < from || start > to) continue;
    events.push({ id: p.id, title, start: start.toISOString(), end: date.end ? new Date(date.end).toISOString() : undefined, allDay });
  }
  return Response.json({ events }, { headers: { "cache-control": "no-store" } });
}
