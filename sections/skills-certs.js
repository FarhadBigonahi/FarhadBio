/* FarhadBio extras layer — injects the Skills (progress bars) and Certification
   sections AFTER Framer's React hydration settles, so the DOM edits stick.
   Same contract as blog.js: markup lives in <template>s OUTSIDE #main (hydration
   never sees them); the originals (Expertise, Project, the 5th Experience card)
   are hidden via CSS in <head>. A structural SSR change would trigger React
   error #405 and get reverted — so we clone in on window.load instead. */
(function () {
  "use strict";

  var io = null;
  function observe(node) {
    var nodes = node.querySelectorAll(".fx-reveal");
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    }
    nodes.forEach(function (n) { io.observe(n); });
  }

  // ---------- Certificate lightbox ----------
  // Built once and appended to <body> (never inside a .fx-reveal, whose
  // transform would break the overlay's position:fixed). Triggers carry
  // data-fx-lightbox="<img url>"; wireLightbox binds them after injection.
  var lb = null, lastFocus = null;

  function ensureLightbox() {
    if (lb) return lb;
    lb = document.createElement("div");
    lb.className = "fx-lightbox";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Certificate preview");
    lb.innerHTML =
      '<img class="fx-lightbox__img" alt="">' +
      '<button type="button" class="fx-lightbox__close" aria-label="Close certificate preview">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>' +
      "</button>";
    lb.addEventListener("click", function (e) {
      if (e.target === lb || (e.target.closest && e.target.closest(".fx-lightbox__close"))) closeLightbox();
    });
    document.body.appendChild(lb);
    return lb;
  }

  function onKey(e) {
    if (e.key === "Escape") { closeLightbox(); return; }
    // Only the close button is focusable — keep focus trapped on it.
    if (e.key === "Tab") { e.preventDefault(); lb.querySelector(".fx-lightbox__close").focus(); }
  }

  function openLightbox(src, alt) {
    var box = ensureLightbox();
    var img = box.querySelector(".fx-lightbox__img");
    img.src = src;
    img.alt = alt || "Certificate";
    lastFocus = document.activeElement;
    box.hidden = false;
    document.documentElement.classList.add("fx-lock");
    requestAnimationFrame(function () { box.classList.add("is-open"); });
    box.querySelector(".fx-lightbox__close").focus();
    document.addEventListener("keydown", onKey);
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.classList.remove("is-open");
    document.documentElement.classList.remove("fx-lock");
    document.removeEventListener("keydown", onKey);
    var box = lb, hide = function () { box.hidden = true; box.removeEventListener("transitionend", hide); };
    box.addEventListener("transitionend", hide);
    setTimeout(hide, 400);                                   // fallback if transition is skipped
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function wireLightbox(node) {
    node.querySelectorAll("[data-fx-lightbox]").forEach(function (t) {
      if (t.dataset.fxBound) return;                         // survive re-assert passes
      t.dataset.fxBound = "1";
      t.addEventListener("click", function () {
        var img = t.querySelector("img");
        openLightbox(t.getAttribute("data-fx-lightbox"), img && img.alt);
      });
    });
  }

  // Clone one <template> into place right AFTER the original Framer section.
  function injectAfter(tplId, afterName, tag) {
    var tpl = document.getElementById(tplId);
    if (!tpl) return true;                                   // not present
    if (document.querySelector('[data-fx="' + tag + '"]')) return true; // done
    var node = tpl.content.firstElementChild.cloneNode(true);
    var orig = document.querySelector('#main section[data-framer-name="' + afterName + '"]');
    if (orig && orig.parentNode) {
      orig.parentNode.insertBefore(node, orig.nextSibling);
    } else {
      var main = document.getElementById("main");
      (main || document.body).appendChild(node);
    }
    observe(node);
    wireLightbox(node);
    return !!document.querySelector('[data-fx="' + tag + '"]');
  }

  function injectAll() {
    var a = injectAfter("fx-skills-tpl", "Expertise", "skills");
    var b = injectAfter("fx-cert-tpl", "Award", "certs");
    return a && b;
  }

  function run() {
    var tries = 0;
    (function attempt() {
      var ok = injectAll();
      if (++tries < 6) setTimeout(attempt, 400);            // re-assert past late reconciles
      else if (!ok) injectAll();
    })();
  }

  if (document.readyState === "complete") {
    requestAnimationFrame(function () { requestAnimationFrame(run); });
  } else {
    window.addEventListener("load", function () {
      requestAnimationFrame(function () { requestAnimationFrame(run); });
    });
  }
})();
