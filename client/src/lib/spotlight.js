// One delegated, rAF-throttled listener powers every card spotlight.
// Cards opt in with a `data-spotlight` attribute; the gradient itself
// lives in CSS (.surface-card[data-spotlight]::after in index.css).

let rafId = null;
let lastEvent = null;

const update = () => {
  rafId = null;
  const target = lastEvent.target;
  const el =
    target instanceof Element ? target.closest("[data-spotlight]") : null;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mouse-x", `${lastEvent.clientX - rect.left}px`);
  el.style.setProperty("--mouse-y", `${lastEvent.clientY - rect.top}px`);
};

export function initSpotlight() {
  // No hover, no spotlight (touch devices); reduced motion opts out too.
  if (
    window.matchMedia("(hover: none)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return () => {};
  }

  const onMove = (e) => {
    lastEvent = e;
    if (rafId == null) rafId = requestAnimationFrame(update);
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    document.removeEventListener("pointermove", onMove);
    if (rafId != null) cancelAnimationFrame(rafId);
  };
}
