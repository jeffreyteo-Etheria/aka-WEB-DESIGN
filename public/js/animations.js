/* ============================================================
   AKA Digital — Animations & Interactions
   - Scroll-reveal (IntersectionObserver)
   - Counter animations
   - Marquee pause-on-hover (handled in CSS)
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     Scroll-reveal: .reveal-up → adds .in-view when visible
     ---------------------------------------------------------- */
  function initScrollReveal() {
    var els = document.querySelectorAll(".reveal-up");
    if (!els.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ----------------------------------------------------------
     Counter animation: elements with data-target attribute
     ---------------------------------------------------------- */
  function animateCounter(el, target, duration) {
    var start = 0;
    var startTime = null;
    var suffix = el.dataset.suffix || (el.textContent.indexOf("+") !== -1 ? "+" : "");

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      var current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll(".counter[data-target]");
    if (!counters.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var target = parseInt(el.dataset.target, 10);
            if (!isNaN(target)) {
              animateCounter(el, target, 1600);
            }
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ----------------------------------------------------------
     Hero stat cards: trigger grow animation when hero is shown
     ---------------------------------------------------------- */
  function initHeroBarAnimations() {
    var bars = document.querySelectorAll(".animate-\\[grow_1\\.5s_ease-out");
    bars.forEach(function (bar) {
      bar.style.animationPlayState = "running";
    });
  }

  /* ----------------------------------------------------------
     Smooth scroll for anchor links
     ---------------------------------------------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var target = document.querySelector(this.getAttribute("href"));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Initialise on DOM ready
     ---------------------------------------------------------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    initScrollReveal();
    initCounters();
    initHeroBarAnimations();
    initSmoothScroll();
  }
})();
