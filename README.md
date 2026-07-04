# AKA Digital — Website

Static marketing website for [akadigital.net](https://akadigital.net).

## Enterprise Hardening Baseline

This repository now includes:
- Runtime CMS hardening with request validation, rate limiting, audit logging, and secure session handling.
- Security documentation under docs/.
- GitHub workflow scaffolding for CI, CodeQL, dependency review, release automation, and Dependabot.
- Backup and deployment notes for Hostinger and Cloudflare.

## Next Steps
1. Set environment variables for admin and team credentials.
2. Configure Cloudflare SSL, WAF, and bot protections in staging first.
3. Apply Hostinger HTTPS and header settings.
4. Review logs in monitoring/.

## GitHub to Hostinger FTP Deployment

A GitHub Actions workflow is included at [.github/workflows/deploy-hostinger.yml](.github/workflows/deploy-hostinger.yml). To enable it:

1. In GitHub, open your repository Settings > Secrets and variables > Actions.
2. Add these repository secrets:
   - `FTP_HOST`
   - `FTP_USERNAME`
   - `FTP_PASSWORD`
   - `FTP_PORT` (optional, default `21`)
   - `FTP_REMOTE_ROOT` (optional, default `/public_html/`)
3. Push to `main` or `master` to trigger the deployment.
4. Use the workflow_dispatch option to run it manually.


**Stack:** Eleventy (11ty) · Tailwind CSS v3 · Nunjucks · Vanilla JS · Formspree

---

## Quick Start

### Requirements
- Node.js 18 or later
- npm 9 or later

### 1. Install dependencies
```bash
npm install
```

### 2. Self-host fonts (one-time setup)
Download the variable font files and place them in `public/fonts/`:

| File | Source |
|---|---|
| `HankenGrotesk-VariableFont_wght.woff2` | [Google Fonts — Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) |
| `Inter-VariableFont_opsz,wght.woff2`   | [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) |

> Until fonts are placed, the site falls back to `system-ui`. Layout will still work.

### 3. Configure Formspree (one-time setup)
1. Create a free account at [formspree.io](https://formspree.io)
2. Create a new form and copy the form ID (e.g. `xpwzabcd`)
3. Open `src/_data/settings.json` and replace `YOUR_FORMSPREE_FORM_ID` with your ID

### 4. Start development server
```bash
npm run dev
```
Opens at `http://localhost:3000` with live reload.

---

## Project Structure

```
akadigital-web/
│
├── src/                        ← All source files (input for Eleventy)
│   ├── _includes/
│   │   ├── layouts/            ← Page shell templates
│   │   └── components/         ← Reusable partials (nav, footer, cards, form)
│   ├── _data/                  ← Global JSON data (content, nav, solutions, etc.)
│   ├── styles/                 ← CSS source (Tailwind directives)
│   ├── solutions/              ← Solution detail pages
│   ├── case-studies/           ← Case study pages
│   └── *.njk                   ← Top-level pages (index, about, contact, etc.)
│
├── public/                     ← Static assets (copied as-is to dist/)
│   ├── fonts/                  ← Self-hosted .woff2 files (add manually)
│   ├── images/                 ← All image assets
│   │   ├── logos/              ← AKA Digital brand assets
│   │   ├── clients/            ← Client logos
│   │   ├── partners/           ← Tech partner logos
│   │   ├── activities/         ← Event / workshop photos
│   │   ├── hero/               ← Hero section backgrounds
│   │   └── team/               ← Team member photos
│   ├── videos/                 ← Case study and promo videos
│   ├── case-studies/           ← Per-client case study assets
│   └── js/                     ← JavaScript files
│
├── locales/                    ← i18n JSON (en, vi, ko)
├── exports/                    ← Packaged export outputs
├── docs/                       ← Design references
│
├── .eleventy.js                ← Eleventy configuration
├── tailwind.config.js          ← Tailwind design tokens
├── postcss.config.js
├── package.json
├── netlify.toml                ← Netlify deployment config
├── README.md
├── DESIGN_SYSTEM.md
├── EXPORT_GUIDE.md
├── CHANGELOG.md
└── ASSET_MANIFEST.md
```

---

## npm Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts Eleventy + Tailwind in watch mode at localhost:3000 |
| `npm run build` | Full production build → `dist/` |
| `npm run css:build` | Compile + minify Tailwind CSS only |
| `npm run export:css` | Copy compiled CSS to `exports/css/` |
| `npm run export:json` | Copy all data JSONs to `exports/json/` |
| `npm run export:assets` | Package images, videos, fonts to `exports/assets/` |
| `npm run export:build` | Build + copy full dist to `exports/build/` |
| `npm run export:all` | Run all exports |

---

## Content Editing

All text content lives in JSON files — no HTML editing needed for copy changes.

| File | Controls |
|---|---|
| `src/_data/settings.json` | Site name, description, social links, Formspree ID |
| `src/_data/content.json` | Homepage hero, value prop, stats, media mentions, activities, clients |
| `src/_data/navigation.json` | All nav links (desktop, mobile, footer) |
| `src/_data/solutions.json` | The four solution services |
| `src/_data/case_studies.json` | Case study entries |
| `src/_data/partners.json` | Tech partner details and logos |
| `src/_data/team.json` | Contact persons shown on homepage and contact page |

---

## Adding a New Case Study

1. Add an entry to `src/_data/case_studies.json` (copy the FE Credit entry as a template)
2. Place assets in `public/case-studies/[your-slug]/`
3. Create `src/case-studies/[your-slug].njk`:

```njk
---
layout: layouts/base.njk
title: Client Name — Campaign Title | AKA Digital
permalink: /case-studies/[your-slug]/index.html
studySlug: [your-slug]
---
{% include "case-studies/template.njk" %}
```

---

## Adding a New Solution Page

1. Add an entry to `src/_data/solutions.json`
2. Create `src/solutions/[slug].njk`:

```njk
---
layout: layouts/solution-page.njk
title: Solution Name | AKA Digital
eleventyComputed:
  sol: "{{ solutions | findBySlug('[slug]') }}"
---
```

---

## Deployment

### Hostinger (File Manager — ZIP upload)

> **Deploy file:** `exports/akadigital-hostinger-deploy-[date].zip`  
> This is a pre-built static site — no Node.js or build step required on the server.

**Steps:**
1. Log in to **Hostinger hPanel** → **Files → File Manager**
2. Navigate to `public_html/` (delete any existing `index.html` or placeholder files)
3. Click **Upload Files** → select `exports/akadigital-hostinger-deploy-[date].zip`
4. Once uploaded, right-click the ZIP → **Extract** → extract into `public_html/`
5. Verify `public_html/index.html` exists after extraction
6. Visit your domain — the site should be live immediately

**FTP alternative (FileZilla / WinSCP):**
1. In Hostinger hPanel → **Files → FTP Accounts** → get host/user/password
2. Open FileZilla, connect, navigate to `public_html/`
3. Upload the contents of `exports/build/` directly into `public_html/`

**To rebuild and re-deploy:**
```powershell
# In project root:
npm run build
# Then manually ZIP exports/build/ and re-upload to Hostinger
```

**Custom domain / SSL:**
- In Hostinger hPanel → **Domains** — point your domain to the hosting
- In **SSL** → enable **Free SSL (Let's Encrypt)** — do this after DNS propagates

---

### Netlify (CI/CD alternative)
1. Push this folder to a GitHub repository
2. Connect the repo in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Done — deploys automatically on every push

### Manual / cPanel / FTP
1. Run `npm run build` locally
2. Upload the entire contents of the `dist/` folder to your web host's `public_html/`

### Vercel
1. Push to GitHub
2. Import in Vercel
3. Framework preset: **Other** (not Next.js)
4. Build command: `npm run build`
5. Output directory: `dist`

See [EXPORT_GUIDE.md](EXPORT_GUIDE.md) for detailed export instructions.
