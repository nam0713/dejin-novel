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
  links.forEach(link => link.addEventListener('click', () => {
    resetSearch();
    if (mobile.matches) index.open = false;
  }));
  window.addEventListener('hashchange', () => {
    const target = document.getElementById(location.hash.slice(1));
    if (!target || !target.closest('.lore-volume')) return;
    if (input.value) { resetSearch(); target.scrollIntoView(); }
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
})();
