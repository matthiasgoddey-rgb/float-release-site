# Floater Typist website backend

The backend preview is implemented as Cloudflare Pages Functions with a D1 schema. It is ready for a preview branch and remains inactive until the Pages project is given a `DB` binding, Cloudflare Access protection, and the listed environment values. See [BACKEND-SETUP.md](BACKEND-SETUP.md).

## What it provides

- A privacy-limited dashboard for daily page views, selected link clicks, successful ZIP responses, and visible-tab time estimates.
- An optional review form with an optional display name, explicit publication consent, spam verification, private pending moderation, and a one-time review removal receipt.
- A private queue to approve, hide, or delete reviews.
- An announcement editor for release notes, public updates, and clearly labelled sponsored messages. Items can be scheduled, ended, ranked, and shown on the front page, the updates page, or both.
- Authenticator-based multi-factor sign-in for the admin area through Cloudflare Access. The website does not store passwords, TOTP seeds, authenticator codes, or recovery codes.

## Data boundaries

Website analytics are daily totals. The Functions do not store visitor identifiers, cookies, IP addresses, full referrers, user agents, or cross-site IDs. Event names and action labels are allow-listed. Time is the period a page remained visible in a browser tab; it is an estimate, not proof that someone was reading. A `download_response` is an HTTP 200 or 206 file response, not a confirmed saved file or installation.

The website never receives the prepared text, clipboard contents, keystrokes, or typing history from the Windows app. Public reviews require consent and moderation. Names are optional, and the form does not request email addresses. New reviews stay pending. A deletion receipt is displayed once; only its SHA-256 hash is stored.

Announcement and review text is rendered with text nodes, not HTML. Announcement buttons accept HTTPS URLs only. Any quote needs a source and a permission note before saving, and any sponsor item must carry a visible sponsor label.

## Implementation layout

```text
functions/
  _lib/              shared request and Cloudflare Access helpers
  api/events.js      allow-listed daily totals
  api/reviews.js     public reviews and deletion receipts
  api/announcements.js public announcement feed
  api/admin/[[path]].js protected dashboard API
  downloads/[file].js successful release-response counter
migrations/
  0001_initial.sql   D1 tables and indexes
public/
  _routes.json       invokes Functions for API and downloads only
  admin/             protected admin interface
  announcements/     public announcement history
```

The existing GitHub repository uses `public/` as its Pages build output. Keep the production build command and Pages project settings unchanged. Pages Functions discover the repository-root `functions/` folder, and `_routes.json` is stored in the Pages output directory.

## Enablement order

1. Review the draft in a non-production Pages preview.
2. Create the D1 database and apply `migrations/0001_initial.sql`; bind it to the Pages project as `DB`.
3. Configure Cloudflare Access and require a TOTP authenticator for both `/admin*` and `/api/admin/*`; restrict both to the owner email.
4. Add the Access team domain, both application audience tags, owner email, and Turnstile values as Pages environment variables/secrets.
5. Add edge rate limits for `/api/events`, `/api/reviews`, and `/api/admin/*`. Only then should the Pages branch be merged and deployed.

Until the D1 and Turnstile settings exist, review submission is hidden and no site analytics can be written. Until Cloudflare Access is configured, admin APIs reject requests without a valid signed Access JWT and the owner email allowlist.

## Operational notes

- Keep the raw visitor event stream out of the database; update one aggregate row per UTC day, event, page, and item.
- Keep event collection narrow. Never add app-usage telemetry as part of this website feature.
- Back up D1 before migrations and decide on a review/announcement retention period before production.
- When a user asks to remove a review, the one-time receipt form deletes it immediately; admin deletions and moderation changes are recorded in `admin_audit` without copying review text.
- Keep the public site available if analytics is unavailable. Client-side calls intentionally fail quietly.

