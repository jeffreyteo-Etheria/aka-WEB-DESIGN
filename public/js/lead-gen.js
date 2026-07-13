/* ============================================================
   AKA Digital — Lead Generation & Conversion Module
   Handles: Sticky CTA bar, Exit-intent popup, Scroll CTAs
   ============================================================ */
(function () {
  "use strict";

  /* ── Sticky CTA bar (shows after scrolling past the hero) ── */
  var stickyBar = document.getElementById("sticky-cta-bar");
  if (stickyBar) {
    var heroHeight = (document.querySelector(".hero-section") || { offsetHeight: 600 }).offsetHeight;
    var stickyVisible = false;

    function checkStickyBar() {
      var scrolled = window.scrollY > heroHeight * 0.6;
      if (scrolled && !stickyVisible) {
        stickyBar.classList.remove("translate-y-full", "opacity-0");
        stickyBar.classList.add("translate-y-0", "opacity-100");
        stickyVisible = true;
      } else if (!scrolled && stickyVisible) {
        stickyBar.classList.remove("translate-y-0", "opacity-100");
        stickyBar.classList.add("translate-y-full", "opacity-0");
        stickyVisible = false;
      }
    }

    window.addEventListener("scroll", checkStickyBar, { passive: true });
    checkStickyBar();
  }

  /* ── Exit-intent popup ── */
  var exitPopup = document.getElementById("exit-intent-popup");
  var exitPopupShown = false;

  function getStorageKey() { return "aka-exit-shown-" + Math.floor(Date.now() / 86400000); }

  function showExitPopup() {
    if (exitPopupShown) return;
    if (sessionStorage.getItem("aka-exit-dismissed")) return;
    exitPopupShown = true;
    exitPopup.classList.remove("hidden");
    exitPopup.querySelector(".exit-popup-inner").classList.add("scale-100", "opacity-100");
    exitPopup.querySelector(".exit-popup-inner").classList.remove("scale-95", "opacity-0");
    document.body.style.overflow = "hidden";
  }

  function closeExitPopup() {
    exitPopup.classList.add("hidden");
    document.body.style.overflow = "";
    sessionStorage.setItem("aka-exit-dismissed", "1");
  }

  if (exitPopup) {
    // Desktop: mouse leaves viewport from top
    document.addEventListener("mouseleave", function (e) {
      if (e.clientY <= 0) showExitPopup();
    });

    // Mobile: scroll rapidly upward past threshold
    var lastScrollY = window.scrollY;
    var scrollVelocityTimer;
    window.addEventListener("scroll", function () {
      var currentY = window.scrollY;
      var delta = lastScrollY - currentY;
      if (delta > 80 && currentY > 400) {
        clearTimeout(scrollVelocityTimer);
        scrollVelocityTimer = setTimeout(function () { showExitPopup(); }, 100);
      }
      lastScrollY = currentY;
    }, { passive: true });

    // Close handlers
    var closeBtn = exitPopup.querySelector("[data-close-exit]");
    if (closeBtn) closeBtn.addEventListener("click", closeExitPopup);
    exitPopup.addEventListener("click", function (e) {
      if (e.target === exitPopup) closeExitPopup();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeExitPopup();
    });
  }

  /* ── Scroll-progress CTA on blog/solution pages ── */
  var readingProgress = document.getElementById("reading-progress");
  if (readingProgress) {
    function updateProgress() {
      var doc = document.documentElement;
      var winH = window.innerHeight;
      var docH = doc.scrollHeight - winH;
      var scrolled = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      readingProgress.style.width = Math.min(scrolled, 100) + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
  }

  /* ── Solution inquiry form routing ── */
  document.querySelectorAll("[data-solution-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var solution = form.dataset.solutionForm;
      var email = (form.querySelector("[name=email]") || {}).value || "";
      var name = (form.querySelector("[name=name]") || {}).value || "";
      var subject = "Solution Inquiry: " + solution + " — " + (name || email);
      var body = [
        "Name: " + name,
        "Email: " + email,
        "Solution of interest: " + solution
      ].join("\n");
      window.location.href = "mailto:jeffrey.teo@akadigital.net?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      var successEl = form.querySelector("[data-success]");
      if (successEl) {
        form.style.display = "none";
        successEl.classList.remove("hidden");
      }
    });
  });

})();
