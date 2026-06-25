/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{njk,html,js,md}",
    "./public/js/**/*.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Brand 2025 palette (AKA-Digital-Brand-Identity-2025.pptx) ──
        "action-yellow":            "#F5C400", // Signal Yellow — all CTAs, labels, data callouts
        "ink-deep":                 "#060F24", // Deepest dark — hero BG, never use pure #000
        "navy-core":                "#0B1F4B", // Page/slide surface
        "navy-mid":                 "#132B5E", // Card / elevated surface
        "slate":                    "#8C9BB8", // Body text, captions
        "mist":                     "#C4CCDC", // Dividers, metadata
        "yellow-tint":              "#FEF3BF", // Decorative circle overlays on dark
        "brand-green":              "#00C896", // Success / positive indicator

        // Core brand (interactive)
        "primary":                  "#1B3A7A", // Navy-derived interactive blue (links, focus, eyebrows)
        "on-primary":               "#ffffff",
        "primary-container":        "#132B5E", // Navy Mid
        "on-primary-container":     "#C4CCDC", // Mist
        "inverse-primary":          "#8C9BB8", // Slate
        "primary-fixed":            "#C4CCDC", // Mist — for fixed-tinted containers
        "primary-fixed-dim":        "#8C9BB8",
        "on-primary-fixed":         "#060F24",
        "on-primary-fixed-variant": "#0B1F4B",

        // Secondary
        "secondary":                "#5e5e5e",
        "on-secondary":             "#ffffff",
        "secondary-container":      "#e2e2e2",
        "on-secondary-container":   "#646464",
        "secondary-fixed":          "#e2e2e2",
        "secondary-fixed-dim":      "#c6c6c6",
        "on-secondary-fixed":       "#1b1b1b",
        "on-secondary-fixed-variant":"#474747",

        // Tertiary
        "tertiary":                 "#833500",
        "on-tertiary":              "#ffffff",
        "tertiary-container":       "#aa4600",
        "on-tertiary-container":    "#ffdbcc",
        "tertiary-fixed":           "#ffdbcb",
        "tertiary-fixed-dim":       "#ffb692",
        "on-tertiary-fixed":        "#341100",
        "on-tertiary-fixed-variant":"#793000",

        // Surface system
        "background":               "#fbf8ff",
        "on-background":            "#1a1b23",
        "surface":                  "#fbf8ff",
        "surface-dim":              "#dad9e4",
        "surface-bright":           "#fbf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low":    "#f4f2fe",
        "surface-container":        "#eeecf8",
        "surface-container-high":   "#e9e7f2",
        "surface-container-highest":"#e3e1ed",
        "surface-variant":          "#e3e1ed",
        "surface-off-white":        "#F6F9F5",
        "on-surface":               "#1a1b23",
        "on-surface-variant":       "#454654",
        "inverse-surface":          "#060F24", // Ink Deep
        "inverse-on-surface":       "#f1effb",
        "surface-tint":             "#1B3A7A",

        // Outline
        "outline":                  "#8C9BB8", // Slate
        "outline-variant":          "#C4CCDC", // Mist

        // Error
        "error":                    "#ba1a1a",
        "on-error":                 "#ffffff",
        "error-container":          "#ffdad6",
        "on-error-container":       "#93000a",

        // Utility
        "muted-gray":               "#8C9BB8", // Slate
      },

      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],       // Brand: Cambria-equivalent serif
        body:    ["Inter", "system-ui", "sans-serif"],            // Brand: Calibri-equivalent sans
        mono:    ["JetBrains Mono", "Courier New", "monospace"], // Brand: labels / data / platform names
      },

      fontSize: {
        "headline-xl":        ["64px",  { lineHeight: "72px",  letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg":        ["48px",  { lineHeight: "56px",  letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md":        ["32px",  { lineHeight: "40px",  fontWeight: "700" }],
        "headline-sm":        ["24px",  { lineHeight: "32px",  fontWeight: "600" }],
        "headline-lg-mobile": ["36px",  { lineHeight: "44px",  fontWeight: "700" }],
        "body-lg":            ["18px",  { lineHeight: "28px",  fontWeight: "400" }],
        "body-md":            ["16px",  { lineHeight: "24px",  fontWeight: "400" }],
        "label-md":           ["14px",  { lineHeight: "20px",  letterSpacing: "0.05em", fontWeight: "600" }],
      },

      borderRadius: {
        sm:      "0.125rem",
        DEFAULT: "0.25rem",
        md:      "0.375rem",
        lg:      "0.5rem",
        xl:      "0.75rem",
        "2xl":   "1rem",
        "3xl":   "1.5rem",
        full:    "9999px",
      },

      spacing: {
        "margin-mobile":    "16px",
        "gutter":           "24px",
        "container-max":    "1280px",
        "section-padding":  "120px",
        "stack-gap":        "32px",
      },

      maxWidth: {
        container: "1280px",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
};
