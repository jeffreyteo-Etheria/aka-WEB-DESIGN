/* ============================================================
   main.js — Miscellaneous page-level enhancements
   ============================================================ */

(function () {
  "use strict";

  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---- Intersection Observer: fade-in on scroll ---- */
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-4");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll("[data-animate]").forEach(function (el) {
      el.classList.add(
        "opacity-0",
        "translate-y-4",
        "transition-all",
        "duration-500"
      );
      observer.observe(el);
    });
  }

  /* ---- Active desktop nav link ---- */
  const currentPath = window.location.pathname;
  document.querySelectorAll("nav a").forEach(function (link) {
    const href = link.getAttribute("href");
    if (!href) return;
    // Exact match for home, prefix match for others
    const isActive =
      href === "/" ? currentPath === "/" : currentPath.startsWith(href);
    if (isActive) {
      link.classList.add("text-primary");
      link.classList.remove("text-on-surface-variant");
    }
  });
})();
