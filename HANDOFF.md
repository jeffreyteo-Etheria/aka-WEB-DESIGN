# AKA Digital Website — Handoff Document

## Project Overview

Eleventy (11ty) v3 static site | Tailwind CSS v3.4 | Nunjucks templates
Build: `npx @11ty/eleventy` → `dist/` (44 files)
CSS: `npm run css:build` → `public/css/main.css`
Dev server: `npm start`

---

## Architecture

```
src/
├── _data/           # JSON data files (case_studies, team, partners, solutions, sitedata)
├── _includes/
│   ├── layouts/     # base.njk, solution-page.njk, blog-post.njk, insight-page.njk
│   └── components/  # case-study-card, lead-quiz, nav, footer
├── solutions/       # 4 solution pages
├── case-studies/    # 13 individual case study pages
├── insights/        # Individual insight/event pages
├── styles/          # main.css (Tailwind source)
└── *.njk            # Top-level pages
public/
├── css/main.css     # Compiled Tailwind output
└── js/              # animations.js, nav.js, form.js, lead-gen.js, i18n.js
```

---

## Data Files — Key Fields

### `src/_data/case_studies.json`
13 entries ordered: CRM (4) → Programmatic (4) → Social (4) → Travel (1)
Key fields: `slug`, `category`, `featured_home` (bool), `client`, `title`, `results[]`, `video_thumbnail`

### `src/_data/team.json`
3 members: Jeffrey Teo (SG/MY/ID), Ms. Phuong Pham Maisie (VN), Mr. KS Hwang (KR)
Key fields: `name`, `title`, `role_label`, `markets[]`, `email`, `phone`, `country`, `photo`

### `src/_data/partners.json`
16 tech partners with color logo paths at `/images/partners/`

### `src/_data/solutions.json`
4 solutions; digital-programmatic has `industries[]` and `channels[]` for hero badge pills

### `src/_data/sitedata.json`
`activities[]` — 9 events for insights page; `value_proposition.stats[]` — homepage stats

---

## Legal / Compliance Rules — NEVER CHANGE

- AKA Digital is **exclusive partner in Vietnam ONLY**
- In rest of SEA: **licensed operator / preferred partner** — NEVER "exclusive"
- Jeffrey Teo: use full name only, no title suffix in inline copy
- Partner badges: "Licensed Partner — Vietnam" or "Preferred Partner — Southeast Asia"

---

## Team Contacts — Canonical Format

```
Jeffrey Teo
Country Director, Regional Markets (SG · MY · ID)
jeffrey.teo@akadigital.net | +65 8699 9719

Ms. Phuong Pham (Maisie)
Country Director, Vietnam
phuong.pham@akadigital.net | +84 90 3045 373

Mr. KS Hwang
Country Director, South Korea
kw.hwang@akadigital.net | +82 10 2335 3076
```

---

## Translation Rules

Translate ONLY human-written editorial content:
- Paragraphs, headings, descriptions, blog text, SEO content

Do NOT translate UI components:
- Icons (play ▶, check ✔, close ✕, arrows →)
- Button system actions (Submit, Next, Play, Pause)
- Component props, class names, aria-labels tied to icons
- Any text inside icon or functional UI controls
- Logo text ("AKA DIGITAL") — must always stay in English

### How icon protection works (implemented)
`protectElements()` in `public/js/i18n.js` runs on DOMContentLoaded before
Google Translate initialises. It adds `translate="no"` + class `notranslate`
to every `.material-symbols-outlined`, `.material-symbols-rounded`, and
`.material-icons` span. Google Translate skips elements with these markers.

Additional CSS in `src/styles/main.css`:
- GT `<font>` wrapper tags inside `.btn-*` get `display:contents` to prevent
  flex layout breakage
- Material icon spans locked to `font-size:inherit` to prevent GT resizing

To protect any new element from translation: add `data-notranslate` attribute.
The `protectElements()` function already handles `[data-notranslate]` selectors.

---

## Sprint History — Files Modified

| Sprint | File | Change Summary |
|--------|------|----------------|
| R1 | `src/index.njk` | Hero subheadline, logo marquee 3x, 4-column award work grid |
| R2 | `src/_data/case_studies.json` | Full reorder, featured_home, new Fami entry, Highland Coffee rename |
| R2 | `src/_data/partners.json` | Color logos, slug field, enriched descriptions |
| R2 | `src/_data/team.json` | Country Director titles, markets array, role_label |
| R2 | `src/_data/solutions.json` | Hero images, industries/channels arrays |
| R2 | `src/about.njk` | Hero bg, multi-flag team template, role_label |
| R2 | `src/careers.njk` | Apply Now modal → mailto:Hello@akadigital.net |
| R2 | `src/_includes/layouts/solution-page.njk` | Stronger hero, removed Platforms section, industries/channels pills |
| R2 | `src/tech-partners.njk` | Color logos on white, category in primary, no external links |
| R3 | `src/case-studies.njk` | Stats: 4 Pillar Solutions / 6 SEA Markets / 50+ Enterprise Brands |
| R3 | `src/index.njk` | "50+" data-suffix counter, Enterprise Clients / Global Tech Partners labels |
| R3 | `src/contact.njk` | role_label display, updated CONTACTS JS titles |
| R3 | `src/insights.njk` | Full restructure: Activities/Events + Media Coverage sections |
| R3 | `src/solutions/social-media.njk` | RedNote added, SocialMind dark section, KOL journey diagram, no Grin.ai |
| R3 | `src/solutions/crm-automation.njk` | CRM lifecycle: clean 5-column grid (reverted from broken zigzag) |
| R3 | `src/solutions/social-media.njk` | Removed Influencer Marketing Engagement Journey section |
| R3 | `public/js/i18n.js` | protectElements(): translate=no on all material-symbols spans |
| R3 | `src/_includes/components/nav.njk` | Logo fallback span: translate=no |
| R3 | `src/styles/main.css` | GT <font> wrapper fix in buttons; icon font-size lock |

---

## Git Checkpoints

| Commit | Description |
|--------|-------------|
| `cd2fd1b` | checkpoint: i18n icon protection, CRM journey grid restore, social media cleanup |
| `218e6a6` | Initial checkpoint |
| `d093686` | sprint: case study enhancement, tech partners rebrand, Dynabook Phase 4 |
| `3e93641` | checkpoint: pre-sprint state before homepage & case study enhancement sprint |

---

## Pending Tasks

- **Case study visuals**: Real photography for SOJO, Lotteria, Diana, EU Holidays, Alchemy, Fami, Highland Coffee → upload to `/images/case-studies/`
- **Partner detail pages**: Internal `/tech-partners/[slug]/` not yet built
- **Phase 3 (future)**: Video embeds / media assets for individual case study pages
