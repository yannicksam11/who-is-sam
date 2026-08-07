document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('lightbox-backdrop');
  const nodeA = document.getElementById('lightbox-prev');
  const nodeB = document.getElementById('lightbox-current');
  const nodeC = document.getElementById('lightbox-next');
  const navPrevEl = document.getElementById('lightbox-nav-prev');
  const navNextEl = document.getElementById('lightbox-nav-next');
  const metaEl = document.getElementById('lightbox-meta');
  const tiles = document.querySelectorAll('.project-item');

  if (!backdrop || !nodeA || !nodeB || !nodeC || !navPrevEl || !navNextEl || !metaEl || !tiles.length) return;

  const PEEK_SCALE = 0.8;
  const PEEK_GAP = 32;
  const STEP_MS = 450;

  let currentProject = null;
  let images = [];
  let index = 0;
  let isAnimating = false;
  let roles = { prev: nodeA, current: nodeB, next: nodeC };
  let currentRect = null;
  let prevRect = null;
  let nextRect = null;

  function imagesFor(project) {
    return [project.titelbild, ...(project.weitereBilder || [])];
  }

  function originRectFor(project) {
    const tile = document.querySelector(`.project-item[data-id="${project.id}"]`);
    const wrap = tile && tile.querySelector('.project-item__image-wrap');
    return wrap ? wrap.getBoundingClientRect() : null;
  }

  function setRect(el, rect) {
    el.style.top = `${rect.top}px`;
    el.style.left = `${rect.left}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  }

  function computeCurrentRect(originRect) {
    const scale = Math.min(
      1.7,
      (window.innerWidth * 0.9) / originRect.width,
      (window.innerHeight * 0.8) / originRect.height
    );
    const width = originRect.width * scale;
    const height = originRect.height * scale;
    return {
      top: (window.innerHeight - height) / 2,
      left: (window.innerWidth - width) / 2,
      width,
      height
    };
  }

  function computePeekRect(rect, side) {
    const width = rect.width * PEEK_SCALE;
    const height = rect.height * PEEK_SCALE;
    const top = rect.top + (rect.height - height) / 2;
    const left = side === 'next'
      ? rect.left + rect.width + PEEK_GAP
      : rect.left - PEEK_GAP - width;
    return { top, left, width, height };
  }

  function positionNavZones() {
    const halfWidth = currentRect.width / 2;
    setRect(navPrevEl, { top: currentRect.top, left: currentRect.left, width: halfWidth, height: currentRect.height });
    setRect(navNextEl, { top: currentRect.top, left: currentRect.left + halfWidth, width: halfWidth, height: currentRect.height });
  }

  function positionMeta() {
    metaEl.style.top = `${currentRect.top + currentRect.height}px`;
    metaEl.style.left = `${currentRect.left}px`;
    metaEl.style.width = `${currentRect.width}px`;
  }

  function updateNavState() {
    navPrevEl.classList.toggle('is-disabled', index === 0);
    navNextEl.classList.toggle('is-disabled', index === images.length - 1);
  }

  function updateMeta() {
    if (!currentProject) return;
    metaEl.innerHTML = `<span class="lightbox__meta-line">${currentProject.projekt}, ${currentProject.massstab}</span><span class="lightbox__meta-line">${currentProject.kunde}</span>`;
  }

  function openLightbox(project) {
    const originRect = originRectFor(project);
    if (!originRect) return;

    currentProject = project;
    images = imagesFor(project);
    index = 0;
    isAnimating = true;
    roles = { prev: nodeA, current: nodeB, next: nodeC };

    currentRect = computeCurrentRect(originRect);
    prevRect = computePeekRect(currentRect, 'prev');
    nextRect = computePeekRect(currentRect, 'next');

    // Hero element starts exactly at the clicked tile's position (no transition yet).
    roles.current.style.transition = 'none';
    setRect(roles.current, originRect);
    roles.current.style.backgroundImage = `url('${images[0]}')`;
    roles.current.style.opacity = '1';

    // Peeks start hidden at their target slots; they fade in once settled.
    [roles.prev, roles.next].forEach((el) => {
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.backgroundImage = '';
    });
    setRect(roles.prev, prevRect);
    setRect(roles.next, nextRect);
    if (images.length > 1) {
      roles.next.style.backgroundImage = `url('${images[1]}')`;
    }

    positionNavZones();
    positionMeta();
    updateNavState();

    metaEl.classList.remove('is-visible');
    updateMeta();

    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Force reflow so transition:none takes effect before re-enabling transitions.
    roles.current.getBoundingClientRect();
    roles.current.style.transition = '';
    roles.prev.style.transition = '';
    roles.next.style.transition = '';

    requestAnimationFrame(() => {
      setRect(roles.current, currentRect);
    });

    roles.current.addEventListener('transitionend', onOpenSettled, { once: true });
  }

  function onOpenSettled() {
    isAnimating = false;
    if (!currentProject) return;
    metaEl.classList.add('is-visible');
    if (images.length > 1) roles.next.style.opacity = '1';
  }

  function step(direction) {
    if (isAnimating || !currentProject) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;

    isAnimating = true;

    const oldPrev = roles.prev;
    const oldCurrent = roles.current;
    const oldNext = roles.next;

    let newPrev;
    let newCurrent;
    let newNext;
    let recycled;

    if (direction === 1) {
      // old current slides left into the prev slot, old next slides into the center.
      newPrev = oldCurrent;
      newCurrent = oldNext;
      recycled = oldPrev;
      newNext = recycled;

      setRect(newPrev, prevRect);
      setRect(newCurrent, currentRect);
    } else {
      // old current slides right into the next slot, old prev slides into the center.
      newNext = oldCurrent;
      newCurrent = oldPrev;
      recycled = oldNext;
      newPrev = recycled;

      setRect(newNext, nextRect);
      setRect(newCurrent, currentRect);
    }

    const recycleIndex = newIndex + direction;
    recycled.style.transition = 'none';
    recycled.style.opacity = '0';
    if (recycleIndex >= 0 && recycleIndex < images.length) {
      recycled.style.backgroundImage = `url('${images[recycleIndex]}')`;
      setRect(recycled, direction === 1 ? nextRect : prevRect);
    } else {
      recycled.style.backgroundImage = '';
    }
    recycled.getBoundingClientRect();
    recycled.style.transition = '';

    requestAnimationFrame(() => {
      if (recycleIndex >= 0 && recycleIndex < images.length) {
        recycled.style.opacity = '1';
      }
    });

    index = newIndex;
    roles = { prev: newPrev, current: newCurrent, next: newNext };
    updateNavState();
    updateMeta();

    window.setTimeout(() => { isAnimating = false; }, STEP_MS);
  }

  function closeLightbox() {
    if (!currentProject || isAnimating) return;
    const originRect = originRectFor(currentProject);
    if (!originRect) return;

    isAnimating = true;
    metaEl.classList.remove('is-visible');

    roles.prev.style.transition = 'none';
    roles.next.style.transition = 'none';
    roles.prev.style.opacity = '0';
    roles.next.style.opacity = '0';

    roles.current.style.backgroundImage = `url('${images[0]}')`;

    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    setRect(roles.current, originRect);

    roles.current.addEventListener('transitionend', onCloseSettled, { once: true });
  }

  function onCloseSettled() {
    isAnimating = false;
    [nodeA, nodeB, nodeC].forEach((el) => {
      el.style.opacity = '0';
      el.style.backgroundImage = '';
    });
    currentProject = null;
    index = 0;
  }

  tiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const id = tile.dataset.id;
      const project = (window.PROJEKTE || []).find((p) => String(p.id) === id);
      if (project) openLightbox(project);
    });
  });

  navPrevEl.addEventListener('click', () => {
    if (!navPrevEl.classList.contains('is-disabled')) step(-1);
  });
  navNextEl.addEventListener('click', () => {
    if (!navNextEl.classList.contains('is-disabled')) step(1);
  });

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeLightbox();
  });
});
