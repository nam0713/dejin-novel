(function () {
  'use strict';

  const player = document.querySelector('.music-player');
  if (!player) return;
  player.hidden = false;
  const audio = player.querySelector('audio');
  const toggle = player.querySelector('.music-toggle');
  const label = player.querySelector('.music-toggle-label');
  const volume = player.querySelector('input[type="range"]');
  const status = player.querySelector('.music-status');
  const details = player.querySelector('.music-details');
  const settings = details.querySelector('summary');
  const key = player.dataset.musicKey || 'samryu-music';
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(key)) || {}; } catch (_) {}
  const initialVolume = Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.2;
  audio.volume = initialVolume;
  volume.value = String(Math.round(initialVolume * 100));
  volume.setAttribute('aria-valuetext', volume.value + '%');

  function save() {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        volume: audio.volume,
        position: audio.readyState ? audio.currentTime : saved.position || 0,
        playing: !audio.paused
      }));
    } catch (_) {}
  }

  function sync() {
    const playing = !audio.paused;
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? '배경음악 일시정지' : '배경음악 재생');
    label.textContent = playing ? '음악 끄기' : '음악 켜기';
    toggle.title = label.textContent;
    player.classList.toggle('is-playing', playing);
    save();
  }

  async function play() {
    toggle.disabled = true;
    status.textContent = '음악을 불러오는 중입니다.';
    try {
      await audio.play();
      status.textContent = '';
    } catch (error) {
      status.textContent = error.name === 'NotAllowedError'
        ? '음악 켜기를 누르면 이어서 재생됩니다.'
        : '음악을 불러오지 못했습니다. 다시 눌러 주세요.';
    } finally {
      toggle.disabled = false;
      sync();
    }
  }

  audio.addEventListener('loadedmetadata', function () {
    if (Number.isFinite(saved.position) && saved.position > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = saved.position % audio.duration;
    }
    saved.position = 0;
  }, { once: true });
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('error', function () {
    status.textContent = '음악을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요.';
    toggle.disabled = false;
    sync();
  });
  toggle.addEventListener('click', function () {
    if (audio.paused) {
      if (audio.error) audio.load();
      play();
    } else {
      audio.pause();
      status.textContent = '';
    }
  });
  volume.addEventListener('input', function () {
    audio.volume = Number(volume.value) / 100;
    volume.setAttribute('aria-valuetext', volume.value + '%');
    save();
  });
  window.addEventListener('pagehide', save);
  document.addEventListener('click', function (event) {
    if (!player.contains(event.target)) details.open = false;
  });
  player.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && details.open) {
      details.open = false;
      settings.focus();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) save();
  });
  // Only attempt playback after the listener has opted in during this session.
  if (saved.playing === true) play();
})();
