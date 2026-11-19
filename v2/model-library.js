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
  let assets = [];
  let loading = false;

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
      const name = document.createElement('strong');
      name.textContent = asset.path.split('/').at(-1);
      const folder = document.createElement('small');
      folder.textContent = asset.path.slice(collection.length + 1).split('/').slice(0, -1).join(' / ');
      button.append(name);
      if (folder.textContent) button.append(folder);
      button.addEventListener('click', () => {
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
          return importModel(files, paths);
        });
      });
      group.append(button);
    }
    status.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? 'model' : 'models'}`
      : query ? 'No models match your search.' : 'No models were found.';
  }

  search.addEventListener('input', () => { if (!loading) renderResults(); });
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
    if (loading) return;
    loading = true;
    search.value = '';
    results.replaceChildren();
    results.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading your asset library…';
    try {
      const response = await fetch(new URL('catalog.json', endpoint), { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error();
      ({ assets } = await response.json());
      renderResults();
    } catch {
      assets = [];
      status.textContent = 'The asset library is unavailable. You can still browse device files.';
    } finally {
      loading = false;
      results.setAttribute('aria-busy', 'false');
    }
  });
}
