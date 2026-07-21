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
