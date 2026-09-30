(function () {
  'use strict';
  const input = document.getElementById('loreSearch');
  const clear = document.getElementById('clearSearch');
  const status = document.getElementById('searchStatus');
  const empty = document.getElementById('searchEmpty');
  const index = document.querySelector('.lore-index');
  const volumes = Array.from(document.querySelectorAll('.lore-volume'));
  const links = Array.from(document.querySelectorAll('.lore-index a'));
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
  const entries = Array.from(document.querySelectorAll('.lore-entry')).map(element => ({
    element,
    text: normalize(element.querySelector('.lore-entry-heading').textContent + element.querySelector('.lore-prose').textContent)
  }));
  const mobile = window.matchMedia('(max-width: 760px)');

  document.querySelector('.lore-search').hidden = false;
  function syncIndex() { index.open = !mobile.matches; }
  syncIndex();
  mobile.addEventListener('change', syncIndex);

  function search() {
    const query = normalize(input.value.trim());
    let count = 0;
    entries.forEach(({element, text}) => {
      element.hidden = !!query && !text.includes(query);
      if (!element.hidden) count++;
    });
    volumes.forEach(volume => {
      volume.hidden = !Array.from(volume.querySelectorAll('.lore-entry')).some(entry => !entry.hidden);
    });
    clear.hidden = !input.value;
    empty.hidden = count !== 0;
    status.textContent = query ? count + '개 항목을 찾았습니다.' : '전체 ' + entries.length + '개 항목';
    updateCurrent();
  }
  function resetSearch() { input.value = ''; search(); }
  input.addEventListener('input', search);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); resetSearch(); }
  });
  clear.addEventListener('click', () => { resetSearch(); input.focus(); });
  document.getElementById('showAll').addEventListener('click', () => { resetSearch(); input.focus(); });
  // Record navigation is explicit: browsers do not always restore deep fragments
  // when this long document is opened inside an embedded browser.
  function recordTarget(hash) {
    if (!hash || hash === '#') return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return null; }
    const target = document.getElementById(id);
    return target && target.closest('.lore-volume') ? target : null;
  }
  function revealRecord(target) {
    if (input.value) resetSearch();
    if (mobile.matches) index.open = false;
    target.scrollIntoView({behavior: 'instant', block: 'start', inline: 'nearest'});
    updateCurrent();
  }

  const initialHash = location.hash;
  const initialFrames = new Set();
  let initialCorrection = false;
  function cancelInitialCorrection() {
    initialCorrection = false;
    initialFrames.forEach(frame => cancelAnimationFrame(frame));
    initialFrames.clear();
    window.removeEventListener('wheel', cancelInitialCorrection);
    window.removeEventListener('touchstart', cancelInitialCorrection);
    window.removeEventListener('pointerdown', cancelInitialCorrection);
    document.removeEventListener('input', cancelInitialCorrection);
    window.removeEventListener('keydown', cancelOnScrollKey);
  }
  function cancelOnScrollKey(event) {
    const field = event.target;
    if (field && (field.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName))) return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'].includes(event.key)) cancelInitialCorrection();
  }
  function scheduleInitialCorrection(finalPass) {
    if (!initialCorrection) return;
    const frame = requestAnimationFrame(() => {
      initialFrames.delete(frame);
      if (!initialCorrection || location.hash !== initialHash) {
        cancelInitialCorrection();
        return;
      }
      const target = recordTarget(initialHash);
      if (target) revealRecord(target);
      if (finalPass || !target) cancelInitialCorrection();
    });
    initialFrames.add(frame);
  }
  function restoreInitialRecord() {
    if (!recordTarget(initialHash) || location.hash !== initialHash) return;
    initialCorrection = true;
    window.addEventListener('wheel', cancelInitialCorrection, {passive: true});
    window.addEventListener('touchstart', cancelInitialCorrection, {passive: true});
    window.addEventListener('pointerdown', cancelInitialCorrection, {passive: true});
    document.addEventListener('input', cancelInitialCorrection);
    window.addEventListener('keydown', cancelOnScrollKey);
    scheduleInitialCorrection(false);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => scheduleInitialCorrection(true), () => scheduleInitialCorrection(true));
    } else scheduleInitialCorrection(true);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search) return;
    const target = recordTarget(destination.hash);
    if (!target) return;
    event.preventDefault();
    cancelInitialCorrection();
    if (location.hash !== destination.hash) history.pushState(null, '', destination.hash);
    revealRecord(target);
  });
  window.addEventListener('hashchange', () => {
    cancelInitialCorrection();
    const target = recordTarget(location.hash);
    if (target) revealRecord(target);
  });
  function updateCurrent() {
    const visible = volumes.filter(volume => !volume.hidden);
    let current = visible[0];
    for (const volume of visible) {
      if (volume.getBoundingClientRect().top <= 140) current = volume;
    }
    links.forEach(link => {
      if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let framePending = false;
  window.addEventListener('scroll', () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => { updateCurrent(); framePending = false; });
  }, {passive: true});
  search();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreInitialRecord, {once: true});
  else restoreInitialRecord();
})();
