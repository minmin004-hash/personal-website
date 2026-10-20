# Content management and security

## Architecture

The public site remains on GitHub Pages. `/admin/` is a public onboarding portal linking to hosted Pages CMS, not a custom login server. Pages CMS reads `.pages.yml`, authenticates with GitHub and writes `content/site.json` and media to the repository. No OAuth secret, GitHub token, password, or writable API endpoint is deployed with the static site. The Configuration and Cache management screens are enabled for authorized GitHub users to recover stale CMS schemas; these settings are UI controls, not an authorization boundary.

`content.js` loads JSON and renders into DOM nodes using textContent. It does not interpret HTML/Markdown or insert content using innerHTML. It validates the entire supported record before replacing the original main element. When loading or validation fails, the original saved HTML remains visible. This snapshot is a fallback, not automatically synchronized; normal updates come from JSON. JavaScript is required for CMS changes to appear. Search engines that do not execute JavaScript may see the original HTML snapshot. Use a server/build-rendered implementation in a future upgrade if that becomes a requirement.

## Owner activation (required once)

1. Visit `https://minmin004-hash.github.io/personal-website/admin/`.
2. Open Pages CMS, sign in through GitHub, and install/authorize the official Pages CMS app if requested. Select **Only select repositories → personal-website**. Do not grant access to unrelated repositories. Review actual requested permissions; the app may require repository-content access that includes code, not just a content folder.
3. Choose owner `minmin004-hash`, repository `personal-website`, branch `main`.
4. Open **Nội dung website**, change a harmless sentence and save. Confirm a commit appears, GitHub Pages deployment succeeds, and the public site displays it. Restore the sentence if this was just a test.
5. Confirm an account without repository write access cannot edit through the hosted CMS. Log out after testing. Authentication, CSRF/session handling and server-side authorization are provided by Pages CMS/GitHub and cannot be verified by testing this static portal alone.

Steps 2–5 need the owner's interactive authentication. Do not report CMS login or authenticated saving as verified until these are actually exercised. There is no separate local administrator password. Use GitHub passkeys/2FA; store recovery codes privately.

## Editorial workflow

The JSON form includes profile/portrait/CV, about text, research-interest list, research areas, highlighted project, publications (including optional HTTPS DOI/page and PDF links), education, languages, experience, email and SNS. List order determines display order. Remove optional links by clearing their fields. Saving to main publishes via the existing GitHub Pages branch deployment. This configuration does not implement private drafts or approval workflows. The repository and its history are public, including JSON, uploaded PDFs, and text not displayed on the website.

Media input/output is `assets`, relative to the repository/site so project Pages paths work. Uploads are configured for png/jpg/jpeg/webp/pdf only. The public renderer accepts raster portrait paths and PDF CV paths inside assets, rejects traversal paths, external portraits, SVG and executable URL protocols. Existing filenames use simple ASCII names; use names such as `portrait-2026.jpg` or `cv-2026.pdf` (letters, digits, spaces, dash, underscore, dot). Update the relevant form field after uploading a new file. Unused old files remain in public Git history even after deletion. There is no malware scanner or private document storage here; only upload trusted material. Extension restrictions do not guarantee file safety. Hosted service limits apply to uploads; no custom size limit is claimed.

## Implemented protections and limits

- Content is inserted as text, never HTML. Script-looking text displays literally.
- Links allow HTTPS only and reject credentials, control characters and malformed URLs; new tabs use noopener/noreferrer. HTTPS does not prove a destination is trustworthy.
- Email and record shapes are validated; invalid data leaves the original website snapshot intact.
- Content Security Policy on the public page allows local scripts/styles/images/data only and blocks objects, frames, forms, and base overrides. Admin portal has no JavaScript, forms, network data requests or embedded login iframe.
- CSP is set via HTML meta because GitHub Pages does not provide arbitrary response headers. Meta CSP cannot enforce frame-ancestors; no anti-framing header or HTTP-only cookie protections are claimed for the portal. HTTPS is supplied by GitHub Pages.
- No local write endpoint or shared admin password. The public portal cannot grant editing access.
- Pages CMS is a third-party trust dependency. Review its current permissions and practices before connecting. Hiding a CMS setting or limiting visible media is not a substitute for GitHub authorization. Repo writers/admins can bypass these UI controls and change code or configuration.
- No provider-enforced single-admin restriction has been configured from this environment. Keep GitHub write access limited to intended editors and do not add public/invited editors in Pages CMS unless intended.

## Recovery

Revoke Pages CMS access in GitHub Settings → Applications / Installations if suspicious. Review account sessions and repository collaborators. Revoke leaked credentials and inspect commits, workflows and settings before restoring known-good content. Use a revert commit to restore earlier content without rewriting history. A deleted secret may remain in Git history and must be rotated. To temporarily disable dynamic content, revert the CMS integration commit while investigating.

## Validation

Run `npm test` with Node.js, Python 3, Playwright and Chromium available. The test starts a temporary local server, verifies desktop/mobile content, filtering, publication links, safe rendering of script payloads, rejection of unsafe URLs and asset traversal, fallback behavior, and portal CSP. It does not test hosted CMS authentication or app permissions.

CMS configuration was accepted by the official Pages CMS ConfigSchema at upstream commit `6f4e860a35d934406580287e7042e5e111e207a1`. All 117 current content-field instances were checked, including blank optional links. The browser suite passed 23 checks. Owner activation remains required; service behavior may evolve.

## Add a link to each publication

Open Pages CMS → **Nội dung website** → **Công bố khoa học**. Expand a publication by its title, then fill **Link bài báo / báo cáo / luận văn** with its official HTTPS URL or full DOI URL (`https://doi.org/...`). Optionally fill **Link đọc PDF / tài liệu** with a public HTTPS PDF/document link. Save to main and wait for Pages deployment. The title and View article / View report / thesis button use the first link; Read PDF uses the second. Both open in new tabs. Empty link fields produce no buttons. Do this independently for each existing or new publication, and select the appropriate publication type. No example URLs are published as real research links.

## Stale CMS configuration / deleted fields still required

The hosted service caches parsed `.pages.yml` independently of the browser. A browser refresh alone may not refresh the server-side schema. Back up unsaved editorial changes before navigating. Open `https://app.pagescms.org/minmin004-hash/personal-website/main/configuration`; this editor reads `.pages.yml` directly from GitHub. Verify it no longer includes `portraitCaption`/`portraitNote`, then Save the current configuration without editing it. The settings-save handler updates the CMS configuration cache. Reopen the content form and reload before entering the backed-up changes again. No placeholder captions are required. Configuration and Cache screens are enabled for future maintenance; Configuration cache → Refresh cache explicitly refetches and revalidates the GitHub config. A stale older schema may hide Cache until configuration is synchronized once. This repair needs the owner's authenticated session; do not claim the actual hosted form was repaired until confirmed there.
