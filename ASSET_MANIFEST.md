# Asset Manifest

Every image, video, and font slot the site expects.
Files marked ✅ are already in place. Files marked ⬜ need to be added.

---

## Fonts (`public/fonts/`)

| File | Status | Source |
|---|---|---|
| `HankenGrotesk-VariableFont_wght.woff2` | ⬜ | [fonts.google.com/specimen/Hanken+Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) — Download → Variable font |
| `Inter-VariableFont_opsz,wght.woff2`   | ⬜ | [fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter) — Download → Variable font |

> Without these files the site uses `system-ui` as fallback. Layout is unaffected.

---

## Brand Logos (`public/images/logos/`)

| File | Status | Notes |
|---|---|---|
| `AKA Logo - New - 2025.10.png` | ✅ | Primary logo — nav updated to use this PNG |
| `aka-digital-logo-white.svg`   | ⬜ | White/reversed logo for dark footer — footer falls back to text |
| `aka-digital-og.jpg`           | ⬜ | Social sharing / Open Graph image (1200×630px) |
| `favicon.png`                  | ⬜ | Browser favicon (32×32px or 64×64px PNG) |
| `apple-touch-icon.png`         | ⬜ | iOS home screen icon (180×180px) |

---

## Tech Partner Logos (`public/images/partners/`)

| File | Status | Notes |
|---|---|---|
| `mixpanel` (PNG)  | ✅ | Using `/images/activities/DSS2024/lmixpanel.png` — partners.json updated |
| `mparticle` (PNG) | ✅ | Using `/images/activities/DSS2024/lmparticle.png` — partners.json updated |
| `onesignal.svg`   | ⬜ | From onesignal.com brand assets |
| `adjust.svg`      | ⬜ | From adjust.com press kit |
| `netcore.svg`     | ⬜ | From netcorecloud.com |
| `abtasty.svg`     | ⬜ | From abtasty.com brand kit |

---

## Client Logos (`public/images/clients/`)

| File | Status | Notes |
|---|---|---|
| `fe-credit.svg`  | ⬜ | FE Credit brand logo |
| `client-b.svg`   | ⬜ | Replace with real client name and logo |
| `client-c.svg`   | ⬜ | Replace with real client name and logo |
| `client-d.svg`   | ⬜ | Replace with real client name and logo |
| `client-e.svg`   | ⬜ | Replace with real client name and logo |
| `client-f.svg`   | ⬜ | Replace with real client name and logo |

> To update client names: edit `src/_data/content.json` → `clients` array

---

## Hero Images (`public/images/hero/`)

| File | Status | Notes |
|---|---|---|
| `hero-bg.jpg` | ⬜ | Homepage hero background — data visualization / abstract tech. Min 1920×1080px. Low opacity overlay applied in CSS. |

---

## Activity / Event Photos (`public/images/activities/`)

| Slot | Status | Mapped to |
|---|---|---|
| Hanoi Data Summit    | ✅ | `DSS2024/bg_landingpage.jpg` |
| Mixpanel vs. GA4     | ✅ | `2023 Martech Innovation/DSC01320_edited.jpg` |
| CDP Deepdive         | ✅ | `Look-back-Martech-Summit-2024/Martech2024-0005.jpeg` |
| MMA Smarties Awards  | ✅ | `Look-back-Martech-Summit-2024/Martech2024-0009.jpeg` |

Additional event assets available (not yet wired to sitedata.json slots):
- `2023 Martech Innovation/` — 15 professional event photos
- `2025 Martech Summit/` — banner PNG + animated GIF cover
- `DSS2024/` — landing page visuals, sponsor logos, Frame screenshots
- `Guest Speakers/` — 6 speaker headshots
- `Look-back-Martech-Summit-2024/` — 29 event photos

---

## Solution Hero Images (`public/images/solutions/`)

| File | Status | Notes |
|---|---|---|
| `crm-automation-hero.jpg`  | ⬜ | CRM / automation visual |
| `programmatic-hero.jpg`    | ⬜ | Digital advertising visual |
| `geo-ai-seo-hero.jpg`      | ⬜ | AI / search visual |
| `social-media-hero.jpg`    | ⬜ | Social media visual |

---

## Team Photos (`public/images/team/`)

| File | Status | Notes |
|---|---|---|
| `phuong-pham.jpg`  | ⬜ | Ms. Phuong Pham (Maisie) headshot |
| `jeffrey-teo.jpg`  | ⬜ | Mr. Jeffrey Teo headshot |

---

## Case Study — FE Credit (`public/case-studies/fe-credit/`)

| File | Status | Notes |
|---|---|---|
| `cover.jpg`      | ⬜ | Case study grid card cover image |
| `video-thumb.jpg`| ⬜ | Video player thumbnail (16:9) |

---

## Videos (`public/videos/`)

| File | Status | Notes |
|---|---|---|
| `fe-credit-case-study.mp4` | ⬜ | FE Credit / MMA Smarties case study video. Export from Wix or source from original file. H.264 MP4 recommended. |

---

## Updating This Manifest

When you add a file:
1. Mark its row ✅
2. Run `npm run build` to verify it renders correctly
3. Update `src/_data/*.json` if the filename differs from what's listed here
