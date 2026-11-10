import { database, utcDay } from "../_lib/http.js";

const RELEASES = new Map([
  ["Floater-Typist-Windows-v1.0.2.zip", "1.0.2"],
  ["Float-Windows-v1.0.1.zip", "1.0.1"],
  ["Float-Windows-v1.0.0.zip", "1.0.0"],
]);

export async function onRequest(context) {
  const { request, env } = context;
  const response = await context.next();
  const file = String(context.params.file || "");
  const version = RELEASES.get(file);
  if (!version || request.method !== "GET" || ![200, 206].includes(response.status)) return response;

  const db = database(env);
  if (!db) return response;

  const recording = db.prepare(`
    INSERT INTO daily_metrics (day, event, page, item, count, seconds)
    VALUES (?, 'download_response', 'downloads', ?, 1, 0)
    ON CONFLICT(day, event, page, item)
    DO UPDATE SET count = count + 1
  `).bind(utcDay(), version).run().catch(() => undefined);

  if (typeof context.waitUntil === "function") context.waitUntil(recording);
  else await recording;
  return response;
}

