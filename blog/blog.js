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

  // --- Homepage: force a real navigation to the static blog ----------
  // The Framer SPA still owns a dead "/blog" route — the original template's
  // CMS blog, whose data + code chunks were removed during the rebrand. Left
  // alone, clicking a "Blogs" link makes Framer client-side-route into it,
  // which throws a fatal CMS error ("Unexpected response length") + React #405
  // and leaves a blank, hung screen. The real blog is a separate STATIC page
  // at /blog/. Intercept blog-link clicks in the CAPTURE phase (before Framer's
  // router sees them) and do a full-page navigation instead. Only arms on the
  // Framer homepage (has #main); on the static blog pages this is a no-op, so
  // their own links keep working normally.
  function guardBlogLinks() {
    if (window.__wbBlogGuard) return;                 // arm once
    if (!document.getElementById("main")) return;     // Framer pages only
    window.__wbBlogGuard = true;
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab etc.
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank") return;
      // Match Framer's internal blog links: "./blog", "/blog", ".../blog/..."
      if (!/^(\.?\/)?blog(\/|$)/.test(a.getAttribute("href") || "")) return;
      e.preventDefault();
      e.stopImmediatePropagation();                   // beat Framer's handler
      window.location.assign("/blog/");               // real load of the static blog
    }, true);                                         // capture phase
  }

  function init() { reveal(); copyButtons(); guardBlogLinks(); }

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
