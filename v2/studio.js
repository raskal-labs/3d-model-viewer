import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEffects } from './effects.js';
import { createLookMaterial } from './looks.js';
import { createCamera } from './camera.js';
import { importModel, disposeModel } from './import-model.js';
import { installModelPicker } from './model-library.js';
import { configureEffectColours, createModelCustomization } from './customization.js';
import { downloadFile, installModelTools } from './model-tools.js';
import { installPaletteGuide } from './palette-guide.js';

const $ = id => document.getElementById(id);
const canvas = $('model-canvas');
const viewport = $('viewport');
const scene = new THREE.Scene();
let dirty = true;
const invalidate = () => { dirty = true; };
const pivot = new THREE.Group();
scene.add(pivot);

function setStatus(message, error = false) {
  $('status').textContent = message;
  $('status').hidden = !message;
  $('status').toggleAttribute('data-error', error);
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (error) {
  setStatus('WebGL 2 is unavailable in this browser.', true);
  throw error;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));

const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
const studioMap = pmrem.fromScene(environment, .04);
pmrem.dispose();
environment.dispose();

const effects = createEffects(renderer, scene);

const lighting = {
  neutral: { bg: '#29313d', sky: '#e9f2ff', ground: '#3f4755', ambient: .65, key: '#ffffff', keyPower: 2.4, rim: '#cbdcff', rimPower: 1.4, env: .72 },
  softbox: { bg: '#45423e', sky: '#fff6e8', ground: '#7d7468', ambient: 1.3, key: '#fff4e5', keyPower: 1.1, rim: '#f4e5df', rimPower: .6, env: .92 },
  rim: { bg: '#161c25', sky: '#dbefff', ground: '#313a4d', ambient: .28, key: '#f6f4ef', keyPower: 1.35, rim: '#cbdcff', rimPower: 3, env: .28 },
  resonance: { bg: '#0b101b', sky: '#777ca2', ground: '#152831', ambient: .22, key: '#62b5ed', keyPower: 1.04, rim: '#a48fff', rimPower: 2.5, env: .22 },
  banana: { bg: '#3b4744', sky: '#e6f2ff', ground: '#9c8c70', ambient: .57, key: '#fff0d1', keyPower: 2.05, rim: '#a6c2d4', rimPower: .7, env: .44 },
  daylight: { bg: '#cbd6df', sky: '#ffffff', ground: '#e6e9ef', ambient: 1.32, key: '#fffcf5', keyPower: 1.7, rim: '#e6f4ff', rimPower: 1.2, env: .8 },
  duotone: { bg: '#20202c', sky: '#eee4f8', ground: '#4c4255', ambient: .4, key: '#ffcd9c', keyPower: 2.3, rim: '#85c1ff', rimPower: 2.2, env: .32 },
  silhouette: { bg: '#b2c7da', sky: '#a8bdde', ground: '#313944', ambient: .03, key: '#ffffff', keyPower: 0, rim: '#bddcff', rimPower: 1.3, env: 0 },
};
const sky = new THREE.HemisphereLight();
const key = new THREE.DirectionalLight();
const rim = new THREE.DirectionalLight();
key.position.set(-3, 5, 4);
rim.position.set(3, 2, -5);
scene.add(sky, key, rim);

const lightInputs = ['backdrop-colour', 'key-colour', 'rim-colour', 'key-angle', 'key-elevation', 'key-strength', 'env-strength', 'exposure'];
function applyLighting() {
  const rig = lighting[$('lighting').value];
  scene.background = new THREE.Color($('backdrop-colour').value);
  sky.color.set(rig.sky);
  sky.groundColor.set(rig.ground);
  sky.intensity = rig.ambient;
  key.color.set($('key-colour').value);
  key.intensity = Number($('key-strength').value);
  const azimuth = THREE.MathUtils.degToRad(Number($('key-angle').value));
  const elevation = THREE.MathUtils.degToRad(Number($('key-elevation').value));
  key.position.setFromSphericalCoords(7, Math.PI / 2 - elevation, azimuth);
  rim.color.set($('rim-colour').value);
  rim.intensity = rig.rimPower;
  const environmentStrength = Number($('env-strength').value);
  scene.environment = environmentStrength > 0 ? studioMap.texture : null;
  scene.environmentIntensity = environmentStrength;
  renderer.toneMappingExposure = Number($('exposure').value);
  invalidate();
}
function resetLighting() {
  const rig = lighting[$('lighting').value];
  const values = [rig.bg, rig.key, rig.rim, -37, 45, rig.keyPower, rig.env, 1];
  lightInputs.forEach((id, index) => { $(id).value = values[index]; });
  applyLighting();
}
$('lighting').addEventListener('change', resetLighting);
$('reset-light').addEventListener('click', resetLighting);
for (const id of lightInputs) $(id).addEventListener('input', applyLighting);
resetLighting();

const grid = new THREE.GridHelper(20, 40, 0x698497, 0x3c4d5c);
grid.visible = false;
scene.add(grid);
$('grid').addEventListener('change', () => {
  grid.visible = $('grid').checked;
  invalidate();
});
const camera = createCamera(canvas, () => { $('spin').checked = false; }, invalidate);
$('projection').addEventListener('change', () => camera.projection($('projection').value));
for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    $('spin').checked = false;
    camera.snap(button.dataset.view);
  });
}

let current, pending;
const initialMaterials = new Map();
const alternateMaterials = new Map();
const customizeModel = createModelCustomization(applyLook, invalidate);
const modelTools = installModelTools({
  invalidate, refreshLook: applyLook, setStatus,
  frameModel: () => {
    const bounds = new THREE.Box3().setFromObject(pivot, true);
    if (!bounds.isEmpty()) camera.setBounds(bounds);
  },
});
installPaletteGuide({ applyLight: applyLighting, applyTint: modelTools.applyTint });

function clearLook() {
  for (const [object, original] of initialMaterials) object.material = original;
  for (const material of alternateMaterials.values()) material.dispose();
  initialMaterials.clear();
  alternateMaterials.clear();
}

function materialFor(original, look, tint, index) {
  const key = original.uuid + (tint ?? '');
  if (!alternateMaterials.has(key)) {
    const material = createLookMaterial(original, look, effects.retroResolution, index);
    if (tint && !['wireframe', 'material-id'].includes(look)) material.color?.set(tint);
    alternateMaterials.set(key, material);
  }
  return alternateMaterials.get(key);
}

function applyLook() {
  clearLook();
  const look = $('look').value;
  const changesSurface = ['clay', 'unlit', 'normals', 'wireframe', 'material-id', 'banana-cel', 'banana-ps1', 'legacy-pixel', 'resonance-mineral'].includes(look);
  const ids = new Map();
  current?.root.traverse(object => {
    if (!object.isMesh || !object.material || object.userData.modelRune) return;
    const tint = modelTools.tintFor(object);
    if (!changesSurface && !tint) return;
    initialMaterials.set(object, object.material);
    function styled(material) {
      if (!ids.has(material)) ids.set(material, ids.size);
      return materialFor(material, look, tint, ids.get(material));
    }
    object.material = Array.isArray(object.material) ? object.material.map(styled) : styled(object.material);
  });
  canvas.dataset.look = look;
  invalidate();
}
$('look').addEventListener('change', applyLook);

function selectAsset(asset) {
  const bounds = new THREE.Box3().setFromObject(asset.root, true);
  if (bounds.isEmpty() || !Number.isFinite(bounds.min.lengthSq() + bounds.max.lengthSq())) {
    disposeModel(asset.root);
    throw new Error('No finite, visible geometry was found.');
  }
  const previous = current;
  if (previous) {
    clearLook();
    pivot.remove(previous.root);
  }
  current = asset;
  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1e-9);
  const scale = 2.8 / maxDimension;
  pivot.scale.setScalar(scale);
  pivot.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
  pivot.add(asset.root);
  const framed = new THREE.Box3().setFromObject(pivot, true);
  grid.position.y = framed.min.y - .003;
  modelTools.setAsset(asset, maxDimension);
  if (previous) disposeModel(previous.root);
  let meshes = 0;
  asset.root.traverse(object => { if (object.isMesh) meshes++; });
  $('model-name').textContent = asset.name;
  $('model-info').textContent = `${meshes} ${meshes === 1 ? 'mesh' : 'meshes'}${asset.animations.length ? ' · Animated' : ''}`;
  canvas.dataset.ready = 'true';
  camera.setBounds(framed);
  if (!customizeModel(asset)) applyLook();
}

function studioSample() {
  const root = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.98, 0), new THREE.MeshPhysicalMaterial({
    color: 0x60a596, roughness: .26, metalness: .17, clearcoat: .35, flatShading: true,
  }));
  core.rotation.set(.05, .24, .28);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.16, .083, 16, 80), new THREE.MeshStandardMaterial({
    color: 0xc9bd9f, roughness: .25, metalness: .86,
  }));
  ring.rotation.set(1.16, .21, .46);
  root.add(core, ring);
  return { root, name: 'Studio sample', animations: [] };
}

async function openAsset(load) {
  pending?.abort();
  const request = pending = new AbortController();
  setStatus('Opening model…');
  try {
    const asset = await load(request.signal);
    if (request.signal.aborted) { disposeModel(asset.root); return; }
    selectAsset(asset);
    setStatus('');
  } catch (error) {
    if (!request.signal.aborted) setStatus(error.message || 'Could not open this model.', true);
  } finally {
    if (pending === request) pending = null;
  }
}

function openFiles(files) {
  if (files.length) openAsset(() => importModel(files));
}

$('sample').addEventListener('click', () => {
  pending?.abort();
  selectAsset(studioSample());
  setStatus('');
});
installModelPicker($('files'), openAsset, importModel);
$('files').addEventListener('change', event => {
  openFiles(Array.from(event.target.files));
  event.target.value = '';
});
viewport.addEventListener('dragover', event => {
  if (!Array.from(event.dataTransfer.types).includes('Files')) return;
  event.preventDefault();
  viewport.toggleAttribute('data-dragging', true);
});
viewport.addEventListener('dragleave', event => {
  if (!viewport.contains(event.relatedTarget)) viewport.removeAttribute('data-dragging');
});
viewport.addEventListener('drop', event => {
  event.preventDefault();
  viewport.removeAttribute('data-dragging');
  openFiles(Array.from(event.dataTransfer.files));
});
const inspector = $('inspector');
const precisionInstrument = $('precisionInstrument');
const inspectorBackdrop = $('inspector-backdrop');
const panelToggle = $('panel-toggle');
const modelPicker = $('model-picker');
function showPanel(open) {
  inspector.toggleAttribute('data-open', open);
  inspectorBackdrop.hidden = !open;
  panelToggle.setAttribute('aria-expanded', String(open));
  if (open && inspector.hasAttribute('data-positioned')) setPanelBounds(inspector, inspector.getBoundingClientRect());
}
panelToggle.addEventListener('click', () => showPanel(!inspector.hasAttribute('data-open')));
function closePanel() {
  showPanel(false);
  panelToggle.focus();
}
$('close-panel').addEventListener('click', closePanel);
inspectorBackdrop.addEventListener('click', closePanel);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && inspector.hasAttribute('data-open') && !modelPicker.open) closePanel();
});

function setPanelBounds(panel, bounds, resize = false) {
  const inset = 6;
  const { clientWidth, clientHeight } = document.documentElement;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const minWidth = Math.min(210, clientWidth - inset * 2);
  const minHeight = Math.min(panel === inspector ? 155 : 128, clientHeight - inset * 2);
  const left = clamp(bounds.left, inset, clientWidth - inset - minWidth);
  const top = clamp(bounds.top, inset, clientHeight - inset - minHeight);
  const width = clamp(bounds.width, minWidth, clientWidth - inset - (resize ? left : inset));
  const height = clamp(bounds.height, minHeight, clientHeight - inset - (resize ? top : inset));
  Object.assign(panel.style, {
    left: `${Math.min(left, clientWidth - inset - width)}px`,
    top: `${Math.min(top, clientHeight - inset - height)}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  panel.toggleAttribute('data-positioned', true);
}

function enablePanelGesture(panel, handle, resize = false) {
  let gesture;
  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY, bounds: panel.getBoundingClientRect(),
    };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (event.pointerId !== gesture?.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const { left, top, width, height } = gesture.bounds;
    setPanelBounds(panel, resize ? { left, top, width: width + dx, height: height + dy } :
      { left: left + dx, top: top + dy, width, height }, resize);
  });
  handle.addEventListener('lostpointercapture', () => { gesture = null; });
}

for (const [panel, title] of [[inspector, '.inspector-heading'], [precisionInstrument, '.precision-heading']]) {
  enablePanelGesture(panel, panel.querySelector(title));
  enablePanelGesture(panel, panel.querySelector('.panel-grip'), true);
  window.addEventListener('resize', () => {
    if (!panel.hasAttribute('data-positioned')) return;
    const bounds = panel.getBoundingClientRect();
    if (bounds.width) setPanelBounds(panel, bounds);
    else {
      panel.removeAttribute('data-positioned');
      panel.removeAttribute('style');
    }
  });
}
showPanel(!matchMedia('(max-width: 740px)').matches);

new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  effects.resize(width, height);
  camera.resize(width, height);
}).observe(viewport);
renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
effects.resize(viewport.clientWidth, viewport.clientHeight);
camera.resize(viewport.clientWidth, viewport.clientHeight);
selectAsset(studioSample());
const frameOptions = {};
frameOptions.colours = configureEffectColours(invalidate);
$('animate').checked = !matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateEffects() {
  frameOptions.look = $('look').value;
  frameOptions.resonance = $('resonance-effect').value;
  for (const key of ['bloom', 'ribbons', 'sparks', 'animate', 'outline', 'vignette']) frameOptions[key] = $(key).checked;
  frameOptions.bloomStrength = Number($('bloom-strength').value);
  invalidate();
}
for (const id of ['look', 'resonance-effect', 'bloom', 'ribbons', 'sparks', 'animate', 'outline', 'vignette']) {
  $(id).addEventListener('change', updateEffects);
}
$('bloom-strength').addEventListener('input', updateEffects);
$('capture-png').addEventListener('click', () => {
  try {
    effects.render(camera.active, frameOptions, 0, grid);
    const name = current.name.replace(/\.[^.]+$/, '') + '.png';
    canvas.toBlob(blob => {
      if (blob) downloadFile(blob, name);
      else setStatus('Could not save the current frame.', true);
    }, 'image/png');
  } catch (error) {
    setStatus(error.message || 'Could not save the current frame.', true);
  }
});
updateEffects();
let previous = performance.now();
renderer.setAnimationLoop(now => {
  const delta = Math.min((now - previous) / 1000, .06);
  previous = now;
  const spinning = $('spin').checked;
  const playing = modelTools.update(delta);
  const movingEffects = frameOptions.animate && (frameOptions.ribbons || frameOptions.sparks || frameOptions.resonance);
  if (spinning) camera.spin(delta);
  if (dirty || playing || movingEffects) {
    effects.render(camera.active, frameOptions, delta, grid);
    dirty = false;
  }
});
