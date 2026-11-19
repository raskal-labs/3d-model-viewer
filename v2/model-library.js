const $ = id => document.getElementById(id);

export function installModelPicker(fileInput, openAsset, importModel) {
  const openButton = $('open-model');
  const setting = document.querySelector('meta[name="model-library"]')?.content.trim();
  let endpoint;
  try { if (setting) endpoint = new URL(setting, location.href); } catch {}
  if (!endpoint || endpoint.origin !== location.origin || !endpoint.pathname.endsWith('/')) {
    openButton.addEventListener('click', () => fileInput.click());
    return;
  }

  const dialog = $('model-picker');
  const search = $('library-search');
  const results = $('library-results');
  const status = $('library-status');
  const quick = $('library-quick');
  const rail = $('library-rail');
  const modes = [...quick.querySelectorAll('[data-mode]')];
  const previous = $('library-prev');
  const next = $('library-next');
  const full = $('library-full');
  const toggle = $('library-toggle');
  let assets = [];
  let loading = false;
  let failed = false;
  let mode = 'recent';
  let collection = '';
  let currentAsset = '';

  function chooseAsset(asset) {
    dialog.close();
    openAsset(async signal => {
      const base = new URL(`assets/${encodeURIComponent(asset.id)}/`, endpoint);
      const response = await fetch(new URL('bundle.json', base), { signal });
      if (!response.ok) throw new Error('This model or a required sidecar is unavailable.');
      const { files: parts } = await response.json();
      const files = [];
      const paths = new Map();
      for (const [index, part] of parts.entries()) {
        const resource = await fetch(new URL(String(index), base), { signal });
        if (!resource.ok) throw new Error('An asset changed or went offline. Try opening it again.');
        const file = new File([await resource.blob()], part.path.split('/').at(-1));
        files.push(file);
        paths.set(file, part.path);
      }
      const model = await importModel(files, paths);
      currentAsset = asset.id;
      return model;
    });
  }

  function modelPreview(asset) {
    const preview = document.createElement('span');
    preview.className = 'library-preview';
    preview.setAttribute('aria-hidden', 'true');
    if (asset.preview) {
      const img = new Image();
      img.alt = '';
      img.loading = 'lazy';
      img.src = new URL(`assets/${encodeURIComponent(asset.id)}/thumbnail.png`, endpoint);
      img.addEventListener('error', () => img.remove(), { once: true });
      preview.append(img);
    }
    return preview;
  }

  function modelCard(asset, select = () => chooseAsset(asset)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-card';
    button.title = asset.path;
    const name = document.createElement('strong');
    name.textContent = asset.path.split('/').at(-1).replace(/\.[^.]+$/, '');
    const folder = document.createElement('small');
    folder.textContent = asset.path.split('/')[0];
    button.append(modelPreview(asset), name, folder);
    button.addEventListener('click', select);
    return button;
  }

  function updateArrows() {
    previous.disabled = rail.scrollLeft < 2;
    next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  }

  function renderQuick() {
    rail.replaceChildren();
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    if (loading || failed) {
      updateArrows();
      return;
    }
    let models = assets;
    if (mode === 'collections') {
      if (collection) {
        models = assets.filter(asset => asset.path.split('/')[0] === collection);
      } else {
        const collections = new Map();
        for (const asset of assets) {
          const name = asset.path.split('/')[0];
          if (!collections.has(name)) collections.set(name, []);
          collections.get(name).push(asset);
        }
        for (const [name, entries] of collections) {
          const button = modelCard(entries.find(asset => asset.preview) || entries[0], () => {
            collection = name;
            renderQuick();
          });
          // Collection cards use a representative model but open the collection.
          button.querySelector('strong').textContent = name;
          button.querySelector('small').textContent = `${entries.length} models`;
          button.title = name;
          rail.append(button);
        }
        status.textContent = collections.size ? 'Choose a collection' : 'No models were found.';
        rail.scrollLeft = 0;
        updateArrows();
        return;
      }
    } else if (mode === 'recent') {
      models = [...assets].sort((a, b) => Number(b.id === currentAsset) - Number(a.id === currentAsset) ||
        (b.modified || 0) - (a.modified || 0)).slice(0, 16);
    }
    rail.append(...models.map(asset => modelCard(asset)));
    status.textContent = models.length ? collection || `${models.length} models` : 'No models were found.';
    rail.scrollLeft = 0;
    updateArrows();
  }

  function setMode(value) {
    mode = value;
    collection = '';
    renderQuick();
  }

  function stepRail(direction) {
    const card = rail.firstElementChild;
    if (card) {
      const step = card.offsetWidth + parseFloat(getComputedStyle(rail).columnGap);
      rail.scrollBy({
        left: direction * step,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }

  for (const button of modes) button.addEventListener('click', () => setMode(button.dataset.mode));
  previous.addEventListener('click', () => stepRail(-1));
  next.addEventListener('click', () => stepRail(1));
  rail.addEventListener('scroll', updateArrows, { passive: true });
  new ResizeObserver(updateArrows).observe(rail);
  rail.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const sibling = event.key === 'ArrowRight' ? event.target.nextElementSibling : event.target.previousElementSibling;
    if (sibling) {
      event.preventDefault();
      sibling.focus();
    }
  });

  let swipe;
  let suppressClick = false;
  rail.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: rail.scrollLeft };
    suppressClick = false;
  });
  rail.addEventListener('pointermove', event => {
    if (event.pointerId !== swipe?.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (event.pointerType === 'mouse' && (rail.hasPointerCapture(event.pointerId) ||
        (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)))) {
      rail.setPointerCapture(event.pointerId);
      rail.toggleAttribute('data-dragging', true);
      rail.scrollLeft = swipe.scroll - dx;
      suppressClick = true;
    }
  });
  function endSwipe(event) {
    if (event.pointerId !== swipe?.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    rail.removeAttribute('data-dragging');
    if (event.type === 'pointercancel') return;
    if (event.pointerType !== 'mouse' && Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx) * 1.3) {
      suppressClick = true;
      const index = modes.findIndex(button => button.dataset.mode === mode);
      setMode(modes[(index + (dy < 0 ? 1 : modes.length - 1)) % modes.length].dataset.mode);
    }
  }
  rail.addEventListener('pointerup', endSwipe);
  rail.addEventListener('pointercancel', endSwipe);
  rail.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);

  function showFull(show) {
    quick.hidden = show;
    full.hidden = !show;
    toggle.textContent = show ? 'Quick view' : 'Full library';
    if (loading || failed) return;
    if (show) renderResults();
    else renderQuick();
  }

  toggle.addEventListener('click', () => showFull(full.hidden));

  function renderResults() {
    const query = search.value.toLocaleLowerCase().trim();
    const matches = assets.filter(asset => asset.path.toLocaleLowerCase().includes(query));
    results.replaceChildren();
    let current = '';
    let group;
    for (const asset of matches) {
      const collection = asset.path.split('/')[0];
      if (current !== collection) {
        current = collection;
        group = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = collection;
        group.append(heading);
        results.append(group);
      }
      const button = document.createElement('button');
      button.type = 'button';
      const label = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = asset.path.split('/').at(-1);
      const folder = document.createElement('small');
      folder.textContent = asset.path.slice(collection.length + 1).split('/').slice(0, -1).join(' / ');
      label.append(name);
      if (folder.textContent) label.append(folder);
      button.append(modelPreview(asset), label);
      button.addEventListener('click', () => chooseAsset(asset));
      group.append(button);
    }
    status.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? 'model' : 'models'}`
      : query ? 'No models match your search.' : 'No models were found.';
  }

  search.addEventListener('input', () => { if (!loading && !failed) renderResults(); });
  $('choose-device').addEventListener('click', () => {
    dialog.close();
    fileInput.click();
  });
  $('close-picker').addEventListener('click', () => dialog.close());
  let pressedBackdrop = false;
  function isBackdrop(event) {
    if (event.target !== dialog) return false;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
  }
  dialog.addEventListener('pointerdown', event => { pressedBackdrop = isBackdrop(event); });
  dialog.addEventListener('pointercancel', () => { pressedBackdrop = false; });
  dialog.addEventListener('click', event => {
    if (pressedBackdrop && isBackdrop(event)) dialog.close();
    pressedBackdrop = false;
  });
  dialog.addEventListener('close', () => {
    pressedBackdrop = false;
    openButton.focus();
  });
  openButton.addEventListener('click', async () => {
    if (!dialog.open) dialog.showModal();
    const alreadyLoading = loading;
    loading = true;
    failed = false;
    mode = 'recent';
    collection = '';
    search.value = '';
    results.replaceChildren();
    rail.replaceChildren();
    showFull(false);
    updateArrows();
    status.textContent = 'Loading your asset library…';
    if (alreadyLoading) return;
    try {
      const response = await fetch(new URL('catalog.json', endpoint), { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error();
      ({ assets } = await response.json());
    } catch {
      assets = [];
      failed = true;
      status.textContent = 'The asset library is unavailable. You can still browse device files.';
    } finally {
      loading = false;
      showFull(!full.hidden);
    }
  });
}
