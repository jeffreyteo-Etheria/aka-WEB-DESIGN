# AKA Digital — Export Guide & Deployment Guide

How to export every asset type and deploy the finished site to any hosting provider.

---

## Tech Stack

| Layer          | Technology              | Version |
|----------------|-------------------------|---------|
| Static Site Generator | Eleventy (11ty)  | ^3.0.0  |
| CSS Framework  | Tailwind CSS             | ^3.4.10 |
| CSS Processor  | PostCSS + autoprefixer   | ^8.4.40 |
| Templating     | Nunjucks (.njk)          | Built into 11ty |
| CMS            | Decap CMS (Git-based)   | ^3.0.0 (CDN) |
| Auth (CMS)     | Netlify Identity         | Requires Netlify hosting |
| Icons          | Material Symbols         | Google CDN |
| Build runner   | concurrently             | ^9.0.0  |

**Node.js requirement: 18.x or 20.x (LTS)**  
Run `node -v` to check. If below 18, install from [nodejs.org](https://nodejs.org).

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (CSS watch + Eleventy hot-reload)
npm run dev
# → Site available at http://localhost:3000
# → CSS recompiles automatically on save

# 3. Build for production
npm run build
# → Output in dist/ (complete deployable site)
```

**All build commands:**
```
npm run dev         — Local development server with hot-reload
npm run build       — Production build (CSS minify + 11ty compile)
npm run css:build   — Compile CSS only (no 11ty)
npm run css:watch   — Watch CSS only
npm run export:all  — Full export package (CSS + JSON + assets + build)
```

**Preview production build locally:**
```bash
npm run build
npx serve dist
# → http://localhost:3000 (static preview of production build)
```

---

## Hosting Recommendation

| Option       | Best for                          | CMS (Decap) works? | Cost    |
|-------------|-----------------------------------|--------------------|---------|
| **Netlify** (⭐ Recommended) | Auto-deploy from Git, CMS works out of box | ✅ Yes — Netlify Identity built in | Free tier |
| Vercel      | Fast CDN, easy Git integration     | ⚠️ Needs external OAuth | Free tier |
| Hostinger   | Budget shared hosting, VPS        | ❌ CMS needs workaround | ~$3/mo |
| AWS S3/CF   | Enterprise scale, maximum control | ⚠️ Needs OAuth server | $1-5/mo |

**Recommendation: Deploy to Netlify.** The Decap CMS (P1 requirement) requires Netlify Identity for the Git gateway auth. Without Netlify, you'd need to run a separate OAuth server. Netlify's free tier supports unlimited bandwidth for static sites.

If Hostinger is required, use it only as a static file host (FTP upload) and accept that the CMS admin panel won't work without additional OAuth setup.

---

## §1 — Export Compiled CSS

The Tailwind CSS source is at `src/styles/main.css`. It must be compiled before export.

```bash
# Compile and minify
npm run css:build

# Export compiled file to exports/css/
npm run export:css
```

Output: `exports/css/main.css`  
This is a single standalone CSS file with all Tailwind utilities, custom components, and font-face declarations. It has **no runtime CDN dependencies**.

---

## §2 — Export JSON Content Data

All site content lives in `src/_data/`. Export copies all JSON files.

```bash
npm run export:json
```

Output: `exports/json/` containing:
```
content.json      ← Homepage copy, hero, stats, activities
navigation.json   ← All nav links
settings.json     ← Site settings, social links, Formspree ID
solutions.json    ← Four service solutions
case_studies.json ← Case study entries
partners.json     ← Tech partner details
team.json         ← Team contact persons
```

To update any text on the site, edit these files and rebuild.

---

## §3 — Export Images, Videos & Fonts

All static assets live in `public/`. Run:

```bash
npm run export:assets
```

This copies:
- `public/images/` → `exports/assets/images/`
- `public/videos/` → `exports/assets/videos/`
- `public/fonts/`  → `exports/assets/fonts/`

### Asset Checklist Before Export
See `ASSET_MANIFEST.md` for the complete list of image slots that need real files.

### Video Files
Place video files in `public/videos/`. Referenced in `case_studies.json` as:
```json
"video": "/videos/your-video-filename.mp4"
```
Supported formats: `.mp4` (H.264), `.webm`

### Image Formats
- Logos: `.svg` preferred (sharp at all sizes)
- Photos: `.jpg` or `.webp` (compress before adding)
- Recommended tool: [Squoosh](https://squoosh.app/) for batch compression

---

## §4 — Material Symbols Icons (Optional Self-Hosting)

Currently loaded from Google's CDN in `src/_includes/layouts/base.njk`. To remove this dependency:

1. Go to [fonts.google.com/icons](https://fonts.google.com/icons)
2. Download the icons used (see list below) as a subset WOFF2
3. Place in `public/fonts/MaterialSymbols.woff2`
4. In `src/_includes/layouts/base.njk`, remove the CDN `<link>` and add:

```css
@font-face {
  font-family: 'Material Symbols Outlined';
  src: url('/fonts/MaterialSymbols.woff2') format('woff2');
  font-style: normal;
  font-display: block;
}
```

**Icons used in this project:**
`home`, `bolt`, `handshake`, `analytics`, `article`, `work`, `mail`, `menu`, `close`, `expand_more`, `arrow_forward`, `arrow_back`, `check`, `check_small`, `north_east`, `open_in_new`, `play_arrow`, `progress_activity`, `person`, `language`, `public`, `trending_up`, `hub`, `share`, `ads_click`, `autorenew`, `travel_explore`, `add_circle`, `add`, `edit_note`, `keyboard_arrow_down`

---

## §5 — Generate a Production Build

A production build compiles everything and outputs to `dist/`:

```bash
npm run build
```

What this does:
1. Compiles Tailwind CSS → minified `public/css/main.css`
2. Runs Eleventy — compiles all `.njk` templates to `.html`
3. Copies `public/` (assets, fonts, images, JS) → `dist/`
4. Outputs clean, static HTML at `dist/`

The `dist/` folder is the **complete, deployable website**. It contains only HTML, CSS, JS, and assets — no server runtime needed.

To also copy the build to `exports/build/`:
```bash
npm run export:build
```

---

## §6 — Deploy to Generic Hosting

### Option A: Netlify (Recommended — includes CMS)

**Automatic deploy (via Git):**
1. Push the project to a GitHub / GitLab repo
2. Log in to [netlify.com](https://netlify.com) → New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Every `git push` triggers an automatic rebuild

**Manual deploy (drag and drop):**
1. Run `npm run build` locally
2. Go to app.netlify.com → Sites → drag the `dist/` folder onto the page
3. Done — live instantly

### Option B: Vercel

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com/new)
3. Framework preset: **Other**
4. Build command: `npm run build`
5. Output directory: `dist`

### Option C: cPanel / Shared Hosting (FTP)

1. Run `npm run build` locally
2. Open your FTP client (FileZilla, Cyberduck, etc.)
3. Connect to your host's FTP server
4. Upload the **entire contents** of `dist/` to `public_html/`
   - Do not upload the `dist/` folder itself — upload what's inside it

### Option C-ii: Hostinger (Static Files via FTP)

> Note: Decap CMS will NOT work on Hostinger without additional OAuth setup. Use Netlify if CMS is required.

1. Run `npm run build` locally
2. Log in to Hostinger hPanel → File Manager → `public_html/`
3. Upload the **contents** of `dist/` into `public_html/` (not the folder itself)
4. Upload `public/admin/` folder to `public_html/admin/` if CMS is needed later
5. Set up domain in hPanel → Domains

**Hostinger VPS option (recommended over shared):**
```bash
# On VPS via SSH:
node -v                    # verify Node 18+
npm install
npm run build
# Then use nginx to serve the dist/ folder
```

Nginx config for Hostinger VPS:
```nginx
server {
    listen 80;
    server_name akadigital.net www.akadigital.net;
    root /var/www/akadigital/dist;
    index index.html;
    location / {
        try_files $uri $uri/ $uri.html =404;
    }
    error_page 404 /404.html;
}
```

### Option D: AWS S3 / CloudFront

1. Run `npm run build`
2. Create an S3 bucket with static website hosting enabled
3. Upload `dist/` contents: `aws s3 sync dist/ s3://your-bucket-name --delete`
4. Set index document: `index.html`
5. Set error document: `404/index.html`

---

## §7 — Export Everything (Full Package)

```bash
npm run export:all
```

This runs all export commands in sequence and populates:
```
exports/
├── css/          ← Compiled CSS
├── json/         ← All content data
├── assets/       ← Images, videos, fonts
└── build/        ← Complete static build
```

You can zip this folder and hand it to a developer, client, or hosting provider.

---

## §8 — Decap CMS Setup (After Deploying to Netlify)

The CMS admin panel is at `/admin/`. It requires Netlify Identity + Git Gateway to function.

### Steps:
1. Deploy to Netlify (§6 Option A)
2. In Netlify dashboard → **Identity** → Enable Identity
3. Under Identity → **Registration** → set to "Invite only" (security)
4. Under Identity → **Services** → Enable **Git Gateway**
5. Invite your content editors via Identity → Invite users → enter email
6. Editors receive email → set password → log in at `yourdomain.com/admin/`

### CMS collections available:
- **Blog posts** — `src/_data/blogs.json` entries
- **Case studies** — `src/_data/case_studies.json` entries
- **Team** — `src/_data/team.json`
- **Partners** — `src/_data/partners.json`
- **Site hero** — `src/_data/sitedata.json` (hero section)

### Content workflow:
Draft → Review → Publish (editorial workflow enabled)
Published changes trigger automatic Netlify rebuild (5-10 minutes for live site).

---

## §9 — Wix Asset Migration

Since some existing assets are still on the live Wix site at akadigital.net:

1. **Download images from Wix:**
   - Log in to Wix dashboard → Media Manager
   - Download all images you want to keep
   - Sort into the correct `public/images/` subfolders (see `ASSET_MANIFEST.md`)

2. **Download videos from Wix:**
   - Wix video files can be found in Media Manager → Video
   - Download .mp4 files → place in `public/videos/`

3. **Update data references:**
   - After adding real files, update image paths in `src/_data/content.json`, `case_studies.json`, etc.
   - Image paths always start with `/images/...` (relative to `public/`)

4. **Rebuild:**
   ```bash
   npm run build
   ```
