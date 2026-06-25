/* ============================================================
   carousel.js — Keyboard / button navigation for scroll rows
   ============================================================ */

(function () {
  "use strict";

  /* Add arrow-button navigation to any scrollable row with data-carousel */
  document.querySelectorAll("[data-carousel]").forEach(function (track) {
    const wrapper = track.parentElement;

    const prev = wrapper.querySelector("[data-carousel-prev]");
    const next = wrapper.querySelector("[data-carousel-next]");

    if (!prev && !next) return;

    const cardWidth = function () {
      const firstCard = track.querySelector("[data-carousel-item]");
      if (!firstCard) return 300;
      const style = getComputedStyle(track);
      const gap = parseInt(style.gap || style.columnGap || "0", 10);
      return firstCard.offsetWidth + gap;
    };

    if (prev) {
      prev.addEventListener("click", function () {
        track.scrollBy({ left: -cardWidth(), behavior: "smooth" });
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        track.scrollBy({ left: cardWidth(), behavior: "smooth" });
      });
    }
  });

  /* Video play button — inline video overlay */
  document.querySelectorAll("[data-video-src]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const src = btn.getAttribute("data-video-src");
      if (!src) return;

      const overlay = document.createElement("div");
      overlay.className =
        "fixed inset-0 z-[200] bg-black/90 flex items-center justify-center";

      const closeOvl = document.createElement("button");
      closeOvl.className =
        "absolute top-4 right-4 text-white text-label-md font-bold flex items-center gap-1";
      closeOvl.innerHTML =
        '<span class="material-symbols-outlined text-2xl">close</span> Close';
      closeOvl.addEventListener("click", function () {
        document.body.removeChild(overlay);
      });

      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.className = "max-w-4xl w-full max-h-[80vh] rounded-2xl";

      overlay.appendChild(closeOvl);
      overlay.appendChild(video);
      document.body.appendChild(overlay);

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    });
  });
})();
