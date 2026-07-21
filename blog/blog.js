/* Whisp blog layer — progressive enhancement (no dependencies).
   On blog pages: scroll-reveal + copy buttons.
   On the homepage: injects the featured "Latest Insights" card AFTER Framer's
   React hydration finishes, so the DOM edit sticks (a pre-hydration or SSR
   structural change would trigger React error #405 and get reverted). The
   card markup lives in a <template> placed OUTSIDE #main, so hydration never
   sees it. The original Framer blog section is hidden via CSS (blog.css/head). */
(function () {
  "use strict";

  var io = null;
  function reveal(scope) {
    var nodes = (scope || document).querySelectorAll(".wb-reveal:not(.is-in)");
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
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }
    nodes.forEach(function (n) { io.observe(n); });
  }

  function copyButtons(scope) {
    (scope || document).querySelectorAll(".wb-copy:not([data-wired])").forEach(function (btn) {
      btn.setAttribute("data-wired", "1");
      btn.addEventListener("click", function () {
        var code = btn.closest(".wb-code");
        var text = code ? code.querySelector("code").innerText : "";
        var done = function () {
          btn.textContent = "کپی شد!"; btn.classList.add("is-done");
          setTimeout(function () { btn.textContent = "کپی"; btn.classList.remove("is-done"); }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        } else {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  }

  // --- Homepage: inject the featured section after hydration ---------
  function injectFeatured() {
    var tpl = document.getElementById("wb-featured-tpl");
    if (!tpl) return true;                              // not the homepage
    if (document.querySelector(".wb-insights")) return true; // already injected
    var orig = document.querySelector('#main section[data-framer-name="Blog"]');
    var node = tpl.content.firstElementChild.cloneNode(true);
    if (orig && orig.parentNode) {
      orig.parentNode.insertBefore(node, orig.nextSibling);
    } else {
      var main = document.getElementById("main");
      (main || document.body).appendChild(node);
    }
    reveal(node);
    copyButtons(node);
    return !!document.querySelector(".wb-insights");
  }

  function homepage() {
    // Run only after React hydration is settled (window load + 2 frames).
    var tries = 0;
    (function attempt() {
      var ok = injectFeatured();
      // Re-assert a few times in case concurrent hydration reconciles late.
      if (++tries < 6) setTimeout(attempt, 400);
      else if (!ok) injectFeatured();
    })();
  }

  function init() { reveal(); copyButtons(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }

  if (document.readyState === "complete") {
    requestAnimationFrame(function () { requestAnimationFrame(homepage); });
  } else {
    window.addEventListener("load", function () {
      requestAnimationFrame(function () { requestAnimationFrame(homepage); });
    });
  }
})();
