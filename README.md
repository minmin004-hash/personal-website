# Hoang Thi Ngoc Huyen — personal academic website

A responsive, dependency-free website based on the supplied CV. Includes the original portrait, downloadable CV, research areas, filterable selected work, education, experience, and email contact.

## Run locally

From this directory, run `npm run dev` (requires Python 3 and npm), or `python3 -m http.server 3000 --bind 0.0.0.0`. Open port 3000 in a development environment that supports web previews.

## Deploy

Publish this directory with any static hosting service, including GitHub Pages. No build or credentials are required. No deployment has been performed.

## Update

Edit `index.html` for content, `styles.css` for design, and `script.js` for navigation and publication filtering. Replace `assets/Hoang-Thi-Ngoc-Huyen-CV-public.pdf` when updating the CV. Images, fonts, and assets are local; no external service is needed.

Dates follow the supplied CV. It lists the M.A. under 2023 and the thesis under 2025; confirm these dates before publication. The 2026 AALSE presentation is marked accepted, as stated in the CV. Publication titles are not external links because the CV does not supply verified URLs.

## Content administration

Visit `/admin/` for the Pages CMS setup portal. The owner must authorize the GitHub app for this repository before editing. See [admin and security guide](docs/ADMIN.md). Normal edits are stored in `content/site.json`; `index.html` is the original fallback snapshot. This uses a third-party hosted CMS; authenticated editing has to be verified after owner authorization.
