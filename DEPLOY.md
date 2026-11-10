# Floater Typist release site — Cloudflare Pages

The public website and Windows downloads live in `public/` in the `matthiasgoddey-rgb/float-release-site` repository. The existing Cloudflare Pages project is Git integrated and deploys from `main`.

## Current Pages configuration

- Production branch: `main`
- Build command: `exit 0`
- Build output directory: `public`
- Existing project name and `pages.dev` address: `float-release-site`

Commits to `main` trigger a production deployment. Preview deployments may be created for other branches and pull requests.

## Current release

Floater Typist 1.0.2 is distributed in `public/downloads/Floater-Typist-Windows-v1.0.2.zip`. The ZIP includes the portable app, per-user installer, user guide, changelog, logo, and SHA-256 checksums. The Windows executables are unsigned.

The app and installer display Floater Typist while retaining `Float.exe`, `Float-Setup.exe`, and the existing install location for in-place updates.

## Custom domain

The site metadata and links are prepared for `https://floatertypist.store/`. To attach the apex domain to the existing Pages project, follow [DOMAIN-SETUP.md](DOMAIN-SETUP.md). The domain becomes active after its Cloudflare DNS setup and Pages custom-domain status are complete.
