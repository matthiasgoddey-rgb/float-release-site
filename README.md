# Floater Typist site

Static Cloudflare Pages site for `https://floatertypist.store/`.

- Entry point: `index.html`
- Styles: `styles.css`
- Browser interactions: `script.js`
- Current Windows release: Floater Typist 1.0.2, distributed as `downloads/Floater-Typist-Windows-v1.0.2.zip`
- Cloudflare Pages project name remains `float-release-site` to keep the existing project and `pages.dev` address.

The Windows package changes the app and installer display name while retaining `Float.exe`, `Float-Setup.exe`, the existing install location, and the uninstall registry key so current users can update in place. The executables remain unsigned.

See `DEPLOY.md` for the existing Cloudflare Pages settings and release details, and `DOMAIN-SETUP.md` to attach the apex domain to that project.

The backend preview and required Cloudflare configuration are described in `BACKEND-PLAN.md` and `BACKEND-SETUP.md`. Do not enable collection or publish the admin interface until D1, Cloudflare Access authenticator MFA, Turnstile, and edge rate limits are configured.

The current Windows binaries are unsigned. See `SIGNING-SETUP.md` for trusted code-signing options and the prepared release script. Code signing does not guarantee that Google Chrome Safe Browsing will stop flagging an uncommon download.

