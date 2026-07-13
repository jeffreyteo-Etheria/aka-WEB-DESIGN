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

  /* ----------------------------------------------------------
     Mouse-follow glow blob
     ---------------------------------------------------------- */
  function initMouseGlow() {
    var blob = document.createElement("div");
    blob.id = "mouse-glow";
    blob.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:480px",
      "height:480px",
      "border-radius:50%",
      "pointer-events:none",
      "z-index:9999",
      "transform:translate(-50%,-50%)",
      "background:radial-gradient(circle, rgba(245,196,0,0.10) 0%, rgba(27,58,122,0.06) 40%, transparent 70%)",
      "transition:opacity 0.3s ease",
      "opacity:0"
    ].join(";");
    document.body.appendChild(blob);

    var px = window.innerWidth / 2, py = window.innerHeight / 2;
    var tx = px, ty = py;
    var raf;

    document.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      blob.style.opacity = "1";
    });
    document.addEventListener("mouseleave", function () {
      blob.style.opacity = "0";
    });

    function loop() {
      px += (tx - px) * 0.08;
      py += (ty - py) * 0.08;
      blob.style.left = px + "px";
      blob.style.top  = py + "px";
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  function init() {
    initScrollReveal();
    initCounters();
    initHeroBarAnimations();
    initSmoothScroll();
    initMouseGlow();
  }
})();
