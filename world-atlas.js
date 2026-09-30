/* The codex's actual volumes, each with its own illustration. */
(function () {
  'use strict';
  const archive = document.querySelector('.world-atlas');
  if (!archive) return;
  const records = [
    { name: '천명과 황통', han: '天卷', mark: '天', art: 'emperor-mandate', alt: '백발의 천고일제가 시종들과 궁궐 회랑을 걷는 벽화', caption: '천고일제 독고룡 · 제국의 천명을 세운 군주', text: '대진을 세운 천고일제, 인간세에 남은 천명, 그리고 천도 아래의 천주궁. 제국의 시작과 황통을 잇는 기록입니다.' },
    { name: '조정과 제국', han: '皇卷', mark: '皇', art: 'imperial-court', alt: '문관과 무관, 제관들이 넓은 전각에서 문서와 지도를 검토하는 벽화', caption: '조정의 중추 · 문서와 의례로 움직이는 제국', text: '황제를 보좌하는 조정에서 운하를 따라 번성한 강남까지. 관료와 상인, 무인과 백성이 살아가는 제국의 질서를 담았습니다.' },
    { name: '군대와 무비', han: '武備卷', mark: '兵', art: 'six-armies', alt: '보병과 기병, 수군과 특수 병과가 집결한 대진군의 벽화', caption: '대진의 군세 · 서로 다른 군대가 떠받치는 제국', text: '변경을 지키는 군세와 고수를 포위하는 쇄룡진, 군량을 옮기는 대운하. 거대한 제국을 움직이는 군대와 병참의 기록입니다.' },
    { name: '무림과 강호', han: '江湖卷', mark: '武', art: 'mountain-sect-gate', alt: '구름에 잠긴 산봉우리의 문파 전각과 돌계단, 수련하는 제자들의 벽화', caption: '강호의 산문 · 계보와 무공을 잇는 자리', text: '관의 질서와 겹쳐 살아가는 강호. 사문과 비급, 비무와 명예를 이어 온 문파들, 인간의 한계를 넘어서는 무공을 살펴봅니다.' },
    { name: '요괴와 신수', han: '妖變卷', mark: '靈', art: 'four-guardians-mural', width: 1671, alt: '산수와 구름 사이에 청룡, 백호, 주작과 현무가 함께 있는 벽화', caption: '사신수 · 청룡, 백호, 주작, 현무', text: '산길의 산군부터 인간의 규범 바깥에 사는 요괴, 사신수에 이르기까지. 사람과 비인간의 삶이 맞닿는 세계를 기록합니다.' },
    { name: '이단과 역도', han: '異端卷', mark: '異', art: 'sun-moon-sect', width: 1671, alt: '지하 석실에서 촛불을 사이에 두고 의식을 치르는 일월신교 신도들의 벽화', caption: '일월신교 · 지하에 이어지는 신앙', text: '지하에 이어진 일월신교의 신앙, 남경 성곽을 둘러싼 전쟁, 금지품을 거래하는 골목. 정사의 그늘에 남은 또 다른 질서입니다.' },
    { name: '외번의 나라들', han: '外蕃卷', mark: '境', art: 'haedong-barana', alt: '산악 해안의 해동 왕국과 코끼리가 오가는 바라나의 열대 강변 도시를 나란히 그린 벽화', caption: '해동과 바라나 · 산악의 왕국과 남방의 문명', text: '해동의 산악 왕국과 바라나의 밀림, 동해군도의 항구와 대초원, 천축의 사원. 대진 밖에서 저마다의 삶을 잇는 나라들입니다.' },
    { name: '인물 열전', han: '列傳', mark: '人', art: 'seomun-geol-portrait', alt: '검은 두건과 쌍검 차림으로 천주궁의 깊은 문을 지키는 서문걸의 벽화', caption: '불사투신 서문걸 · 끝나지 않은 군신의 맹약', text: '천주궁의 문을 지키는 서문걸, 대초원의 패왕 우르누이, 금면을 쓴 방랑협객 도월천. 천하에 이름을 남긴 이들의 내력을 담았습니다.' },
    { name: '봉인된 기록', han: '禁匱卷', mark: '禁', art: 'great-wall-secret', alt: '산맥을 따라 뻗은 대장성과 그 아래 붉은 선으로 암시된 지맥의 벽화', caption: '대장성 · 방벽 아래 감추어진 경맥', text: '방벽 아래 감춰진 대장성의 비밀과 혈신대전, 역천귀일의 가설. 정사에 실리지 않은 제국의 가장 깊은 기록을 펼칩니다.' }
  ];
  const nav = archive.querySelector('.archive-index');
  const stage = archive.querySelector('.archive-stage');
  const panel = archive.querySelector('.archive-record');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const status = archive.querySelector('.archive-status');
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  let active = 0, request = 0, running;
  const cache = new Map();
  function prepare(index) {
    if (!cache.has(index)) {
      const record = records[index];
      const image = new Image(record.width || 1672, 941);
      image.alt = record.alt;
      image.decoding = 'async';
      image.src = 'assets/lore/' + record.art + '.png';
      const ready = image.decode().then(() => image);
      cache.set(index, ready);
      ready.catch(() => cache.delete(index));
    }
    return cache.get(index);
  }
  const list = make('div', 'archive-volumes');
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', '로어북 아홉 권');
  list.setAttribute('aria-orientation', 'vertical');
  const buttons = records.map((record, index) => {
    const button = make('button', 'archive-volume');
    button.type = 'button';
    button.id = 'archive-tab-' + (index + 1);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'archive-record');
    button.setAttribute('aria-selected', String(index === 0));
    button.tabIndex = index === 0 ? 0 : -1;
    const ordinal = make('span', 'archive-ordinal', String(index + 1).padStart(2, '0'));
    ordinal.setAttribute('aria-hidden', 'true');
    button.append(ordinal, make('span', 'archive-volume-name', record.name));
    button.addEventListener('click', () => select(index));
    // Manual activation: arrow keys move focus, Enter or Space opens the volume.
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % records.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + records.length - 1) % records.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = records.length - 1;
      else return;
      event.preventDefault();
      buttons.forEach((tab, i) => { tab.tabIndex = i === next ? 0 : -1; });
      buttons[next].focus({ preventScroll: true });
    });
    button.addEventListener('pointerenter', () => { prepare(index).catch(() => {}); });
    button.addEventListener('focus', () => { prepare(index).catch(() => {}); });
    list.append(button);
    return button;
  });
  nav.append(list);
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', buttons[0].id);
  panel.tabIndex = 0;
  archive.classList.add('archive-ready');
  async function select(index) {
    const token = ++request;
    buttons.forEach(button => button.classList.remove('is-pending'));
    list.removeAttribute('aria-busy');
    status.textContent = '';
    if (index === active) return;
    buttons[index].classList.add('is-pending');
    list.setAttribute('aria-busy', 'true');
    try {
      const source = await prepare(index);
      if (token !== request) return;
      if (running) {
        running.finish();
        Array.from(stage.querySelectorAll('img')).slice(0, -1).forEach(image => image.remove());
      }
      const previous = stage.querySelector('img');
      const incoming = source.cloneNode();
      stage.append(incoming);
      const record = records[index];
      active = index;
      buttons.forEach((button, i) => {
        button.classList.remove('is-pending');
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', buttons[index].id);
      panel.querySelector('.archive-folio').textContent = '제' + (index + 1) + '권 · ' + record.han;
      panel.querySelector('h3').textContent = record.name;
      panel.querySelector('.archive-excerpt').textContent = record.text;
      panel.querySelector('.archive-seal').textContent = record.mark;
      panel.querySelector('.archive-caption').textContent = record.caption;
      panel.querySelector('.archive-link').href = 'lore.html#vol-' + (index + 1);
      panel.querySelector('.archive-link-label').textContent = '제' + (index + 1) + '권 읽기';
      list.removeAttribute('aria-busy');
      status.textContent = record.name + ' 펼침';
      if (reduced.matches || !incoming.animate) { previous.remove(); return; }
      // Keep the old painting underneath until the decoded new one is visible.
      running = incoming.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 480, easing: 'ease-out' });
      const animation = running;
      animation.finished.then(() => {
        previous.remove();
        if (running === animation) running = null;
      }).catch(() => {});
    } catch (_) {
      if (token !== request) return;
      buttons[index].classList.remove('is-pending');
      list.removeAttribute('aria-busy');
      status.textContent = '삽화를 불러오지 못했습니다. 다시 선택해 주세요.';
    }
  }
  reduced.addEventListener('change', () => { if (reduced.matches && running) running.finish(); });
})();
