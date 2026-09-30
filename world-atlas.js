/* A painting opens five records. Marker positions are compositional, not a map. */
(function () {
  'use strict';
  const section = document.querySelector('.home-page #lore');
  const painting = section && section.querySelector('.landscape');
  const image = painting && painting.querySelector('img');
  if (!painting || !image || section.querySelector('.world-atlas')) return;

  const records = [
    { name: '대진국', mark: '國', volume: '권수 · 황제의 조서', title: '천명의 그늘 아래', text: '강산과 백성을 거느린 오래된 제국. 조정의 질서 너머에는 북방에 남은 혈신의 잔향과 남방의 사교, 강호의 무리와 요족의 삶이 이어진다.', href: 'lore.html#page-2', x: 55, y: 43, camera: [-1, 1] },
    { name: '천주궁', mark: '宮', volume: '제1권 · 천명과 황통', title: '천도 아래의 궁궐', text: '지상의 궁궐보다 크고 오래된 지하의 전각. 궁전이자 신전, 영묘이자 봉인장치인 이곳의 가장 깊은 문은 불사투신 서문걸이 지킨다.', href: 'lore.html#page-7', x: 80, y: 71, camera: [-2, -1] },
    { name: '강호', mark: '武', volume: '제4권 · 무림과 강호', title: '두 질서가 겹치는 곳', text: '강호는 국가 바깥이 아니다. 관이 토지와 세금, 호적을 다스리는 사이, 무림은 사문과 비급, 복수와 비무, 명예를 다스린다.', href: 'lore.html#page-16', x: 14, y: 54, camera: [2, 0] },
    { name: '대운하', mark: '運', volume: '제3권 · 군대와 무비', title: '제국을 먹이는 물길', text: '강남의 곡물은 대운하를 따라 북부전선과 천도로 향한다. 대진의 강함을 떠받치는 것은 수십만 병사를 굶기지 않고 움직이게 하는 제도다.', href: 'lore.html#page-15', x: 41, y: 80, camera: [1, -1] },
    { name: '대초원', mark: '原', volume: '제7권 · 외번의 나라들', title: '전쟁과 무역이 오가는 길', text: '무극혈신 우르누이의 통일제국이 무너진 뒤, 초원은 수많은 칸국과 부족연맹으로 갈라졌다. 대진과 초원 사이의 같은 길로 전쟁과 무역이 번갈아 지나간다.', href: 'lore.html#great-steppe', x: 72, y: 17, camera: [-1, 2] }
  ];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const atlas = make('div', 'world-atlas');
  const art = make('div', 'atlas-art');
  const markers = make('div', 'atlas-markers');
  markers.setAttribute('role', 'group');
  markers.setAttribute('aria-label', '산수화 속 세계관 기록 선택');
  const mist = make('div', 'atlas-mist');
  mist.setAttribute('aria-hidden', 'true');
  const panel = make('aside', 'atlas-panel');
  panel.setAttribute('aria-label', '선택한 세계관 기록');
  const folio = make('p', 'atlas-folio');
  const name = make('h3', 'atlas-name');
  const rule = make('div', 'atlas-rule');
  rule.setAttribute('aria-hidden', 'true');
  const title = make('p', 'atlas-title');
  const excerpt = make('p', 'atlas-excerpt');
  const link = make('a', 'atlas-link');
  const mark = make('span', 'atlas-mark');
  mark.setAttribute('aria-hidden', 'true');
  const live = make('span', 'atlas-sr');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  const hint = make('p', 'atlas-hint', '산수화 속 표식을 골라 기록을 펼쳐 보세요.');
  const caption = painting.querySelector('figcaption');
  let active = -1;
  let inkAnimation;

  const buttons = records.map((record, index) => {
    const button = make('button', 'atlas-pin');
    button.type = 'button';
    button.style.setProperty('--pin-x', record.x + '%');
    button.style.setProperty('--pin-y', record.y + '%');
    button.setAttribute('aria-label', record.name + ' 기록 선택');
    button.setAttribute('aria-controls', 'atlas-record');
    button.setAttribute('aria-pressed', 'false');
    const seal = make('span', 'atlas-pin-seal', String(index + 1).padStart(2, '0'));
    seal.setAttribute('aria-hidden', 'true');
    const label = make('span', 'atlas-pin-label', record.name);
    if (record.x > 65) button.classList.add('atlas-pin-left');
    button.append(seal, label);
    button.addEventListener('click', () => select(index, true));
    button.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % records.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + records.length - 1) % records.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = records.length - 1;
      else return;
      event.preventDefault();
      buttons[next].focus();
      select(next, true);
    });
    markers.appendChild(button);
    return button;
  });

  function select(index, announce) {
    if (index === active) return;
    active = index;
    const record = records[index];
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.classList.toggle('is-selected', i === index);
    });
    folio.textContent = record.volume;
    name.textContent = record.name;
    title.textContent = record.title;
    excerpt.textContent = record.text;
    mark.textContent = record.mark;
    link.href = record.href;
    link.textContent = record.name + ' 기록 읽기';
    const arrow = make('span', '', '→');
    arrow.setAttribute('aria-hidden', 'true');
    link.appendChild(arrow);
    art.style.setProperty('--atlas-scale', index === 0 ? '1.07' : '1.19');
    art.style.setProperty('--atlas-x', record.camera[0] * (index === 0 ? 1 : 2) + '%');
    art.style.setProperty('--atlas-y', record.camera[1] * (index === 0 ? 1 : 2) + '%');
    if (announce) {
      live.textContent = record.name + ' — ' + record.title;
      if (!reduced.matches && rule.animate) {
        if (inkAnimation) inkAnimation.cancel();
        inkAnimation = rule.animate([{ transform: 'scaleX(.06)' }, { transform: 'scaleX(1)' }], { duration: 850, easing: 'cubic-bezier(.2,.7,.3,1)' });
      }
    }
  }

  panel.id = 'atlas-record';
  panel.append(mark, folio, name, rule, title, excerpt, link, live);
  painting.before(atlas);
  atlas.append(painting, panel);
  painting.prepend(art);
  art.append(image, mist, markers);
  if (caption) {
    caption.replaceChildren(make('span', '', '천고의 산하'), make('span', '', '회화 속 기록 탐색'));
  }
  painting.appendChild(hint);
  atlas.classList.add('atlas-ready');
  select(0, false);

  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      atlas.classList.toggle('atlas-visible', entries.some(entry => entry.isIntersecting));
    }, { threshold: .05 });
    visibility.observe(atlas);
  } else atlas.classList.add('atlas-visible');
  document.addEventListener('visibilitychange', () => atlas.classList.toggle('atlas-sleeping', document.hidden));
  reduced.addEventListener('change', () => { if (reduced.matches && inkAnimation) inkAnimation.cancel(); });
})();
