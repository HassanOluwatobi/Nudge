// Stateless relay to Calendly. Calendly blocks browsers from calling it directly.
// The person's own token passes straight through. Nothing is logged or stored.
export const runtime = "edge";

export async function POST(req: Request) {
  let body: { token?: string; from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const token = (body.token ?? "").trim();
  if (token.length < 20) return Response.json({ error: "That does not look like a Calendly token." }, { status: 400 });
  const headers = { Authorization: `Bearer ${token}` };

  const me = await fetch("https://api.calendly.com/users/me", { headers });
  if (me.status === 401) return Response.json({ error: "Calendly did not accept that token." }, { status: 401 });
  if (!me.ok) return Response.json({ error: "Calendly did not answer." }, { status: 502 });
  const user = ((await me.json()) as { resource?: { uri?: string } }).resource?.uri;
  if (!user) return Response.json({ error: "Calendly did not answer." }, { status: 502 });

  const q = new URLSearchParams({ user, status: "active", count: "100", sort: "start_time:asc", min_start_time: body.from ?? new Date().toISOString(), max_start_time: body.to ?? new Date(Date.now() + 14 * 864e5).toISOString() });
  const r = await fetch(`https://api.calendly.com/scheduled_events?${q}`, { headers });
  if (!r.ok) return Response.json({ error: "Calendly did not answer." }, { status: 502 });
  const j = (await r.json()) as { collection?: { uri: string; name: string; start_time: string; end_time: string }[] };
  const events = (j.collection ?? []).map((e) => ({ id: e.uri.split("/").pop() ?? e.uri, title: e.name, start: e.start_time, end: e.end_time, allDay: false }));
  return Response.json({ events }, { headers: { "cache-control": "no-store" } });
}
