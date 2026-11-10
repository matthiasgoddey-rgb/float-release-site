const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function errorJson(message, status = 400) {
  return json({ error: message }, status);
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin) return origin === new URL(request.url).origin;
  return ["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
}

export async function readJson(request, maxBytes = 4096) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: errorJson("Expected JSON request body.", 415) };
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) {
    return { ok: false, response: errorJson("Request body is too large.", 413) };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: errorJson("Request body is too large.", 413) };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: errorJson("Request body is not valid JSON.") };
  }
}

export function plainText(value, maxLength, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (cleaned.length > maxLength || (required && cleaned.length === 0)) return null;
  return cleaned;
}

export function database(env) {
  return env && env.DB && typeof env.DB.prepare === "function" ? env.DB : null;
}

export function utcNow() {
  return new Date().toISOString();
}

export function utcDay() {
  return utcNow().slice(0, 10);
}

