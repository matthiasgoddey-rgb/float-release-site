import { json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  return json({
    reviewsEnabled: Boolean(env.DB && env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY),
    turnstileSiteKey: String(env.TURNSTILE_SITE_KEY || ""),
  }, 200, { "Cache-Control": "public, max-age=300" });
}

export function onRequest({ request }) {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}

