(function () {
  'use strict';
  if (!document.body.classList.contains('home-page')) return;

  const numerals = ['壹','貳','參','肆','伍','陸','柒','捌','玖','拾'];
  const mounts = [];
  document.querySelectorAll('.character-grid').forEach(function (grid) {
    grid.querySelectorAll('.character-card').forEach(function (card, index) {
      if (card.querySelector('.portrait-mount')) return;
      const image = card.querySelector('img');
      if (!image) return;
      // brush-engine may already have mounted the image; keep its frame intact.
      const artwork = image.closest('.brush-portrait') || image;
      const mount = document.createElement('div');
      mount.className = 'portrait-mount';
      artwork.before(mount);
      mount.appendChild(artwork);
      const seal = document.createElement('span');
      seal.className = 'portrait-seal';
      seal.setAttribute('aria-hidden', 'true');
      seal.textContent = numerals[index] || String(index + 1);
      mount.appendChild(seal);
      mounts.push(mount);
    });
  });

  // Pointer-only depth affects the illustration, never the card's text.
  // There is no idle animation loop; simultaneous pointer events share one RAF.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  let pending = null;
  let active = null;
  function reset(mount) {
    if (!mount) return;
    mount.style.removeProperty('--folio-rx');
    mount.style.removeProperty('--folio-ry');
  }
  function cancel() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
    reset(active);
    active = null;
  }
  function apply() {
    frame = 0;
    if (!pending || reduced.matches || !fine.matches) return;
    const data = pending;
    pending = null;
    data.mount.style.setProperty('--folio-rx', data.rx.toFixed(2) + 'deg');
    data.mount.style.setProperty('--folio-ry', data.ry.toFixed(2) + 'deg');
  }
  mounts.forEach(function (mount) {
    mount.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch' || reduced.matches || !fine.matches) return;
      if (active !== mount) { reset(active); active = mount; }
      const box = mount.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - box.left) / box.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - box.top) / box.height - .5));
      pending = { mount: mount, rx: -y * 3, ry: x * 3 };
      if (!frame) frame = window.requestAnimationFrame(apply);
    }, { passive: true });
    mount.addEventListener('pointerleave', function () {
      if (active === mount) cancel();
    });
  });
  reduced.addEventListener('change', cancel);
  fine.addEventListener('change', cancel);
  document.addEventListener('visibilitychange', function () { if (document.hidden) cancel(); });
})();
