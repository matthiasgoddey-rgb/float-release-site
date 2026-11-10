import { errorJson, json } from "./http.js";

let cachedKeySet = { domain: "", expiresAt: 0, keys: [] };

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonPart(value) {
  const bytes = base64UrlToBytes(value);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function accessDomain(env) {
  return String(env.CF_ACCESS_TEAM_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

async function getAccessKeys(domain) {
  if (cachedKeySet.domain === domain && cachedKeySet.expiresAt > Date.now()) {
    return cachedKeySet.keys;
  }

  const response = await fetch(`https://${domain}/cdn-cgi/access/certs`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Access key lookup failed");

  const body = await response.json();
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error("Access key set was empty");

  cachedKeySet = { domain, expiresAt: Date.now() + 5 * 60 * 1000, keys };
  return keys;
}

export async function verifyAccess(request, env) {
  const domain = accessDomain(env);
  const expectedAudiences = String(env.CF_ACCESS_AUDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const adminEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  const token = request.headers.get("Cf-Access-Jwt-Assertion");

  if (!domain || !expectedAudiences.length || !adminEmail || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodeJsonPart(parts[0]);
    const claims = decodeJsonPart(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(claims.exp) || claims.exp <= now) return null;
    if (Number.isFinite(claims.nbf) && claims.nbf > now + 30) return null;
    if (claims.iss !== `https://${domain}`) return null;

    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!expectedAudiences.some((audience) => audiences.includes(audience))) return null;
    if (String(claims.email || "").trim().toLowerCase() !== adminEmail) return null;

    const keys = await getAccessKeys(domain);
    const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return valid ? claims : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(request, env) {
  const claims = await verifyAccess(request, env);
  if (!claims) {
    return { ok: false, response: errorJson("Administrator sign-in is required.", 401) };
  }
  return { ok: true, claims };
}

export function recordAdminAction(db, action, itemType, itemId, actor) {
  return db.prepare(
    "INSERT INTO admin_audit (id, actor, action, item_type, item_id, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), actor, action, itemType, itemId, new Date().toISOString()).run();
}

export function unavailableAdmin() {
  return json({ error: "The admin service is not configured yet." }, 503);
}

