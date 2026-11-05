# Float 1.0.0 release site

This repository contains the public Float release landing page and end-user Windows download.

## Deploy

Cloudflare Pages is configured to build the `public/` directory with the command `exit 0`. See [DEPLOY.md](DEPLOY.md) for setup details.

## Release files

- [Float for Windows](public/downloads/Float-Windows-v1.0.0.zip)
- [SHA-256 checksum](public/downloads/Float-Windows-v1.0.0.zip.sha256)
- [User guide](public/downloads/README.txt)
- [Changelog](public/downloads/CHANGELOG.md)

The package contains the per-user installer and portable app. The supplied executables are unsigned. The application keeps session text in memory, does not monitor the clipboard, and clears session history when closed.
