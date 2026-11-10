import { database, json } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  const db = database(env);
  if (!db) return json({ announcements: [] }, 200, { "Cache-Control": "public, max-age=60" });

  const now = new Date().toISOString();
  const history = new URL(request.url).searchParams.get("history") === "1";
  const where = history
    ? "status = 'live' AND placement IN ('page', 'both') AND starts_at <= ?"
    : "status = 'live' AND placement IN ('banner', 'both') AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)";
  const sql = `
    SELECT id, kind, eyebrow, title, body, quote_text, quote_attribution, quote_source,
      cta_label, cta_url, starts_at, ends_at, placement, priority
    FROM announcements
    WHERE ${where}
    ORDER BY priority DESC, starts_at DESC
    LIMIT ?
  `;

  try {
    const statement = history
      ? db.prepare(sql).bind(now, 40)
      : db.prepare(sql).bind(now, now, 40);
    const result = await statement.all();
    return json({ announcements: result.results || [] }, 200, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch {
    return json({ announcements: [] }, 200, { "Cache-Control": "no-store" });
  }
}

export function onRequest({ request }) {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}

