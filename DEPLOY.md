# Float release site — Cloudflare Pages

The static site is in `public/`. It includes the Float 1.0.0 Windows download, guide, changelog, checksum, and logo.

## Recommended: connect Cloudflare Pages to GitHub

The release uses GitHub as its source, so use a Git-integrated Pages project for automatic deployments.

1. Use the GitHub repository `matthiasgoddey-rgb/float-release-site` and commit this folder's `README.md`, `DEPLOY.md`, and `public/` contents to its `main` branch.
2. In Cloudflare, open **Workers & Pages** and choose **Create application > Pages > Connect to Git**.
3. Select GitHub and authorize the Cloudflare Workers and Pages app for the `float-release-site` repository.
4. Select the repository and configure the first build:
   - Production branch: `main`
   - Build command: `exit 0`
   - Build output directory: `public`
   - Project name: `float-release-site` (if available)
5. Complete setup and review the resulting `*.pages.dev` address.

Cloudflare will deploy when changes are pushed to the production branch. Preview deployments are also available for other branches and pull requests.

Choose Git integration when creating the Pages project: Cloudflare does not let a Git-integrated project switch to Direct Upload later, or vice versa.

## Direct Upload package

`../Float-Release-Website-Cloudflare-Pages.zip` contains the same public files at the ZIP root. It can be uploaded through Cloudflare Pages Direct Upload if manual deployment is preferred. A Direct Upload project cannot later be converted to Git integration, so use this only if you want a separate manually deployed project.

## Files

- `README.md` — repository overview.
- `public/index.html` — release landing page.
- `public/styles.css` — responsive styling.
- `public/assets/Float-logo.svg` — supplied Float logo.
- `public/downloads/Float-Windows-v1.0.0.zip` — end-user installer and portable app package.
- `public/downloads/Float-Windows-v1.0.0.zip.sha256` — archive checksum.
- `public/downloads/README.txt` — installation and privacy guide.
- `public/downloads/CHANGELOG.md` — release history.
- `public/_headers` — security and cache headers.
