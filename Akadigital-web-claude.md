# CLAUDE.md — AKA Digital Website Rebuild (akadigital-web)

> Master directive for Claude Code on this project. Read this file in full before making any change. This file, `DESIGN_SYSTEM.md`, and `ASSET_MANIFEST.md` are the source of truth — not assumptions, not the live akadigital.net Wix site's current markup, not older brand materials from outside this repo.

---

## 1. Project Overview

AKA Digital (akadigital.net) is a B2B MarTech and digital marketing agency with a regional presence across Southeast Asia and Northeast Asia — headquartered in Singapore, with operations in Vietnam, Indonesia, and Korea. The agency positions itself as a MarTech consulting, CRM implementation, and data solutions partner.

This project is a full rebuild of the existing Wix site into a fast, static-generated site — same content depth and PR credibility, much better performance and design execution. Target quality bar: premium, authoritative, data-driven enterprise tone — comparable to Accenture Song, DEPT Agency, or R/GA, not a typical SMB agency template.

---

## 2. Tech Stack

- **Static site generator:** Eleventy (11ty) v3 — config in `.eleventy.js`, templates in `.njk` (Nunjucks)
- **Styling:** Tailwind CSS v3.4 (+ `@tailwindcss/forms`) + PostCSS/Autoprefixer
- **Dev tooling:** `concurrently` (runs CSS watch + Eleventy serve together)
- **Forms:** Formspree (ID stored in `settings.json`) — contact form submits here, no backend needed
- **Hosting / CI:** Netlify — config in `netlify.toml`; build command `npm run build`, publish directory `dist`
- **i18n:** `locales/` — three locale files: `en.json`, `ko.json`, `vi.json` *(placeholder: confirm whether all three are live/routed, or some are scaffolded for future use)*

### npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs Tailwind watch + Eleventy dev server on port 3000, concurrently |
| `npm run build` | Compiles Tailwind (minified) → runs Eleventy → outputs static site to `dist/` |
| `npm run css:build` | Compiles `src/styles/main.css` → `public/css/main.css`, minified |
| `npm run css:watch` | Same, but watch mode |
| `npm run export:css` | Copies compiled CSS to `exports/css/` |
| `npm run export:json` | Copies all files in `src/_data/` to `exports/json/` |
| `npm run export:assets` | Runs `scripts/export-assets.js` — copies images/videos/fonts to `exports/assets/` |
| `npm run export:build` | Runs `npm run build`, then `scripts/export-build.js` |
| `npm run export:all` | Runs all of the above in sequence — full handoff package |

`dist/` is the deployable output (pure HTML/CSS/JS/assets, no server runtime). `exports/` is a separate handoff package for clients/developers, not used by Netlify directly.

---

## 3. Repository Structure

```
akadigital-web/
├── locales/                → en.json, ko.json, vi.json (i18n strings)
├── node_modules/           → installed deps (never edit)
├── public/                 → static assets served as-is
│   ├── images/             → logos/, partners/, clients/, hero/, activities/, solutions/, team/
│   ├── videos/
│   ├── fonts/
│   └── css/main.css        → compiled Tailwind output (generated, do not hand-edit)
├── scripts/                → export-assets.js, export-build.js
├── src/
│   ├── _data/               → content.json, navigation.json, settings.json, solutions.json,
│   │                          case_studies.json, partners.json, team.json
│   ├── _includes/           → layouts/ (incl. base.njk), partials, components
│   ├── case-studies/        → individual case study templates
│   ├── solutions/           → individual solution/service templates
│   ├── styles/main.css      → Tailwind source (edit this, not public/css/main.css)
│   ├── index.njk            → Homepage
│   ├── about.njk
│   ├── careers.njk
│   ├── case-studies.njk     → Case studies index
│   ├── contact.njk
│   ├── insights.njk         → Blog / insights index
│   ├── tech-partners.njk    → Partners page
│   └── 404.njk
├── .eleventy.js              → Eleventy config (collections, filters, shortcodes, passthrough copy)
├── netlify.toml
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 4. Documentation Map

| File | Purpose |
|---|---|
| `README.md` | General project setup and onboarding |
| `DESIGN_SYSTEM.md` | **Authoritative** brand tokens — colors, typography, spacing, component patterns. Always defer to this file over any other brand reference, including older AKA Digital brand materials outside this repo. *(Note: `ASSET_MANIFEST.md` lists Hanken Grotesk and Inter as the project's variable font files — treat these as the working typefaces unless `DESIGN_SYSTEM.md` says otherwise.)* |
| `ASSET_MANIFEST.md` | Canonical list of every image/video/font slot the site expects, with ✅/⬜ status. Check before adding, removing, or restructuring any visual content. Many slots are still ⬜ — do not invent placeholder content for these; leave clearly marked or flag to the user. |
| `EXPORT_GUIDE.md` | Full export/deploy reference — compiling CSS, exporting JSON content, exporting assets, production build, deployment to Netlify/Vercel/cPanel/S3, and Wix asset migration steps. |
| `CHANGELOG.md` | Running log of changes — append an entry for every meaningful change. |

---

## 5. Site Structure (as actually implemented)

Home (`index.njk`) · About · Careers · Case Studies (index + individual templates under `case-studies/`) · Contact · Insights (blog) · Tech Partners · Solutions (4 sub-pages under `solutions/`, sourced from `solutions.json`) · 404

**Solutions (4, not 3):** CRM / Automation, Programmatic Advertising, GEO / AI SEO, Social Media — per `solutions.json` and the four hero image slots in `ASSET_MANIFEST.md`.

> Note: an earlier planning pass scoped a 9-page structure including separate "Media & PR," "Activities & Events," and "Photo/Video Library" pages. That is **not** what's implemented — event/activity content (Hanoi Data Summit, Martech Innovation 2023, DSS2024, Martech Summit 2024/2025) currently lives as image assets under `public/images/activities/`, likely surfaced via About/Insights/Homepage rather than standalone pages. If dedicated pages for these are still wanted, that's a scoping decision to confirm with Jeffrey, not something to build unprompted.

---

## 6. Critical Rules (non-negotiable)

1. **Asset preservation.** Check `ASSET_MANIFEST.md` before touching any Media/Activities/Photo-Video content. Never delete or simplify existing assets without explicit instruction.
2. **No mock data.** Every stat, partner logo, case study figure, and testimonial must be real, sourced from `ASSET_MANIFEST.md` / `src/_data/*.json` or verified live content — never invented.
3. **Design tokens come only from `DESIGN_SYSTEM.md`.** Do not introduce colors, fonts, or spacing values from memory or outside materials.
4. **Mobile-first, performance-first.** Target a 90+ Lighthouse score.
5. **Partner exclusivity language must be precise.** AKA Digital's partnerships (Mixpanel, Salesforce, Oracle, CleverTap, MoEngage, AB Tasty, Emplifi, Sitecore, Freshworks, etc.) are **exclusive only in Vietnam**. Across the rest of Southeast Asia, AKA Digital is **licensed to operate**, not exclusive. Never write copy that implies SEA-wide exclusivity — this is a factual/legal distinction, not a stylistic one.
6. **Ask before running build/export/commit processes.** Don't preemptively run `npm run build`, `export:*` scripts, or git commits as part of exploratory work — confirm with Jeffrey first to avoid unnecessary token/compute spend. Reading files and making code edits doesn't need pre-approval; executing processes does.
7. **Update `CHANGELOG.md`** after every meaningful change, before considering a task complete.

---

## 7. Brand & Content Quick Reference

**Partnerships:** Mixpanel, Salesforce, Oracle, CleverTap, MoEngage, AB Tasty, Emplifi, Sitecore, Freshworks — exclusive in **Vietnam only**; licensed (non-exclusive) across the rest of Southeast Asia. Verify full current list against `partners.json` / `ASSET_MANIFEST.md`.

**Flagship case study:** FE Credit — MMA Smarties Silver Winner 2022. Highest-priority conversion asset; case study video and cover images are still ⬜ in `ASSET_MANIFEST.md` (`fe-credit-case-study.mp4`, `cover.jpg`, `video-thumb.jpg`).

**Offices (4 — corrected from earlier 2-office assumption):**

| Location | Role | Address | Contact |
|---|---|---|---|
| Singapore | Headquarters | 1 Paya Lebar Link, #04-01, Paya Lebar Quarter, Singapore 408533 | Jeffrey Teo — jeffrey.teo@akadigital.net |
| Vietnam — Ho Chi Minh City | Cong ty TNHH AKA Digital Viet Nam (AKA Digital Vietnam Ltd) | 236/26/8, Dien Bien Phu Street, Gia Dinh Ward, HCMC | Phuong Pham (Maisie) — phuong.pham@akadigital.net, (+84) 903045373 |
| Korea — Seoul | — | — | KS Hwang — kw.hwang@akadigital.net, (+82) 10 23353076 |
| Indonesia — Jakarta | — | EightyEight Tower A, 35th Floor, Kota Kasablanka 12870, South Jakarta | Jeffrey Teo — jeffrey.teo@akadigital.net |

Update `team.json` / `settings.json` and the Contact page to reflect this corrected office list — it currently may only reflect Vietnam + Singapore.

---

## 8. Workflow Conventions

- **Ask before running processes** (see Rule 6 above) — this is the standing convention until something more formal is set.
- **Commit/branch conventions:** not yet established. *(Open: confirm with Jeffrey whether to adopt a lightweight default — e.g. Conventional Commits for messages, `feature/*` / `fix/*` branch naming — or whether this is solo work where conventions matter less. No `CONTRIBUTING.md` or `.github/` workflow currently exists in the repo to infer this from.)*
- Before marking any task complete: verify no broken asset links against `ASSET_MANIFEST.md`, then append a `CHANGELOG.md` entry.

---

## 9. Open Items Still To Confirm

- [ ] Are all three locales (`en`, `ko`, `vi`) live and routed, or is `ko`/`vi` scaffolded only?
- [ ] Decide whether the originally-scoped Media/Activities/Photo-Video pages are still wanted as standalone pages, or whether the current implementation (event assets folded into other pages) is the final direction
- [ ] Confirm commit message / branch naming convention (or confirm none is needed)
- [ ] Update Contact page and `team.json`/`settings.json` with the corrected 4-office list
- [ ] Decide on Material Symbols icons: keep loading from Google's CDN (current default in `base.njk`), or self-host the WOFF2 subset per `EXPORT_GUIDE.md` §4 — current CDN dependency contradicts the "no runtime CDN dependencies" goal stated for the CSS export
- [ ] Many asset slots in `ASSET_MANIFEST.md` are still ⬜ (client logos, hero images, team photos, FE Credit case study video) — flag to Jeffrey rather than placeholder-filling
