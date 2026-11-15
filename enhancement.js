/* EIZEN base helpers: scroll progress, back-to-top, Esc closes editor. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const progress = $('enhanceProgress'), backTop = $('backTop');
  let ticking = false;
  const update = () => {
    ticking = false; const d = document.documentElement, max = d.scrollHeight - d.clientHeight;
    if (progress) progress.style.width = (max > 0 ? d.scrollTop / max * 100 : 0) + '%';
    if (backTop) backTop.classList.toggle('visible', d.scrollTop > 420);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update, { passive: true }); update();
  backTop && backTop.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = $('editModal'); if (m && !m.hidden) m.hidden = true; } });
})();
