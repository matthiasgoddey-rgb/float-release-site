# Put Floater Typist on floatertypist.store

The site’s title, canonical URL, Open Graph URL, download links, and branding are prepared for `https://floatertypist.store/`.

## Connect the domain in Cloudflare Pages

1. Open **Workers & Pages** in the Cloudflare dashboard and select the existing `float-release-site` Pages project.
2. Open **Custom domains**, choose **Set up a domain**, and enter `floatertypist.store`.
3. Complete the DNS setup Cloudflare presents for the domain. For an apex domain, Cloudflare Pages requires the domain to be a zone on the same Cloudflare account and its nameservers to point to Cloudflare.
4. Wait for the Pages custom domain and HTTPS certificate to become active, then open `https://floatertypist.store/` and confirm the site loads.

Cloudflare requires associating the custom domain with the Pages project before adding a manual DNS CNAME. See [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) for current requirements.

The existing project name stays `float-release-site` to preserve its `pages.dev` address and deployment target. The new domain must be attached in the dashboard; `wrangler.toml` cannot register the domain or change its DNS.
