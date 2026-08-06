document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('panel-backdrop');
  const panels = document.querySelectorAll('.site-panel');
  const triggers = document.querySelectorAll('[data-panel]');

  function closePanels() {
    panels.forEach(panel => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
    backdrop.classList.remove('is-open');
  }

  function openPanel(name) {
    const panel = document.getElementById(`panel-${name}`);
    const wasOpen = panel.classList.contains('is-open');
    closePanels();
    if (!wasOpen) {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('is-open');
    }
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => openPanel(trigger.dataset.panel));
  });

  backdrop.addEventListener('click', closePanels);

  const accordionItems = document.querySelectorAll('.panel-accordion__item');

  accordionItems.forEach(item => {
    const header = item.querySelector('.panel-accordion__header');
    const content = item.querySelector('.panel-accordion__content');

    header.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');

      accordionItems.forEach(other => {
        other.classList.remove('is-open');
        other.querySelector('.panel-accordion__header').setAttribute('aria-expanded', 'false');
        other.querySelector('.panel-accordion__content').style.maxHeight = '';
      });

      if (!wasOpen) {
        item.classList.add('is-open');
        header.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = `${content.scrollHeight}px`;
      }
    });
  });
});
