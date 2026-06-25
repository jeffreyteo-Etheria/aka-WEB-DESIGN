/* ============================================================
   form.js — Google Forms async submission with loading state
   Uses hidden iframe target (form attribute target="gform_iframe")
   so the page never navigates away on submit.
   ============================================================ */

(function () {
  "use strict";

  const form       = document.getElementById("contact-form");
  const submitBtn  = document.getElementById("form-submit");
  const submitText = document.getElementById("form-submit-text");
  const spinner    = document.getElementById("form-submit-spinner");
  const successMsg = document.getElementById("form-success");
  const errorMsg   = document.getElementById("form-error");

  if (!form) return;

  // Validate required fields and highlight errors
  function validate() {
    let valid = true;
    form.querySelectorAll("[required]").forEach(function (field) {
      if (!field.value.trim()) {
        field.classList.add("border-error");
        valid = false;
      } else {
        field.classList.remove("border-error");
      }
    });
    return valid;
  }

  // Listen for the iframe load that fires after Google Forms redirect
  const iframe = document.querySelector('iframe[name="gform_iframe"]');
  let submitted = false;

  if (iframe) {
    iframe.addEventListener("load", function () {
      if (!submitted) return;
      submitted = false;
      // Google Forms redirected into the iframe — treat as success
      form.reset();
      if (successMsg) successMsg.classList.remove("hidden");
      if (submitBtn)  submitBtn.disabled = false;
      if (submitText) submitText.classList.remove("hidden");
      if (spinner)    spinner.classList.add("hidden");
    });
  }

  form.addEventListener("submit", function (e) {
    if (!validate()) {
      e.preventDefault();
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    if (submitText) submitText.classList.add("hidden");
    if (spinner)    spinner.classList.remove("hidden");
    if (successMsg) successMsg.classList.add("hidden");
    if (errorMsg)   errorMsg.classList.add("hidden");

    submitted = true;

    // Let the form submit naturally — the hidden iframe catches the redirect.
    // A 5-second fallback shows success in case the iframe load event misfires.
    setTimeout(function () {
      if (!submitted) return;
      submitted = false;
      form.reset();
      if (successMsg) successMsg.classList.remove("hidden");
      if (submitBtn)  submitBtn.disabled = false;
      if (submitText) submitText.classList.remove("hidden");
      if (spinner)    spinner.classList.add("hidden");
    }, 5000);
  });
})();
