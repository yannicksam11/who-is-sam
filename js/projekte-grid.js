document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('project-grid');
  if (!grid) return;

  const FORMAT_CLASS = {
    quer: 'project-item__image-wrap--landscape',
    hoch: 'project-item__image-wrap--portrait',
    quadrat: 'project-item__image-wrap--square'
  };

  const projekte = window.PROJEKTE || [];

  grid.innerHTML = projekte.map((projekt) => {
    const formatClass = FORMAT_CLASS[projekt.format] || FORMAT_CLASS.quer;
    const bgStyle = projekt.titelbild ? ` style="background-image: url('${projekt.titelbild}');"` : '';

    return `
      <button type="button" class="project-item" data-id="${projekt.id}">
        <div class="project-item__image-wrap ${formatClass}">
          <div class="project-item__placeholder"${bgStyle}></div>
          <div class="project-item__hover-overlay">
            <span class="project-item__title">${projekt.projekt}</span>
          </div>
        </div>
      </button>
    `;
  }).join('');
});
