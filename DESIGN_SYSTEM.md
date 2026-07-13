# AKA Digital — Design System

**Theme:** Nexus Corporate  
**Brand Identity Source:** `ASSETS/AKADIGITAL ASSETS/AKA-Digital-Brand-Identity-2025.pptx` (updated 2025)  
**Aesthetic:** Dark Navy + Signal Yellow — Authoritative, data-driven, B2B MarTech

---

## Brand Identity

| Attribute | Value |
|---|---|
| Personality | Precise · Authoritative · Human |
| Audience | B2B decision-makers — CMOs, CTOs, Marketing Directors |
| Tone | Name the problem, cite the number, state the platform |
| Market | Southeast Asia — Vietnam exclusive, SEA licensed |

---

## Color Palette

All tokens defined in `tailwind.config.js` and `src/styles/tokens.css`.

### Brand 2025 Palette (source: AKA-Digital-Brand-Identity-2025.pptx)

| Token | Hex | Name | Usage |
|---|---|---|---|
| `action-yellow` | `#F5C400` | Signal Yellow | All CTAs, labels, data callouts, icon dots |
| `ink-deep` | `#060F24` | Ink Deep | Hero BG, darkest surfaces — never use #000000 |
| `navy-core` | `#0B1F4B` | Navy Core | Page/slide canvas, section backgrounds |
| `navy-mid` | `#132B5E` | Navy Mid | Cards, elevated surfaces |
| `slate` | `#8C9BB8` | Slate | Body text, captions on dark |
| `mist` | `#C4CCDC` | Mist | Dividers, metadata |
| `yellow-tint` | `#FEF3BF` | Yellow Tint | Decorative circle overlays on dark only |
| `brand-green` | `#00C896` | Brand Green | Success / positive states |

> **Rules:** Use Signal Yellow as the singular accent. Navy backgrounds are always navy — never pure black. Yellow is accent-only, never a background fill for large areas.

### Interactive / System Colors

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1B3A7A` | Links, hover states, eyebrow labels, focus rings |
| `primary-container` | `#132B5E` | Navy Mid — filled interactive containers |
| `inverse-surface` | `#060F24` | Ink Deep — dark section backgrounds |
| `outline` | `#8C9BB8` | Slate — borders, dividers |
| `outline-variant` | `#C4CCDC` | Mist — subtle dividers |

### Surface System

| Token | Hex | Usage |
|---|---|---|
| `background` | `#fbf8ff` | Light page background (default) |
| `surface-off-white` | `#F6F9F5` | Alternating section background |
| `surface-container-low` | `#f4f2fe` | Cards, hover states |
| `surface-container-high` | `#e9e7f2` | Dividers, selected states |

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `on-surface` | `#1a1b23` | Primary body text (light bg) |
| `on-surface-variant` | `#454654` | Secondary text (light bg) |
| `muted-gray` | `#8C9BB8` | Slate — disabled, placeholder |

---

## Typography

Brand source: Cambria (display) + Calibri (body) + JetBrains Mono (labels).  
Web equivalents loaded via Google Fonts CDN in `base.njk`. Inter self-hosted in `public/fonts/`.

### Font Families

| Role | Web Font | Brand Equivalent | Used for |
|---|---|---|---|
| Display | **Playfair Display** | Cambria Bold | All headings (h1–h6), `font-display` class |
| Body | **Inter** | Calibri | Body copy, UI text, `font-body` class |
| Mono | **JetBrains Mono** | Courier New | Data labels, platform names, `font-mono` class |

### Type Scale

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `headline-xl` | 64px | 800 | 72px | Hero headline (desktop) |
| `headline-lg` | 48px | 700 | 56px | Section headlines (desktop) |
| `headline-md` | 32px | 700 | 40px | Sub-section headlines |
| `headline-sm` | 24px | 600 | 32px | Card titles, small headlines |
| `headline-lg-mobile` | 36px | 700 | 44px | Hero headline (mobile) |
| `body-lg` | 18px | 400 | 28px | Featured body copy |
| `body-md` | 16px | 400 | 24px | Standard body copy |
| `label-md` | 14px | 600 | 20px | Eyebrow labels, button text, nav |

### Hierarchy Rules
- Use `label-md` + `text-primary` + uppercase + tracking-widest for **eyebrow** labels
- Headlines always use `font-display` (Playfair Display)
- Body always uses `font-body` (Inter)
- Use `font-mono` (JetBrains Mono) for platform/partner names and numeric data labels
- Tighten letter-spacing on large headlines: `-0.02em` at xl, `-0.01em` at lg

---

## Layout & Grid

| Breakpoint | Columns | Gutter | Container |
|---|---|---|---|
| Mobile (< 768px) | 4 col | 16px margins | Full width |
| Tablet (768–1024px) | 8 col | 20px | Full width |
| Desktop (1280px+) | 12 col | 24px | 1280px max |

### Section Padding
- Desktop: `120px` top and bottom (`py-section-padding`)
- Mobile: `64px` top and bottom (`py-16`)

### Asymmetric Layouts
Prefer asymmetric column splits for a modern feel:
- Hero: 6-col content + 6-col visual
- Feature: 5-col text + 7-col graphic
- Stats: 2-col heading + 2×2 grid of stat tiles

---

## Components

### Buttons

```html
<!-- Primary CTA — Yellow background, always for lead gen -->
<a href="/contact" class="btn-primary">Get a Free Consultation</a>

<!-- Secondary — Outlined, for secondary actions -->
<a href="/solutions" class="btn-secondary">Explore Solutions</a>

<!-- Ghost — Inline link with arrow, for navigation -->
<a href="/about" class="btn-ghost">Learn more <span class="material-symbols-outlined">arrow_forward</span></a>
```

**Rules:**
- `btn-primary` (yellow) is reserved for lead-generation CTAs only
- Never use pill/full-round buttons — keep `rounded-lg` (0.5rem)
- Always use `uppercase tracking-widest` on CTA text
- Add icons to CTAs where appropriate (`arrow_forward`, `north_east`)

### Cards

```html
<!-- Standard feature card -->
<div class="card">
  ...content...
</div>
```

The `.card` class applies: white bg · subtle border · hover border shifts to primary · 4px lift on hover · no heavy shadow

### Input Fields

```html
<input type="email" class="input-field" placeholder="you@company.com" />
```

Bottom-border style only — no box shadow, no border-box. Border turns `primary` on focus.

### Eyebrow Labels

```html
<p class="eyebrow">Our Solutions</p>
```

Always placed above a headline. Never standalone.

### Logo Strip (clients / partners)

```html
<div class="logo-strip">
  <img src="/images/clients/client-name.svg" alt="Client Name" />
</div>
```

Grayscale at rest, full color on hover. Signals trust without visual noise.

---

## Elevation & Depth

Do NOT use heavy drop shadows. Use instead:

| Depth level | Method |
|---|---|
| Sections | Alternating background color (`surface-off-white`) |
| Cards | 1px border `outline-variant/20`, hover border `primary` |
| Interaction feedback | `hover:-translate-y-1` + `hover:shadow-[0_8px_32px_rgba(66,86,219,0.08)]` |
| Modals / drawers | `shadow-[var(--shadow-drawer)]` — large soft blur, very low opacity |

---

## Iconography

Uses **Material Symbols Outlined** (Google). Currently loaded via CDN — see `EXPORT_GUIDE.md §4` for self-hosting.

Icon variation settings applied globally in `main.css`:
```css
font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
```

For filled icons (play button, active nav): override inline:
```html
<span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span>
```

---

## Spacing Scale (Custom)

| Token | Value | Usage |
|---|---|---|
| `margin-mobile` | 16px | Mobile side padding |
| `gutter` | 24px | Desktop grid gutter |
| `section-padding` | 120px | Vertical section separation |
| `stack-gap` | 32px | Vertical spacing between stacked elements |

---

## Dark Surface Sections

Brand rule: always dark navy — never pure black `#000000`. Use `#060F24` (Ink Deep) for deepest dark, `#0B1F4B` for section backgrounds.

For sections with `bg-[#060F24]` or `bg-ink-deep`:
- Text: `text-white` or `text-inverse-on-surface`
- Muted text: `text-white/60` or `text-slate`
- Primary accent: `text-action-yellow`
- Cards: `.glass` class (frosted glass effect)
- Dividers: `border-white/10` or `border-mist/20`

---

## Stitch Reference Files

The original Google Stitch prototype files are preserved in:
```
../stitch_aka_digital_strategic_redesign/
├── aka_digital_redesign_home/code.html       ← Homepage reference
├── crm_marketing_automation_solution/        ← CRM solution reference
├── digital_marketing_programmatic_solution/  ← Programmatic reference
├── geo_ai_sgo_aeo_seo_solution/             ← GEO/AI/SEO reference
├── social_media_marketing_solution/          ← Social media reference
└── nexus_corporate/DESIGN.md               ← Full design system spec
```

These are **reference only** — do not edit them.
