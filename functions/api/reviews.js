import { database, errorJson, json, plainText, readJson, sameOrigin, utcNow } from "../_lib/http.js";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token, secret, expectedHost) {
  const response = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, idempotency_key: crypto.randomUUID() }),
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === expectedHost && result.action === "review";
}

function randomReceipt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashReceipt(receipt) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(receipt));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet({ env }) {
  const db = database(env);
  if (!db) return json({ reviews: [] }, 200, { "Cache-Control": "public, max-age=60" });

  try {
    const result = await db.prepare(`
      SELECT rating, display_name, review_text, submitted_at
      FROM reviews
      WHERE status = 'approved' AND publish_consent = 1
      ORDER BY moderated_at DESC
      LIMIT 12
    `).all();
    return json({ reviews: result.results || [] }, 200, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch {
    return json({ reviews: [] }, 200, { "Cache-Control": "no-store" });
  }
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return errorJson("Cross-origin requests are not accepted.", 403);
  const db = database(env);
  if (!db || !env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY) {
    return json({ error: "Review submissions are not open yet." }, 503);
  }

  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  // Quietly accept honeypot submissions without storing them.
  if (typeof body.company === "string" && body.company.trim()) {
    return json({ ok: true, status: "pending", message: "Thanks. Your review is waiting for moderation." }, 202);
  }

  const rating = Number(body.rating);
  const displayName = plainText(
    typeof body.displayName === "string" && body.displayName.trim() ? body.displayName : "Floater Typist user",
    40,
    true,
  );
  const reviewText = plainText(body.reviewText, 1200, true);
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return errorJson("Choose a rating from 1 to 5.");
  if (!displayName || !reviewText) return errorJson("Add a short review. A display name is optional.");
  if (body.publishConsent !== true) return errorJson("Please confirm the review may be published if approved.");
  if (!token || token.length > 2048) return errorJson("Complete the verification step.");

  let verified = false;
  try {
    verified = await verifyTurnstile(token, env.TURNSTILE_SECRET, new URL(request.url).hostname);
  } catch {
    verified = false;
  }
  if (!verified) return errorJson("Verification could not be confirmed. Please try again.", 400);

  const id = crypto.randomUUID();
  const receipt = randomReceipt();
  const receiptHash = await hashReceipt(receipt);
  const submittedAt = utcNow();
  try {
    await db.prepare(`
      INSERT INTO reviews (id, rating, display_name, review_text, publish_consent,
        deletion_token_hash, status, submitted_at, moderated_at)
      VALUES (?, ?, ?, ?, 1, ?, 'pending', ?, NULL)
    `).bind(id, rating, displayName, reviewText, receiptHash, submittedAt).run();
  } catch {
    return json({ error: "The review could not be saved. Please try again later." }, 503);
  }

  return json({
    ok: true,
    status: "pending",
    receipt: { id, token: receipt },
    message: "Thanks. Your review is waiting for moderation. Save the removal code shown here; it is displayed only once.",
  }, 201);
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return errorJson("Cross-origin requests are not accepted.", 403);
  const db = database(env);
  if (!db) return json({ error: "Review removal is not available yet." }, 503);

  const parsed = await readJson(request, 1024);
  if (!parsed.ok) return parsed.response;
  const id = new URL(request.url).searchParams.get("id") || "";
  const receipt = typeof parsed.value.token === "string" ? parsed.value.token : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || receipt.length < 32 || receipt.length > 128) {
    return errorJson("Review receipt is not valid.");
  }

  try {
    const row = await db.prepare("SELECT deletion_token_hash FROM reviews WHERE id = ?")
      .bind(id).first();
    if (!row || !row.deletion_token_hash) return errorJson("Review receipt was not found.", 404);
    const suppliedHash = await hashReceipt(receipt);
    const expected = new TextEncoder().encode(row.deletion_token_hash);
    const supplied = new TextEncoder().encode(suppliedHash);
    let difference = expected.length ^ supplied.length;
    const byteCount = Math.max(expected.length, supplied.length);
    for (let index = 0; index < byteCount; index += 1) {
      difference |= (expected[index] || 0) ^ (supplied[index] || 0);
    }
    if (difference !== 0) return errorJson("Review receipt was not valid.", 403);
    await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
    return json({ ok: true, message: "Your review has been removed." });
  } catch {
    return json({ error: "The review could not be removed. Please try again later." }, 503);
  }
}

export function onRequest({ request }) {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET, POST, DELETE", "Cache-Control": "no-store" },
  });
}

