import * as THREE from 'three';
import { iconRunes, runeSvg } from './icon-runes.js';

const $ = id => document.getElementById(id);
const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const swatch = colour => '#' + colour.getHexString();
const prefix = 'model-studio-appearance-v1:';

export function readAppearance(key) {
  try {
    const value = JSON.parse(localStorage.getItem(prefix + key));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function writeAppearance(key, value) {
  try {
    if (Object.keys(value).length) localStorage.setItem(prefix + key, JSON.stringify(value));
    else localStorage.removeItem(prefix + key);
  } catch {
    // Settings still apply for this session when browser storage is unavailable.
  }
}

function appearanceParts(root) {
  const body = new Set(), accents = new Set(), helmet = new Set();
  const surfaces = [], originalGlyphs = [];
  let info;
  root.traverse(object => {
    const data = object.userData;
    if (data.category && data.runeColour || data.role === 'stone-body') info = data;
    if (data.role === 'emissive-glyph' || /^(?:Glyph|Emissive.rune)/i.test(object.name)) {
      originalGlyphs.push(object);
    }
  });
  const stone = Boolean(info || originalGlyphs.length);
  function visit(object) {
    if (originalGlyphs.includes(object)) return;
    if (object.isMesh) {
      if (stone) surfaces.push(object);
      for (const mat of [object.material].flat()) {
        if (!mat?.color) continue;
        if (stone || /^(?:Rose coral|Chief coral)/.test(mat.name)) body.add(mat);
        if (/^(?:Pool blue|Chief turquoise)/.test(mat.name)) accents.add(mat);
        if (/^Hard hat/.test(mat.name)) helmet.add(mat);
      }
    }
    for (const child of object.children) visit(child);
  }
  visit(root);
  return { body, accents, helmet, surfaces, originalGlyphs, info: info || {}, stone };
}

function materialControl(materials, reference) {
  const main = [...materials].find(mat => /face$|heart$|crown$/.test(mat.name)) || [...materials][0];
  if (!main) return null;
  const native = hex(reference) ? reference : swatch(main.color);
  const space = THREE.SRGBColorSpace;
  const basis = new THREE.Color(native).getHSL({}, space);
  const originals = [...materials].map(mat => ({
    mat, colour: mat.color.clone(), hsl: mat.color.getHSL({}, space),
    emissive: mat.emissive?.clone(), attenuation: mat.attenuationColor?.clone(),
  }));
  return { native, apply(value) {
    if (!hex(value)) {
      for (const { mat, colour, emissive, attenuation } of originals) {
        mat.color.copy(colour);
        if (emissive) mat.emissive.copy(emissive);
        if (attenuation) mat.attenuationColor.copy(attenuation);
      }
      return;
    }
    const target = new THREE.Color(value).getHSL({}, space);
    const clip = THREE.MathUtils.clamp;
    for (const { mat, hsl, emissive, attenuation } of originals) {
      mat.color.setHSL(target.h,
        clip(target.s + (hsl.s - basis.s) * .28, 0, 1),
        clip(target.l + hsl.l - basis.l, .025, .985), space);
      if (emissive?.getHex()) mat.emissive.copy(mat.color).multiplyScalar(emissive.getHSL({}).l);
      if (attenuation) mat.attenuationColor.copy(mat.color).lerp(attenuation, .12);
    }
  } };
}

function savedRune(info, originalGlyphs) {
  const native = info.rune || originalGlyphs[0]?.userData.glyph;
  const equivalent = {
    snowflake: 'interlock1', 'triple-triangle': 'interlock1', hexagram: 'interlock2',
    'eighth-note': 'eighth', 'beamed-notes': 'beamed', triangle: 'interlock1',
    'wave-triangle': 'interlock4', 'sine-triangle': 'interlock5', 'double-lightning': 'silvratik',
  }[native];
  return guideRune(native) || guideRune(equivalent) ||
    guideRune(/^stave-[01]$/.test(native) ? 'silvratik' : 'interlock1') ||
    Object.keys(iconRunes)[0];
}

const guideRune = name => Object.hasOwn(iconRunes, name) ? name : undefined;

function makeRune(root, surfaces, originalGlyphs, rerender) {
  const bounds = surfaces.reduce((all, object) => all.union(new THREE.Box3().setFromObject(object, true)), new THREE.Box3());
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (originalGlyphs.length) {
    const glyph = new THREE.Box3().setFromObject(originalGlyphs[0]);
    if (!glyph.isEmpty()) {
      const hint = glyph.getCenter(new THREE.Vector3());
      center.x = THREE.MathUtils.clamp(hint.x, center.x - size.x * .12, center.x + size.x * .12);
      center.y = THREE.MathUtils.clamp(hint.y, center.y - size.y * .22, center.y + size.y * .22);
    }
  }
  const material = new THREE.MeshBasicMaterial({
    transparent: true, alphaTest: .06, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  const overlay = new THREE.Mesh(new THREE.BufferGeometry(), material);
  overlay.renderOrder = 8;
  overlay.userData.modelRune = true;
  overlay.name = 'Custom rune';
  root.add(overlay);
  for (const previous of originalGlyphs) previous.visible = false;
  const ray = new THREE.Raycaster();
  const direction = new THREE.Vector3(0, 0, -1);
  const cursor = new THREE.Vector3();
  const loader = new THREE.TextureLoader();
  let selected, currentSize, enabled, ready;

  function project(scale) {
    // Project a tessellated patch from the front so the stroke follows the facets.
    const length = Math.min(size.x * .55, size.y * .42) * scale / 100;
    const divs = 28, stride = divs + 1;
    const positions = [], uv = [], indices = [], hits = [];
    root.updateWorldMatrix(true, true);
    for (let y = 0; y <= divs; y++) {
      for (let x = 0; x <= divs; x++) {
        const u = x / divs, v = y / divs;
        cursor.set(center.x + (u - .5) * length, center.y + (v - .5) * length, bounds.max.z + 1);
        ray.set(cursor, direction);
        const hit = ray.intersectObjects(surfaces, false)[0];
        hits.push(hit?.point.z);
        if (hit) {
          hit.point.z += .009;
          positions.push(...root.worldToLocal(hit.point).toArray());
        } else positions.push(0, 0, 0);
        uv.push(u, v);
      }
    }
    function face(a, b, c) {
      if ([hits[a], hits[b], hits[c]].every(Number.isFinite) &&
          Math.max(hits[a], hits[b], hits[c]) - Math.min(hits[a], hits[b], hits[c]) < length * .22) {
        indices.push(a, b, c);
      }
    }
    for (let row = 0; row < divs; row++) {
      for (let col = 0; col < divs; col++) {
        const i = row * stride + col;
        face(i, i + 1, i + stride);
        face(i + 1, i + stride + 1, i + stride);
      }
    }
    overlay.geometry.dispose();
    overlay.geometry = new THREE.BufferGeometry();
    overlay.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    overlay.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    overlay.geometry.setIndex(indices);
  }

  return { apply(rune, colour, scale) {
    enabled = rune !== 'none';
    overlay.visible = enabled && ready;
    if (!enabled) return;
    if (currentSize !== scale) {
      project(scale);
      currentSize = scale;
    }
    if (selected !== rune) {
      material.map?.dispose();
      ready = false;
      overlay.visible = false;
      material.map = loader.load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(runeSvg(rune)), map => {
        if (material.map !== map || !overlay.parent) return;
        ready = true;
        overlay.visible = enabled;
        rerender();
      });
      material.map.colorSpace = THREE.SRGBColorSpace;
      material.needsUpdate = true;
      selected = rune;
    }
    material.color.set(colour);
  } };
}

export function createModelCustomization(update, rerender) {
  const panel = $('model-customization');
  const select = $('model-rune');
  select.add(new Option('None', 'none'));
  for (const [key, value] of Object.entries(iconRunes)) select.add(new Option(value.label, key));
  const fields = {
    body: $('model-body-colour'), accents: $('model-accent-colour'), helmet: $('model-helmet-colour'),
    rune: select, runeColour: $('model-rune-colour'), size: $('model-rune-size'),
  };
  let active;
  function apply() {
    active.body.apply(active.values.body);
    active.accents?.apply(active.values.accents);
    active.helmet?.apply(active.values.helmet);
    active.glyph?.apply(active.values.rune || active.native.rune, active.values.runeColour || active.native.runeColour,
      active.values.size || active.native.size);
    update();
  }
  for (const [name, field] of Object.entries(fields)) {
    field.addEventListener('input', () => {
      if (!active) return;
      active.values[name] = name === 'size' ? Number(field.value) : field.value;
      writeAppearance(active.key, active.values);
      apply();
    });
  }
  function refreshFields() {
    for (const [name, field] of Object.entries(fields)) {
      if (active.native[name] != null) field.value = active.values[name] ?? active.native[name];
    }
  }
  $('model-customization-reset').addEventListener('click', () => {
    if (!active) return;
    active.values = {};
    writeAppearance(active.key, active.values);
    refreshFields();
    apply();
  });
  return asset => {
    active = null;
    const parts = appearanceParts(asset.root);
    panel.hidden = parts.body.size === 0;
    if (panel.hidden) return;
    const body = materialControl(parts.body, parts.info.body);
    const accents = materialControl(parts.accents);
    const helmet = materialControl(parts.helmet);
    const native = {
      body: body.native, accents: accents?.native, helmet: helmet?.native,
      rune: savedRune(parts.info, parts.originalGlyphs),
      runeColour: hex(parts.info.runeColour) ? parts.info.runeColour : '#e6fbff', size: 100,
    };
    const key = asset.libraryId || 'file:' + asset.name;
    const stored = readAppearance(key);
    const values = {};
    for (const name of ['body', 'accents', 'helmet', 'runeColour']) {
      if (hex(stored[name])) values[name] = stored[name];
    }
    if (stored.rune === 'none' || guideRune(stored.rune)) values.rune = stored.rune;
    if (stored.size >= 70 && stored.size <= 130) values.size = Number(stored.size);
    const glyph = parts.stone && native.rune ? makeRune(asset.root, parts.surfaces, parts.originalGlyphs, rerender) : null;
    active = { key, values, native, body, accents, helmet, glyph };
    $('model-accent-label').hidden = !accents;
    $('model-helmet-label').hidden = !helmet;
    $('model-rune-fields').hidden = !glyph;
    refreshFields();
    apply();
    return true;
  };
}

export function configureEffectColours(update) {
  const inputs = [...document.querySelectorAll('[data-effect-colour]')];
  const values = {};
  const saved = readAppearance('effects');
  const native = new Map(inputs.map(input => [input, input.value]));
  for (const input of inputs) {
    const key = input.dataset.effectColour;
    if (hex(saved[key])) {
      input.value = saved[key];
      values[key] = new THREE.Color(saved[key]);
    }
    input.addEventListener('input', () => {
      saved[key] = input.value;
      values[key] = new THREE.Color(input.value);
      writeAppearance('effects', saved);
      update();
    });
  }
  $('effect-colours-reset').addEventListener('click', () => {
    for (const input of inputs) {
      const key = input.dataset.effectColour;
      delete saved[key];
      delete values[key];
      input.value = native.get(input);
    }
    writeAppearance('effects', saved);
    update();
  });
  return values;
}
