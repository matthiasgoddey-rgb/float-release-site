# Backend setup for Floater Typist

This page is an operator checklist for the backend preview. Do not merge or enable the feature in production until every required control below is configured and the preview has been reviewed.

## 1. Create and bind D1

1. In Cloudflare, open **Workers & Pages → D1 SQL Database** and create a database named `floater-typist-site`.
2. Open its SQL console and run the complete file `migrations/0001_initial.sql` once.
3. Open the **float-release-site** Pages project, then **Settings → Bindings → Add → D1 database**.
4. Set the variable/binding name to exactly `DB`, select the database, save, and deploy a preview branch so the Functions receive the binding.

The schema contains daily aggregates, private review records, announcement content, and a small admin audit trail. It does not contain visitor identity fields.

## 2. Protect the admin paths with Cloudflare Access

Use the owner’s normal identity-provider sign-in as the first factor and a TOTP authenticator application as the second factor. Cloudflare Access supports authenticator-based independent MFA; configure the requirement in Zero Trust before exposing the admin paths. Enroll a personal authenticator app and save recovery codes in the account’s password manager. Do not put an authenticator seed, generated code, or recovery code in this repository or share it in chat.

Create two self-hosted Access applications on `floatertypist.store`:

| Application path | Allow rule | MFA |
| --- | --- | --- |
| `/admin*` | Include only the owner’s exact sign-in email | Require MFA / authenticator app |
| `/api/admin/*` | Include only the owner’s exact sign-in email | Require MFA / authenticator app |

If the Access UI does not allow both URL paths in one application, keep these as separate applications. Copy the audience tag from each application. The backend accepts the two audience tags as a comma-separated list, but both apps must require the same owner identity and MFA.

Add these **Pages project variables**:

- `CF_ACCESS_TEAM_DOMAIN` — the team hostname such as `your-team.cloudflareaccess.com`, without `https://`.
- `CF_ACCESS_AUDS` — the two Access application audience tags separated by a comma.
- `ADMIN_EMAIL` — the exact owner email used by Access.

The admin dashboard has no password or authenticator-code form. Cloudflare Access handles sign-in and TOTP; the Functions independently verify the signed Access JWT, its issuer, audience, expiry, and email allowlist.

## 3. Configure Turnstile before accepting reviews

1. Create a Cloudflare Turnstile widget for `floatertypist.store` and any canonical host that serves the form.
2. Set the widget's allowed hostnames. The implementation verifies the token at Cloudflare Siteverify and checks the request hostname and `review` action.
3. Add the public widget key as `TURNSTILE_SITE_KEY` and the private key as a **Pages secret** named `TURNSTILE_SECRET`.

The review form stays hidden until D1 and both Turnstile values are present. New submissions are pending until the owner approves them.

## 4. Add edge rate limits

Create Cloudflare rate-limiting rules for `POST /api/events`, `POST /api/reviews`, `DELETE /api/reviews`, and `/api/admin/*`. Keep the event endpoint conservative because it accepts public traffic. Edge rate limiting may use request IP transiently to apply a rule; the website Functions do not write IP addresses into D1.

## 5. Publish with care

- Test the branch in a Pages preview before merging it to `main`.
- Use the dashboard date/time fields to schedule messages. A draft is private; a live item only appears during its schedule and on its selected placement.
- Set the eyebrow to “Sponsored” for paid placements. Include source and permission details for quotations; use original copy when permission is unclear.
- Keep announcement copy and links factual. The editor accepts text and HTTPS links, not HTML or scripts.
- Recheck the privacy wording, rate limits, D1 backup, retention, and Access policy after any future change.

## Authenticator security note

The code authenticator belongs to the owner’s identity account, not to Floater Typist. Cloudflare Access stores/enforces the MFA enrollment. The website stores only its Access audience configuration and does not receive or retain TOTP codes or recovery codes.

