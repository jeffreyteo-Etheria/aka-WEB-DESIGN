/* ============================================================
   nav.js — Mobile drawer, scroll shadow, bottom nav active state
   ============================================================ */

(function () {
  "use strict";

  const header   = document.getElementById("site-header");
  const toggle   = document.getElementById("menu-toggle");
  const drawer   = document.getElementById("drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  const closeBtn = document.getElementById("drawer-close");
  const menuIcon = document.getElementById("menu-icon");

  if (!header || !toggle || !drawer || !backdrop) return;

  /* ---- Drawer open / close ---- */
  function openDrawer() {
    drawer.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
    requestAnimationFrame(() => backdrop.classList.add("opacity-100"));
    toggle.setAttribute("aria-expanded", "true");
    if (menuIcon) menuIcon.textContent = "close";
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.add("-translate-x-full");
    backdrop.classList.remove("opacity-100");
    setTimeout(() => backdrop.classList.add("hidden"), 300);
    toggle.setAttribute("aria-expanded", "false");
    if (menuIcon) menuIcon.textContent = "menu";
    document.body.style.overflow = "";
  }

  toggle.addEventListener("click", function () {
    const isOpen = !drawer.classList.contains("-translate-x-full");
    isOpen ? closeDrawer() : openDrawer();
  });

  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  // Close on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.classList.contains("-translate-x-full")) {
      closeDrawer();
    }
  });

  /* ---- Scroll shadow on header ---- */
  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add("shadow-md");
    } else {
      header.classList.remove("shadow-md");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Bottom nav active state ---- */
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".mobile-nav-item").forEach(function (link) {
    const href = (link.getAttribute("data-path") || "").replace(/\/$/, "") || "/";
    if (currentPath === href || (href !== "/" && currentPath.startsWith(href))) {
      link.classList.add("active");
      link.classList.remove("text-on-surface-variant");
    }
  });
})();
