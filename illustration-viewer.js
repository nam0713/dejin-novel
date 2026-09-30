(function () {
  'use strict';

  function initializeViewer() {
    // Enhancement is optional: unsupported browsers keep every original image.
    if (typeof HTMLDialogElement === 'undefined' ||
        typeof HTMLDialogElement.prototype.showModal !== 'function' ||
        document.querySelector('[data-illustration-viewer]')) return;

    const figures = document.querySelectorAll('.lore-illustration, .chapter-illustration');
    if (!figures.length) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'ink-art-dialog';
    dialog.setAttribute('data-illustration-viewer', '');
    dialog.setAttribute('aria-label', '삽화 확대');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ink-art-close';
    close.textContent = '닫기 ×';
    close.setAttribute('aria-label', '삽화 확대 닫기');
    close.autofocus = true;

    const enlarged = document.createElement('img');
    enlarged.decoding = 'async';
    const caption = document.createElement('p');
    caption.id = 'illustrationViewerCaption';
    dialog.append(close, enlarged, caption);
    document.body.appendChild(dialog);

    let returnFocus = null;
    let backdropPress = false;

    function outsideDialog(event) {
      const bounds = dialog.getBoundingClientRect();
      return event.clientX < bounds.left || event.clientX > bounds.right ||
             event.clientY < bounds.top || event.clientY > bounds.bottom;
    }

    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('pointerdown', event => {
      backdropPress = event.target === dialog && outsideDialog(event);
    });
    dialog.addEventListener('click', event => {
      if (backdropPress && event.target === dialog && outsideDialog(event)) dialog.close();
      backdropPress = false;
    });
    // Native Escape/cancel also reaches close, so all exit paths restore focus.
    dialog.addEventListener('close', () => {
      enlarged.removeAttribute('src');
      enlarged.alt = '';
      caption.textContent = '';
      backdropPress = false;
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({preventScroll: true});
      returnFocus = null;
    });

    figures.forEach(figure => {
      const image = figure.querySelector('img');
      if (!image || image.closest('a, button')) return;

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'ink-art-trigger';
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-label', (image.alt || '삽화') + ' — 확대 보기');
      image.before(trigger);
      trigger.appendChild(image);

      // Native buttons provide Enter and Space without custom key handlers.
      trigger.addEventListener('click', () => {
        if (dialog.open) return;
        returnFocus = trigger;
        enlarged.src = image.currentSrc || image.src;
        enlarged.alt = image.alt || '확대 삽화';
        const originalCaption = figure.querySelector('figcaption');
        caption.textContent = originalCaption ? originalCaption.textContent.trim() : image.alt;
        caption.hidden = !caption.textContent;
        if (caption.hidden) dialog.removeAttribute('aria-describedby');
        else dialog.setAttribute('aria-describedby', caption.id);
        dialog.showModal();
        close.focus({preventScroll: true});
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeViewer, {once: true});
  } else {
    initializeViewer();
  }
})();
