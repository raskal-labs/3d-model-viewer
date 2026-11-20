// A private installation can supply the same rune pack as its icon maker.
const config = document.querySelector('meta[name="icon-runes"]')?.content;

async function loadRunes() {
  if (!config) return {};
  try {
    const url = new URL(config, location.href);
    if (url.origin !== location.origin) return {};
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return {};
    const entries = Object.entries(await response.json());
    return Object.fromEntries(entries.filter(([id, item]) =>
      /^[a-z0-9-]+$/.test(id) && typeof item?.label === 'string' &&
      typeof item.markup === 'string' && typeof item.viewBox === 'string' &&
      /^[-\d. ]+$/.test(item.viewBox)));
  } catch {
    return {};
  }
}

export const iconRunes = await loadRunes();

export function runeSvg(id) {
  const { markup, viewBox } = iconRunes[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="${viewBox}">${markup}</svg>`;
}
