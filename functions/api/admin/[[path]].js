import { database, errorJson, json, plainText, readJson, sameOrigin, utcNow } from "../../_lib/http.js";
import { recordAdminAction, requireAdmin } from "../../_lib/access.js";

const ALLOWED_KINDS = new Set(["announcement", "release", "sponsored"]);
const ALLOWED_STATUSES = new Set(["draft", "live", "archived"]);
const ALLOWED_PLACEMENTS = new Set(["banner", "page", "both"]);

function pathParts(request) {
  return new URL(request.url).pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
}

function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function optionalUrl(value) {
  const url = plainText(value || "", 500);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

async function listMetrics(db, url) {
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get("from") || today;
  const to = url.searchParams.get("to") || today;
  if (!validDay(from) || !validDay(to) || from > to || Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > 366 * 86400000) {
    return errorJson("Choose a valid date range of up to one year.");
  }
  const rows = await db.prepare(`
    SELECT day, event, page, item, count, seconds
    FROM daily_metrics WHERE day BETWEEN ? AND ? ORDER BY day ASC, event ASC, item ASC
  `).bind(from, to).all();
  return json({ from, to, metrics: rows.results || [] });
}

async function listReviews(db, url) {
  const status = url.searchParams.get("status") || "pending";
  if (!["pending", "approved", "hidden"].includes(status)) return errorJson("Unknown review status.");
  const rows = await db.prepare(`
    SELECT id, rating, display_name, review_text, status, submitted_at, moderated_at
    FROM reviews WHERE status = ? ORDER BY submitted_at DESC LIMIT 200
  `).bind(status).all();
  return json({ reviews: rows.results || [] });
}

async function listAnnouncements(db) {
  const rows = await db.prepare(`
    SELECT id, kind, status, eyebrow, title, body, quote_text, quote_attribution,
      quote_source, quote_permission, cta_label, cta_url, starts_at, ends_at,
      placement, priority, created_at, updated_at
    FROM announcements ORDER BY updated_at DESC LIMIT 200
  `).all();
  return json({ announcements: rows.results || [] });
}

async function adminGet(request, db) {
  const [section] = pathParts(request);
  if (section === "metrics") return listMetrics(db, new URL(request.url));
  if (section === "reviews") return listReviews(db, new URL(request.url));
  if (section === "announcements") return listAnnouncements(db);
  return errorJson("Unknown admin section.", 404);
}

async function moderateReview(request, db, actor) {
  const bodyResult = await readJson(request, 2048);
  if (!bodyResult.ok) return bodyResult.response;
  const { id, action } = bodyResult.value;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return errorJson("Review ID is not valid.");
  if (!["approve", "hide", "delete"].includes(action)) return errorJson("Choose approve, hide, or delete.");

  if (action === "delete") {
    const result = await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
    if (!result.meta?.changes) return errorJson("Review was not found.", 404);
  } else {
    const status = action === "approve" ? "approved" : "hidden";
    const result = await db.prepare(`
      UPDATE reviews SET status = ?, moderated_at = ?, moderator = ? WHERE id = ?
    `).bind(status, utcNow(), actor, id).run();
    if (!result.meta?.changes) return errorJson("Review was not found.", 404);
  }

  await recordAdminAction(db, `review_${action}`, "review", id, actor);
  return json({ ok: true });
}

function announcementFields(body) {
  const kind = body.kind;
  const status = body.status;
  const placement = body.placement || "banner";
  const title = plainText(body.title, 120, true);
  const text = plainText(body.body, 2000, true);
  const eyebrow = plainText(body.eyebrow || "", 80);
  const quoteText = plainText(body.quoteText || "", 600);
  const quoteAttribution = plainText(body.quoteAttribution || "", 120);
  const quoteSource = plainText(body.quoteSource || "", 500);
  const quotePermission = plainText(body.quotePermission || "", 240);
  const ctaLabel = plainText(body.ctaLabel || "", 60);
  const ctaUrl = optionalUrl(body.ctaUrl || "");
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
  const endsAt = body.endsAt ? String(body.endsAt) : null;
  const priority = Number(body.priority || 0);
  const startsDate = Date.parse(startsAt);
  const endsDate = endsAt ? Date.parse(endsAt) : null;

  if (!ALLOWED_KINDS.has(kind) || !ALLOWED_STATUSES.has(status) || !ALLOWED_PLACEMENTS.has(placement)) return null;
  if (!title || !text || !eyebrow || ctaUrl === null || !Number.isInteger(priority) || priority < -100 || priority > 100) return null;
  if (!Number.isFinite(startsDate) || (endsAt && !Number.isFinite(endsDate)) || (endsDate && endsDate <= startsDate)) return null;
  if ((quoteText && (!quoteAttribution || !quoteSource || !quotePermission)) || (kind === "sponsored" && !eyebrow.toLowerCase().includes("sponsor"))) return null;
  if (!!ctaLabel !== !!ctaUrl) return null;

  return {
    kind, status, placement, title, text, eyebrow, quoteText, quoteAttribution,
    quoteSource, quotePermission, ctaLabel, ctaUrl,
    startsAt: new Date(startsDate).toISOString(),
    endsAt: endsAt ? new Date(endsDate).toISOString() : null,
    priority,
  };
}

async function saveAnnouncement(request, db, actor) {
  const parsed = await readJson(request, 8192);
  if (!parsed.ok) return parsed.response;
  const fields = announcementFields(parsed.value);
  if (!fields) return errorJson("Check the fields. Quotes need source and permission details; sponsors must be clearly labelled.");

  const now = utcNow();
  const id = typeof parsed.value.id === "string" && /^[0-9a-f-]{36}$/i.test(parsed.value.id)
    ? parsed.value.id : crypto.randomUUID();
  const existing = await db.prepare("SELECT id FROM announcements WHERE id = ?").bind(id).first();
  if (existing) {
    await db.prepare(`
      UPDATE announcements SET kind=?, status=?, eyebrow=?, title=?, body=?, quote_text=?,
        quote_attribution=?, quote_source=?, quote_permission=?, cta_label=?, cta_url=?,
        starts_at=?, ends_at=?, placement=?, priority=?, updated_at=?, updated_by=? WHERE id=?
    `).bind(fields.kind, fields.status, fields.eyebrow, fields.title, fields.text,
      fields.quoteText, fields.quoteAttribution, fields.quoteSource, fields.quotePermission,
      fields.ctaLabel, fields.ctaUrl, fields.startsAt, fields.endsAt, fields.placement,
      fields.priority, now, actor, id).run();
  } else {
    await db.prepare(`
      INSERT INTO announcements (id, kind, status, eyebrow, title, body, quote_text,
        quote_attribution, quote_source, quote_permission, cta_label, cta_url, starts_at,
        ends_at, placement, priority, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, fields.kind, fields.status, fields.eyebrow, fields.title, fields.text,
      fields.quoteText, fields.quoteAttribution, fields.quoteSource, fields.quotePermission,
      fields.ctaLabel, fields.ctaUrl, fields.startsAt, fields.endsAt, fields.placement,
      fields.priority, now, now, actor, actor).run();
  }
  await recordAdminAction(db, existing ? "announcement_update" : "announcement_create", "announcement", id, actor);
  return json({ ok: true, id }, existing ? 200 : 201);
}

async function adminPost(request, db, actor) {
  const [section] = pathParts(request);
  if (section === "reviews") return moderateReview(request, db, actor);
  if (section === "announcements") return saveAnnouncement(request, db, actor);
  return errorJson("Unknown admin section.", 404);
}

async function handle({ request, env }) {
  if (!sameOrigin(request)) return errorJson("Cross-origin requests are not accepted.", 403);
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const [section] = pathParts(request);
  if (request.method === "GET" && section === "session") return json({ isAdmin: true });
  const db = database(env);
  if (!db) return json({ error: "The admin service is not configured yet." }, 503);
  const actor = String(auth.claims.email || "").trim().toLowerCase();
  try {
    if (request.method === "GET") return await adminGet(request, db);
    if (request.method === "POST") return await adminPost(request, db, actor);
    return new Response(null, { status: 405, headers: { Allow: "GET, POST", "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "The admin request could not be completed." }, 503);
  }
}

export const onRequest = handle;

