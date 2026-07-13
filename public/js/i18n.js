/* ============================================================
   i18n.js — Full-site language switching
   Strategy:
     EN  → serve page content as-is (source language)
     VI / KO / ZH → apply UI string overrides from /locales/*.json
                    THEN trigger Google Translate for body content
   Language persists across navigation via localStorage.
   ============================================================ */

(function () {
  "use strict";

  const DEFAULT_LANG = "en";
  const STORAGE_KEY  = "aka-lang";
  const LOCALES_PATH = "/locales/";
  const SUPPORTED    = ["en", "vi", "ko", "zh"];

  // Google Translate language codes
  const GT_CODES = { en: "en", vi: "vi", ko: "ko", zh: "zh-CN" };

  let currentLang = DEFAULT_LANG;

  /* ----------------------------------------------------------
     Detect saved language
     ---------------------------------------------------------- */
  function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(browser) ? browser : DEFAULT_LANG;
  }

  /* ----------------------------------------------------------
     Load locale JSON (UI strings only)
     ---------------------------------------------------------- */
  async function loadLocale(lang) {
    if (lang === DEFAULT_LANG) return {};
    try {
      const res = await fetch(LOCALES_PATH + lang + ".json");
      return res.ok ? await res.json() : {};
    } catch (_) {
      return {};
    }
  }

  /* ----------------------------------------------------------
     Apply UI string overrides (nav labels, CTAs, form labels)
     ---------------------------------------------------------- */
  function applyStrings(strings) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (strings[key]) el.textContent = strings[key];
    });
  }

  /* ----------------------------------------------------------
     Google Translate integration
     - Injects the translate element (hidden) the first time
     - Changes the active language via the GTranslateElement API
     ---------------------------------------------------------- */
  function applyGoogleTranslate(lang) {
    const gtLang = GT_CODES[lang] || lang;

    // If switching back to English, restore original
    if (lang === DEFAULT_LANG) {
      restoreOriginal();
      return;
    }

    // If Google Translate is already loaded, use it
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
      doTranslate(gtLang);
    } else {
      // Load GT script once
      if (!document.getElementById("gt-script")) {
        var el = document.createElement("div");
        el.id = "google_translate_element";
        el.style.cssText = "position:absolute;left:-9999px;top:-9999px;visibility:hidden";
        document.body.appendChild(el);

        window.googleTranslateElementInit = function () {
          new window.google.translate.TranslateElement(
            { pageLanguage: "en", autoDisplay: false },
            "google_translate_element"
          );
          doTranslate(gtLang);
        };

        var script = document.createElement("script");
        script.id = "gt-script";
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.head.appendChild(script);
      } else {
        // Script exists but GT not ready yet — wait
        var waited = 0;
        var poll = setInterval(function () {
          waited += 100;
          if (window.google && window.google.translate && window.google.translate.TranslateElement) {
            clearInterval(poll);
            doTranslate(gtLang);
          }
          if (waited > 5000) clearInterval(poll);
        }, 100);
      }
    }
  }

  /* Trigger translation by setting the GT cookie and reloading page content */
  function doTranslate(targetLang) {
    var select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = targetLang;
      select.dispatchEvent(new Event("change"));
    } else {
      // Fallback: set the translation cookie and trigger via the GT iframe
      setCookie("googtrans", "/en/" + targetLang);
      // Force Google Translate to pick up the cookie
      var frame = document.querySelector(".goog-te-banner-frame") ||
                  document.querySelector("iframe.skiptranslate");
      if (frame && frame.contentDocument) {
        var restoreBtn = frame.contentDocument.querySelector(".goog-te-button button");
        if (restoreBtn) restoreBtn.click();
      }
      // Last resort: reload with the cookie set (only if not already translated)
      if (!document.documentElement.classList.contains("translated-ltr") &&
          !document.documentElement.classList.contains("translated-rtl")) {
        window.location.reload();
      }
    }
  }

  function restoreOriginal() {
    setCookie("googtrans", "");
    // Click the GT "Restore" button if visible
    var frame = document.querySelector(".goog-te-banner-frame, iframe.skiptranslate");
    if (frame) {
      try {
        var doc = frame.contentDocument || frame.contentWindow.document;
        var btn = doc.querySelector(".goog-te-button button") ||
                  doc.querySelector('[id$="restore"]');
        if (btn) { btn.click(); return; }
      } catch (_) {}
    }
    // If the page is currently translated, reload to restore English
    if (document.documentElement.classList.contains("translated-ltr") ||
        document.documentElement.classList.contains("translated-rtl")) {
      window.location.reload();
    }
  }

  function setCookie(name, value) {
    var domain = window.location.hostname === "localhost" ? "localhost" : "." + window.location.hostname;
    document.cookie = name + "=" + value + "; path=/; domain=" + domain;
  }

  /* ----------------------------------------------------------
     Update button active state
     ---------------------------------------------------------- */
  function updateButtons(lang) {
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      const isActive = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("text-action-yellow", isActive);
      btn.classList.toggle("font-bold", isActive);
      // Remove inactive styling
      if (isActive) {
        btn.removeAttribute("style");
      }
    });
    // Also update footer lang buttons
    document.querySelectorAll("[data-lang-footer]").forEach(function (btn) {
      const isActive = btn.getAttribute("data-lang-footer") === lang;
      btn.classList.toggle("bg-primary", isActive);
      btn.classList.toggle("text-on-primary", isActive);
      btn.classList.toggle("bg-transparent", !isActive);
    });
  }

  /* ----------------------------------------------------------
     Show/hide a language notice banner
     ---------------------------------------------------------- */
  function updateLangNotice(lang) {
    var banner = document.getElementById("lang-notice");
    if (!banner) return;
    if (lang !== DEFAULT_LANG) {
      banner.classList.remove("hidden");
      var langName = { vi: "Vietnamese", ko: "Korean", zh: "Chinese (Simplified)" }[lang] || lang;
      var textEl = banner.querySelector("[data-lang-notice-text]");
      if (textEl) textEl.textContent = "Content is being displayed in " + langName + " via machine translation.";
    } else {
      banner.classList.add("hidden");
    }
  }

  /* ----------------------------------------------------------
     Switch language — main entry
     ---------------------------------------------------------- */
  async function switchLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hans" : lang);

    // 1. Apply UI string overrides immediately
    const strings = await loadLocale(lang);
    applyStrings(strings);

    // 2. Update active button state
    updateButtons(lang);

    // 3. Show/hide translation notice
    updateLangNotice(lang);

    // 4. Full-page translation via Google Translate
    applyGoogleTranslate(lang);
  }

  /* ----------------------------------------------------------
     Wire up all language buttons
     ---------------------------------------------------------- */
  function bindButtons() {
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchLang(btn.getAttribute("data-lang"));
      });
    });
  }

  /* ----------------------------------------------------------
     Protect untranslatable elements from Google Translate
     - Material Symbols icons render via text ligatures; if GT
       translates the text content the icon name breaks completely
       and shows as raw translated characters inside the button.
     - Logo text and brand names must also stay in English.
     ---------------------------------------------------------- */
  function protectElements() {
    // All Material Symbols / Material Icons spans
    var iconSel = [
      ".material-symbols-outlined",
      ".material-symbols-rounded",
      ".material-symbols-sharp",
      ".material-icons",
      ".material-icons-outlined",
      ".material-icons-round"
    ].join(",");

    document.querySelectorAll(iconSel).forEach(function (el) {
      el.setAttribute("translate", "no");
      el.classList.add("notranslate");
    });

    // Explicitly marked elements (data-notranslate="true")
    document.querySelectorAll("[data-notranslate]").forEach(function (el) {
      el.setAttribute("translate", "no");
      el.classList.add("notranslate");
    });

    // Stat/counter elements — protect "+" suffix and numeric values from translation.
    // Google Translate can mangle "+" and tick/check characters inside animated counters.
    document.querySelectorAll(".counter, [data-suffix], [data-target]").forEach(function (el) {
      el.setAttribute("translate", "no");
      el.classList.add("notranslate");
    });

    // Logo fallback text spans
    document.querySelectorAll(".logo-text, [aria-label*='AKA Digital'] span").forEach(function (el) {
      el.setAttribute("translate", "no");
      el.classList.add("notranslate");
    });

    // Any element already marked translate="no" in HTML — ensure notranslate class is present
    // This covers partner names, brand names, stat numbers, and any future tagged elements
    document.querySelectorAll("[translate='no']").forEach(function (el) {
      el.classList.add("notranslate");
    });
  }

  /* ----------------------------------------------------------
     Suppress Google Translate's default toolbar (branding)
     ---------------------------------------------------------- */
  function suppressGTBranding() {
    var style = document.createElement("style");
    style.textContent = [
      ".goog-te-banner-frame { display:none!important }",
      ".goog-te-gadget { display:none!important }",
      "body { top:0!important }",
      "#google_translate_element { display:none!important }",
      /* Prevent translated <font> wrappers inside buttons from breaking layout */
      ".btn-primary font, .btn-secondary font, .btn-ghost font, .btn-outlined font { display:contents }",
      /* Only icon spans need inline-flex — not block elements like p/h2 with notranslate */
      "span.material-symbols-outlined.notranslate, span.material-symbols-rounded.notranslate,",
      "span.material-icons.notranslate, span.material-icons-outlined.notranslate,",
      "span.material-icons-round.notranslate { display:inline-flex!important; align-items:center }"
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  suppressGTBranding();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      protectElements();
      bindButtons();
      switchLang(detectLang());
    });
  } else {
    protectElements();
    bindButtons();
    switchLang(detectLang());
  }
})();
