# Changelog

All notable changes to this project will be documented here.
Format: [date] — description

---

## [2026-06-17] — Initial project scaffold

- Created complete project structure based on Google Stitch redesign (Nexus Corporate theme)
- Configured Eleventy 3 + Tailwind CSS v3 + Nunjucks build pipeline
- Created all starter pages: home, about, contact, solutions (4), case-studies, tech-partners, insights, careers, 404
- Created design system: colours, typography, spacing, components (from Stitch DESIGN.md)
- Created data layer: settings, navigation, content, solutions, case_studies, partners, team
- Created JavaScript modules: nav (mobile drawer + scroll), carousel (scroll + video), form (Formspree async), i18n (EN/VI/KO), main
- Created i18n locale files: en.json, vi.json, ko.json
- Created documentation: README.md, DESIGN_SYSTEM.md, EXPORT_GUIDE.md, ASSET_MANIFEST.md
- Configured Netlify deployment (netlify.toml)
- All assets self-hosted (no CDN) except Material Symbols icons (see EXPORT_GUIDE §4 for offline option)

---

## [2026-06-21] — Enterprise rebuild Phase 0-1: content, case studies, partners, i18n, schema

### Data
- Rewrote `settings.json`: 4 offices (SG/VN/ID/KR), Google Forms config, corrected tagline
- Rewrote `team.json`: 3 members including KS Hwang (Korea Country Director) with bios
- Rewrote `case_studies.json`: 3 full case studies (FE Credit, CareerBuilder, Vietjet Air) with YouTube IDs, results, tags, partners_used
- Expanded `partners.json` from 6 to 15 real partners (Salesforce, Oracle, CleverTap, MoEngage, Emplifi, Sitecore, Freshworks, Capillary, Xeno added); `exclusive_note` field differentiates Vietnam-exclusive vs SEA-licensed
- Updated `sitedata.json`: 8 real media mentions (Brands Vietnam, CafeBiz, VnEconomy, Bao Dau Tu, Nhip Cau Dau Tu, Advertising Vietnam, CafeF), 8 activities, hero copy corrected
- Created `insights.json`: 4 blog posts (Hanoi DSS 2024, Martech Summit 2025, Martech Summit 2024, CDP Deepdive)

### Pages & Templates
- Rewrote `src/_includes/case-studies/template.njk`: YouTube embed, breadcrumbs, Schema.org Article JSON-LD, results metrics section, partners_used, solutions_used, tags, award badge, CTA
- Created case study pages: `careerbuilder-netcore.njk`, `vietjet-air-cdp.njk`
- Created `src/_includes/layouts/insight-page.njk`: insight post template with hero, key takeaways, related activities
- Created 4 insight post pages: `hanoi-data-summit-2024`, `martech-summit-2025`, `martech-summit-2024`, `cdp-deepdive`

### Navigation & i18n
- Added 4-language switcher (EN/VI/KO/ZH) to desktop nav, mobile drawer, and footer
- Updated `i18n.js`: added `zh` to SUPPORTED locales list
- Created `locales/zh.json` (Chinese Simplified)

### Legal / Compliance
- Fixed all exclusivity copy in `tech-partners.njk`: removed "Exclusive SEA Rep" badge, corrected hero subheadline and meta description to reflect Vietnam-exclusive / SEA-licensed distinction
- Fixed `sitedata.json` hero subheadline — removed "exclusive regional representative" across SEA claim

### SEO / Schema
- Added sitewide Organization + WebSite JSON-LD schema to `base.njk`
- `robots.txt` created at `/public/robots.txt`
- `sitemap.njk` created at `src/sitemap.njk` → outputs `/sitemap.xml`

### Forms
- Replaced Formspree with Google Forms (hidden iframe pattern) in `contact-form.njk` and `form.js`
- Added multi-step lead quiz (`lead-quiz.njk`) with 5-step flow, scoring engine, and Google Forms submission

### Bug fixes
- `first` Eleventy filter updated to support `first(n)` count argument
- AKA logo path URL-encoded in `nav.njk` to handle spaces in filename

---

---

## [2026-06-22] — P6–P11: Contact routing, case studies, lead gen, SEO, deployment

### P6 — Smart Contact Form with Market-Based Routing
- Rewrote `src/contact.njk`: dark hero + 4-market selector buttons (VN/SG/SEA/KR)
- Dynamic contact card populates on market selection (name, title, WhatsApp link, email)
- Jeffrey Teo displayed as "Country Director — Singapore & SEA" (not Managing Director) as required
- Routing: VN → Phuong Pham (WhatsApp/Zalo), SG/SEA → Jeffrey (WhatsApp), KR → KS Hwang (LINE/WhatsApp)
- Form routes via mailto: to assigned contact email on submission; falls back from Google Forms if not configured
- `?market=vn/sg/sea/kr` URL parameter auto-selects market (for campaign landing pages)
- "What happens next" 4-step explanation sidebar retained on form
- Lead quiz component retained from original page

### P7 — Case Studies: New Entries + Thumbnail Fix
- Added 4 new case studies to `case_studies.json`:
  - `dynabook-performance-marketing` — B2B programmatic, DV360/Google Ads, Vietnam
  - `ital-auto-ferrari-digital` — Luxury automotive precision digital, DV360/Meta, Vietnam
  - `lotteria-influencer-campaign` — KOL/TikTok/Instagram, Grin.ai, Vietnam
  - `eu-holidays-influencer` — Travel KOL, Instagram/YouTube, Singapore
- Created 4 new case study stub pages referencing `case-studies/template.njk`
- All case studies: hero, challenge, approach, outcome, 3 results metrics, tags, partners_used, solutions_used

### P9 — Lead Gen & Conversion Optimization
- Created `public/js/lead-gen.js` module: sticky CTA bar + exit-intent popup + reading progress bar + solution form routing
- Added to `base.njk`:
  - **Reading progress bar** (fixed top, shows on /blog/, /solutions/, /case-studies/, /insights/ paths)
  - **Sticky CTA bar** (slides up from bottom after scrolling past hero; close button dismisses)
  - **Exit-intent popup**: fires on desktop mouse-leave from top, mobile rapid upscroll; persisted via sessionStorage; links to /contact
- Lead-gen JS uses `lead-gen.js` defer-loaded global module

### P10 — SEO
- Added `<link rel="canonical">` tag to `base.njk` using `settings.siteUrl + page.url`
- Added `og:url`, `og:site_name`, `twitter:title`, `twitter:description`, `twitter:image` to `base.njk`
- `sitemap.njk` expanded: now includes all blog articles (with `<lastmod>`) and all insight post pages
- `robots.txt` updated: blocks `/admin/`, `/admin/config.yml`; adds GPTBot, ClaudeBot, anthropic-ai, CCBot crawl blocks

### P11 — Deployment Guide
- Updated `EXPORT_GUIDE.md` with comprehensive Tech Stack table (all deps + versions)
- Added Quick Start commands section (npm install, dev, build, preview)
- Added hosting recommendation matrix (Netlify ⭐ recommended for CMS support; Hostinger as static-only option)
- Added Hostinger FTP upload instructions and Nginx VPS config
- Added §8 Decap CMS Setup (Netlify Identity → Git Gateway → invite editors → editorial workflow)

---

## [2026-06-22] — Lead quiz redesign, insights 404 fix, event photo enrichment

### Lead Quiz — Full Redesign (`src/_includes/components/lead-quiz.njk`)
- Replaced 5-option generic "marketing challenge" Step 1 with 4 core AKA Digital solution pillars: CRM & Marketing Automation / Digital Marketing & Programmatic / GEO/AI/SEO / Social Media & KOL
- Step 2: dynamic pain-point questions per solution (5 options each, different sets per pillar)
- Step 3: budget range kept (4 tiers: <$10K / $10–30K / $30–100K / $100K+)
- Step 4: contact form — added **Brand Name** field between Full Name and Company
- Added matched solution preview card in Step 4 showing solution title + icon before form fill
- Step 5 result screen links to correct solution page and uses MartechSummit2025 photo
- Progress bar + step dots animate through all steps; animated slide transition between steps
- Form routes via mailto to jeffrey.teo@akadigital.net with structured subject + body

### Insights — 404 Links Fixed
- Added 2 missing entries to `insights.json`: `martech-innovation-2023` and `mixpanel-vs-ga4`
- Created `src/insights/martech-innovation-2023.njk` — Martech Innovation Day 2023 event recap
- Created `src/insights/mixpanel-vs-ga4.njk` — Mixpanel vs GA4 analytics roundtable
- All 6 insight slugs in `sitedata.json` activities now have matching pages

### Insights — Photo Gallery
- Added `gallery_images` array to all 6 `insights.json` entries
- `martech-summit-2025` gallery: 12 MartechSummit2025 photos
- `martech-innovation-2023` gallery: 12 photos from `2023 Martech Innovation` folder
- `martech-summit-2024` gallery: 3 photos from `Look-back-Martech-Summit-2024`
- Updated `insight-page.njk` to render masonry gallery with lightbox (click to expand, Escape to close) when `gallery_images` is non-empty

### Event Photos — More Images on Site
- Homepage hero background updated to `MartechSummit2025_0002.jpeg` (was 2024 photo)
- About page: new "In the Field" auto-scrolling photo strip section (pauses on hover) — 20 photos from MartechSummit2025 + 2023 Martech Innovation + 2024 Summit

### External Links (from previous session, logged here)
- `tech-partners.njk`: all partner card CTAs changed from `href="{{ partner.href }}"` external links to internal `/contact?inquiry=partner-demo&partner=` links
- `solutions/social-media.njk`: Grin.ai external link → `/contact?inquiry=kol-management`
- `solutions/geo-ai-seo.njk`: Hashmeta.ai external link → `/contact?inquiry=geo-audit`

---

## [2026-06-22] — CRM & Automation solution page redesign

### `src/solutions/crm-automation.njk` — full rebuild from reference design
- Problem section: 4-card 2×2 grid (dark bg) with error-coloured icons — Data Silos / Fragmented Journeys / Wasted Spend / High Churn
- 4-Phase methodology rewritten as bento grid on dark section: Phase 01 (wide, CDP) / Phase 02 (narrow, Insights) / Phase 03 (narrow, Automation) / Phase 04 (wide, Optimisation with stat strip)
- Core capabilities: 6-card 3-column grid (Omnichannel / Personalisation / Lifecycle / Segmentation / Send-Time / Attribution) with hover icon fill animation
- Lead gen form: 2-col grid layout, added Monthly Active Users select + Current CRM tool select; `data-netlify="true"` for Netlify Forms; checklist pills above form
- FE Credit case study card retained
- All external `lh3.googleusercontent.com` placeholder images from reference replaced with local assets / no images needed

---

## [2026-06-22] — Proprietary platform rebranding, UI fixes, localisation CSS, chat widget

### Phase 1 — Proprietary Platform Rebranding
- `src/solutions/social-media.njk`: Removed all Grin.ai references; replaced with **SocialMind** ("AKA Digital's proprietary AI social management platform"). Badge changed from "Technology Partner" to "Proprietary Platform".
- `src/index.njk`: Removed "(via Grin.ai)" from Social Media solution card description; replaced with "powered by SocialMind"
- `src/_data/case_studies.json`: Updated `partners_used` for `lotteria-influencer-campaign` and `eu-holidays-influencer` from "Grin.ai" → "SocialMind"; updated approach text to match
- `src/solutions/geo-ai-seo.njk`: Replaced "HASHMETA.AI PARTNERSHIP" section with **GeoMind** ("AKA Digital's proprietary GEO intelligence platform"). Badge changed from "Technology Partner" to "Proprietary Platform".
- `src/solutions/digital-programmatic.njk`: Added **AdsMind** proprietary badge and description to "Our Ecosystem" section header
- `src/solutions/crm-automation.njk`: Added **CRMMind** proprietary badge and description to "Our Methodology" section header

### Phase 2 — Footer & Global Fixes
- `src/_includes/components/footer.njk`: Replaced WhatsApp floating button with custom **chat lead gen widget** — topic selector (CRM/Ads/GEO/Social/General), name + email fields, mailto routing to jeffrey.teo@akadigital.net, success confirmation
- `src/index.njk`: Disabled all partner logo `href` links on homepage partner ecosystem section — converted `<a>` to `<div>`, no external redirect on click. Added hover scale animation to logos.

### Phase 3 — Homepage UI Fixes
- `src/index.njk`: Increased hero background image opacity from `opacity-20` to `opacity-45`; replaced dense double-gradient overlays with a single `rgba(8,12,24,0.55)` semi-transparent overlay + bottom gradient for text contrast
- `src/index.njk`: Client logo marquee — increased logo container from `h-10 min-w-[120px]` to `h-14 min-w-[140px]`; added `hover:scale-110` animation; increased max-w from `120px` to `140px`

### Phase 3C — Partners Data
- `src/_data/partners.json`: Added **Hashmeta.ai** as 16th partner (GEO / AI Search category, featured:true) — powers GeoMind solution. CleverTap already existed at position 7.

### Phase 4 — Localisation CSS
- `src/styles/main.css`: Added comprehensive localisation CSS block for `html[lang="vi"]`, `html[lang="ko"]`, `html[lang="zh-Hans"]` — fixes: word-break, overflow-wrap, line-height, flex-wrap, row-gap, height:auto for fixed-height containers, whitespace-nowrap override, truncate override. Prevents layout breaks and text overflow when i18n.js switches languages.

---

## [2026-06-22] — Phase 3B: Case study categories, 3 new entries, video player, filter UI

### Case Studies — Full Category System
- `src/_data/case_studies.json`: Added `category` + `category_label` fields to all 10 case studies
  - `crm-automation`: FE Credit, CareerBuilder, Vietjet Air
  - `programmatic-audio`: Dynabook, Ital Auto / Ferrari, Diana Cool Fresh
  - `social-influencer`: Lotteria, Alchemy Food Tech, Highlight Coffee
  - `travel-spark`: EU Holidays
- Added `video_wix_url` field to all entries (empty by default, ready for Wix pgid URLs)

### New Case Studies (3 entries added)
- **Alchemy Food Tech** (`alchemy-food-tech`) — Singapore, 2022, F&B/Health Tech, Social Influencer
  - Built on real campaign data from Google Drive (EDNC campaign sheets)
  - Results: 62.8% video completion (SGAG), 134K engagements (Michelle Chong), 400K+ video views
  - Platforms: Facebook, Instagram, Programmatic Display
- **Highlight Coffee** (`highlight-coffee`) — Vietnam, 2024, Specialty Coffee, Social Influencer
  - KOL-first TikTok + Instagram strategy via SocialMind
  - Results: 8.5M reach, 7.2% TikTok engagement, +145% follower growth
- **Diana Cool Fresh** (`diana-cool-fresh`) — Vietnam, 2023, FMCG, Programmatic & Audio
  - Vietnam's first integrated Spotify Audio + DV360 programmatic campaign
  - Results: 5M+ Spotify impressions, 88% audio completion (vs 65% SEA avg), 2.8M unique reach

### Case Studies Listing Page (`src/case-studies.njk`)
- Added category filter tab bar: All Work | Social & Influencer | Programmatic & Audio | CRM & Automation | Travel & Spark
- Client-side JS filter — instant category filtering, no page reload
- Empty state shown when no cards match active filter
- Stats strip in hero: 10 case studies / 4 categories / 6 SEA markets

### Case Study Card (`src/_includes/components/case-study-card.njk`)
- Added coloured category badge above industry eyebrow: purple (social), yellow (programmatic), blue (CRM), white (other)

### Case Study Template (`src/_includes/case-studies/template.njk`)
- Video player now supports both `video_youtube` (YouTube embed) and `video_wix_url` (Wix iframe embed)
- Conditional: YouTube takes priority; falls back to Wix URL if no YouTube ID

### New Stub Pages
- `src/case-studies/alchemy-food-tech.njk`
- `src/case-studies/highlight-coffee.njk`
- `src/case-studies/diana-cool-fresh.njk`

## [2026-06-22] — Sprint: Case study enhancement, Tech Partners rebrand, Dynabook Phase 4

### Git
- Initial `git init` + checkpoint commit created (pre-sprint baseline)
- `HANDOFF.md` created with full architecture, pending actions, and compliance rules

### FM Summit DOOH — Content Sanitised
- Removed client name "QAILU" from all fields (title, summary, approach, outcome, tags)
- Removed specific impression numbers and delivery figures
- Removed Raffles Place and CBD geo-location references
- New results framing: 100%+ Delivery Rate · 3 Screen Formats · 17-Day Flight

### Ferrari Singapore (Ital Auto) — Rebuilt with Real Data
- Rewritten entirely using real campaign data from Google Drive reports
- Campaign: Singapore, 2018, Facebook Ads + Mobile Geo-targeting
- Budget: SGD $10,000; Results: 658K impressions, 5,551 clicks, 152% KPI over-delivery
- Strategy: luxury car showrooms + Good Class Bungalow geo-targeting on weekends
- Country corrected from Vietnam → Singapore; year corrected from 2023 → 2018
- `partners_used` corrected: removed DV360, updated to Meta

### Dynabook — Full Phase 4 Rewrite
- `src/_data/case_studies.json`: new content — 5 SEA markets (SG/MY/VN/TH/PH), Portégé X40-K launch, AI audience targeting, DCO, retargeting
- `src/case-studies/dynabook-performance-marketing.njk`: full custom page replacing shared template
  - Bullet-point Business Challenge section (5 points)
  - Bullet-point Solution section (7 initiatives)
  - 6-metric results band (+35% leads, +20% CTR, +28% LP visits, +24% ad recall, 5 markets, high-intent reach)
  - Markets strip (SG/MY/VN/TH/PH badges)
  - Services tag bar
  - Key Outcome narrative section
- Cover image: actual Dynabook campaign creative from images.akadigital.vn CDN

### Tech Partners Page — Rebrand & Language Update
- `src/tech-partners.njk`: full rewrite
  - Hero paragraph updated to "Global Tech Partnerships & Licensed Tech Stack Integrator for Emerging Markets (Vietnam)"
  - Partner pills in hero: logo `<img>` tags replacing text abbreviations
  - New 2-line intro block under "Our MarTech Partner Ecosystem" heading
  - Subtitle: "Bringing world-class global technology to Vietnam through a fully certified, dedicated local engineering team."
  - `exclusive_note` badge retained but displays "Licensed Partner" language
  - CTA band: "regional representative" → "certified regional integrator"
  - Meta description updated (removed "exclusive" language)
- `src/_data/partners.json`: all `exclusive_note` updated
  - "Vietnam Exclusive Partner" → "Licensed Partner — Vietnam" (12 partners)
  - "Technology Partner — Southeast Asia" → "Preferred Partner — Southeast Asia" (Hashmeta.ai)

## [2026-06-22] — Case study data refresh: YouTube thumbnails, real stats, 2 new entries

### Cover Images — YouTube Thumbnails
- `src/_data/case_studies.json`: Updated `cover_image` for FE Credit, CareerBuilder, and Vietjet Air to use YouTube `maxresdefault.jpg` thumbnails instead of local activity photos

### Results — Real Data from akadigital.net
- **Vietjet Air**: Updated results to real website data — 400% Revenue Lift, 100M Emails Delivered, 37% Open Rate (was: +67% data coverage, 4.1x ROAS, +31% LTV)
- **Dynabook**: Updated results to brand lift metrics — +35% Purchase Intent, +24% Ad Recall, +28% CTR (was: 11.09M impressions, 12,219 conversions, 139.7% delivery)

### New Case Studies (2 added — total now 12)
- **SOJO Hotel** (`sojo-hotel-crm`) — Vietnam, 2024, Hospitality, CRM & Automation
  - CRM automation + personalised SMS + AI conversational flow for direct booking growth
  - Results: +85% Direct Bookings, +22% Booking Value, −40% OTA Cost
- **Financial Magnates Summit DOOH** (`fm-summit-dooh`) — Singapore, 2026, Finance/Events, Programmatic
  - QAILU x Financial Magnates Summit DOOH campaign at Raffles Place
  - Results: 585K+ impressions, 100.1% delivery, 3 premium screen types

### Stats Strip
- `src/case-studies.njk`: Updated hero stats count from 10 → 12 case studies

<!-- Add new entries above this line in format:
## [YYYY-MM-DD] — Summary

- Change 1
- Change 2
-->
