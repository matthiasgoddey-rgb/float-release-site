import { database, errorJson, json, readJson, sameOrigin, utcDay } from "../_lib/http.js";

const ALLOWED_EVENTS = new Set(["page_view", "cta_click", "engaged_time"]);
const ALLOWED_PAGES = new Set(["home", "announcements"]);
const ALLOWED_ITEMS = new Set([
  "",
  "download-nav",
  "download-hero",
  "download-release",
  "community-github",
  "community-x",
  "support-one-time",
  "announcement-cta",
  "review-submit",
]);

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return errorJson("Cross-origin requests are not accepted.", 403);
  const parsed = await readJson(request, 2048);
  if (!parsed.ok) return parsed.response;

  const body = parsed.value;
  const event = typeof body.event === "string" ? body.event : "";
  const page = typeof body.page === "string" && ALLOWED_PAGES.has(body.page) ? body.page : "home";
  const item = typeof body.item === "string" && ALLOWED_ITEMS.has(body.item) ? body.item : "";
  if (!ALLOWED_EVENTS.has(event)) return errorJson("Unknown analytics event.");
  if (event === "cta_click" && !item) return errorJson("A known action is required.");

  const rawSeconds = Number(body.seconds || 0);
  const seconds = event === "engaged_time" && Number.isFinite(rawSeconds)
    ? Math.max(0, Math.min(600, Math.floor(rawSeconds)))
    : 0;
  if (event === "engaged_time" && seconds < 5) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const db = database(env);
  if (!db) return json({ ok: false, error: "Analytics storage is not configured." }, 503);

  try {
    await db.prepare(`
      INSERT INTO daily_metrics (day, event, page, item, count, seconds)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(day, event, page, item)
      DO UPDATE SET count = count + 1, seconds = seconds + excluded.seconds
    `).bind(utcDay(), event, page, item, seconds).run();
  } catch {
    return json({ ok: false, error: "Analytics could not be recorded." }, 503);
  }

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export function onRequest({ request }) {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}

