import assert from 'node:assert/strict';
import { mkdir, readdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const server = process.env.STUDIO_URL || 'http://127.0.0.1:8765/v2/';
const artifacts = process.env.STUDIO_ARTIFACTS || 'viewer-smoke-artifacts/v2';
const fixture = 'v2/tests/fixtures/khronos';
const browser = await chromium.launch({
  executablePath: process.env.STUDIO_CHROMIUM,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
await mkdir(artifacts, { recursive: true });
function monitor(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
}
async function ready(page) {
  await page.goto(server);
  await page.locator('#model-canvas[data-ready]').waitFor();
}
async function painted(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function frame(page) {
  await painted(page);
  return page.locator('#model-canvas').screenshot({ animations: 'disabled', style: '#inspector { visibility: hidden; }' });
}
async function screenshot(page, name) {
  await painted(page);
  await page.screenshot({ path: `${artifacts}/${name}.png` });
}
async function open(page, files, name) {
  await page.locator('#files').setInputFiles(files);
  await page.waitForFunction(expected => document.querySelector('#model-name')?.textContent === expected, name);
  await page.locator('#status').waitFor({ state: 'hidden' });
}
async function touchDrag(page, { x, y }, dx, dy) {
  const session = await page.context().newCDPSession(page);
  const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ x, y }]);
  for (const step of [.25, .5, .75, 1]) {
    await touch('touchMove', [{ x: x + dx * step, y: y + dy * step }]);
  }
  await touch('touchEnd', []);
  await session.detach();
}

try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 850 } });
  monitor(page);
  await ready(page);
  assert.equal(await page.locator('#look').inputValue(), 'original');
  assert.equal(await page.locator('#lighting').inputValue(), 'neutral');
  assert.equal(await page.locator('#bloom').isChecked(), false);
  await screenshot(page, '01-neutral-studio');

  const textureFiles = await readdir(`${fixture}/SimpleTexture/glTF`);
  await open(page, textureFiles.map(file => `${fixture}/SimpleTexture/glTF/${file}`), 'SimpleTexture.gltf');
  const original = await frame(page);
  const styled = page.locator('#look');
  await styled.selectOption('clay');
  assert.notDeepEqual(await frame(page), original, 'Clay changes the rendered model');
  await styled.selectOption('original');
  assert.deepEqual(await frame(page), original, 'Returning to original restores the same textured pixels');

  await page.locator('#files').setInputFiles(`${fixture}/SimpleSkin/glTF/SimpleSkin.gltf`);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Missing sidecar:'));
  assert.equal(await page.locator('#model-name').innerText(), 'SimpleTexture.gltf');
  const skinFiles = await readdir(`${fixture}/SimpleSkin/glTF`);
  await open(page, skinFiles.map(file => `${fixture}/SimpleSkin/glTF/${file}`), 'SimpleSkin.gltf');
  await page.locator('#animation-control').waitFor();
  await open(page, `${fixture}/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb`, 'AnimatedMorphCube.glb');
  await page.locator('#animation-control').waitFor();
  if (process.env.DRACO_FIXTURE) {
    await open(page, process.env.DRACO_FIXTURE, process.env.DRACO_FIXTURE.split('/').at(-1));
  }

  await open(page, [
    { name: 'example.obj', mimeType: 'text/plain', buffer: Buffer.from(
      'mtllib example.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl coral\nf 1 2 3\n') },
    { name: 'example.mtl', mimeType: 'text/plain', buffer: Buffer.from('newmtl coral\nKd .8 .2 .1\n') },
  ], 'example.obj');
  await open(page, {
    name: 'example.stl', mimeType: 'model/stl',
    buffer: Buffer.from('solid sample\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid sample'),
  }, 'example.stl');

  await page.getByRole('button', { name: 'Studio sample' }).click();
  for (const id of ['unlit', 'normals', 'resonance-mineral', 'banana-cel', 'banana-ps1',
    'legacy-pixel', 'legacy-watercolour', 'legacy-ink', 'legacy-mono']) {
    await styled.selectOption(id);
    await painted(page);
  }

  await styled.selectOption('banana-cel');
  await page.locator('#lighting').selectOption('banana');
  await screenshot(page, '02-banana-palm-cel');
  await styled.selectOption('banana-ps1');
  await screenshot(page, '03-banana-palm-ps1');

  await styled.selectOption('resonance-mineral');
  await page.locator('#lighting').selectOption('resonance');
  const mineral = await frame(page);
  const resonanceEffect = page.locator('#resonance-effect');
  for (const effect of ['prism', 'electric', 'tide']) {
    await resonanceEffect.selectOption(effect);
    assert.notDeepEqual(await frame(page), mineral, `${effect} changes the rendered frame`);
  }
  await resonanceEffect.selectOption('');
  assert.deepEqual(await frame(page), mineral, 'Turning the chamber accent off restores the clean frame');
  for (const id of ['bloom', 'ribbons', 'sparks']) await page.locator('#' + id).check();
  assert.notDeepEqual(await frame(page), mineral, 'Chamber effects change the rendered pixels');
  await screenshot(page, '04-resonance');
  await page.locator('#projection').selectOption('orthographic');
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  await screenshot(page, '05-orthographic');

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  monitor(phone);
  await ready(phone);
  assert(await phone.getByRole('button', { name: 'Open model' }).evaluate(button =>
    button.getBoundingClientRect().right <= document.documentElement.clientWidth), 'Open model fits on a phone');

  await phone.getByRole('button', { name: 'Looks & View' }).tap();
  await phone.locator('#look').selectOption('legacy-pixel');
  const settings = phone.locator('#inspector');
  const closeSettings = phone.getByRole('button', { name: 'Close settings' });
  const closeBeforeScroll = await closeSettings.boundingBox();
  await settings.locator('.inspector-content').evaluate(element => { element.scrollTop = element.scrollHeight; });
  assert(await settings.locator('.inspector-content').evaluate(element => element.scrollTop > 0));
  assert.equal((await closeSettings.boundingBox()).y, closeBeforeScroll.y, 'The settings title bar stays pinned');
  await phone.touchscreen.tap(22, (await settings.boundingBox()).y - 18);
  assert.equal(await settings.isVisible(), false, 'A tap outside dismisses settings');
  await phone.getByRole('button', { name: 'Looks & View' }).tap();
  const panelStart = await settings.boundingBox();
  await touchDrag(phone, { x: panelStart.x + 45, y: panelStart.y + 18 }, -60, -70);
  const moved = await settings.boundingBox();
  assert(moved.x < panelStart.x - 40 && moved.y < panelStart.y - 40, 'Touch drag moves the settings panel');
  const grip = await phone.locator('#resize-panel').boundingBox();
  await touchDrag(phone, { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }, 38, -55);
  const resized = await settings.boundingBox();
  assert(resized.width > moved.width + 25 && resized.height < moved.height - 40, 'Touch resize changes both dimensions');
  await closeSettings.tap();
  assert.equal(await settings.isVisible(), false);
  await phone.getByRole('button', { name: 'Precision navigation' }).tap();
  const precision = phone.getByRole('menu', { name: 'Precision mode' });
  await precision.waitFor();
  assert(await precision.evaluate(menu => menu.getBoundingClientRect().bottom <= window.visualViewport.height),
    'The precision menu fits in the phone viewport');
  await screenshot(phone, '06-phone-precision');
  await phone.getByRole('menuitem', { name: 'pan' }).tap();
  await phone.locator('#precisionInstrument[data-mode="pan"]').waitFor();
  const surface = phone.locator('#precisionSurface');
  await surface.tap();
  assert(await surface.isVisible(), 'Tapping the control keeps the instrument open');
  assert(await surface.evaluate(element => getComputedStyle(element).pointerEvents !== 'none'));
  const box = await surface.boundingBox();
  const cdp = await phone.context().newCDPSession(phone);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const before = await phone.locator('#precisionValue').innerText();
  await touch('touchStart', [{ x, y }]);
  await touch('touchMove', [{ x: x + 40, y: y + 14 }]);
  await touch('touchEnd', []);
  assert.notEqual(await phone.locator('#precisionValue').innerText(), before, 'The pad receives a real touch drag');
  const instrument = phone.locator('#precisionInstrument');
  const instrumentStart = await instrument.boundingBox();
  await touchDrag(phone, { x: instrumentStart.x + 40, y: instrumentStart.y + 18 }, -35, -65);
  const instrumentMoved = await instrument.boundingBox();
  assert(instrumentMoved.x < instrumentStart.x - 20 && instrumentMoved.y < instrumentStart.y - 45,
    'The precision instrument can be moved independently of the pad');
  const precisionGrip = await instrument.locator('.panel-grip').boundingBox();
  await touchDrag(phone, { x: precisionGrip.x + precisionGrip.width / 2, y: precisionGrip.y + precisionGrip.height / 2 }, 25, 35);
  const instrumentResized = await instrument.boundingBox();
  assert(instrumentResized.width > instrumentMoved.width + 15 && instrumentResized.height > instrumentMoved.height + 20,
    'The precision instrument can be resized');
  await phone.getByRole('button', { name: 'Precision navigation' }).tap();
  await phone.getByRole('menuitem', { name: 'zoom' }).tap();
  await phone.locator('#precisionInstrument[data-mode="zoom"]').waitFor();
  await phone.locator('#precisionZoomSlider').tap();
  assert(await phone.locator('#precisionZoomSlider').isVisible(), 'Touching the zoom slider leaves it open');
  assert.match(await phone.locator('#open-model').evaluate(el => getComputedStyle(el).fontFamily), /PocketText/);
  assert.match(await phone.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /PocketDisplay/);
  assert.match(await phone.locator('#precisionValue').evaluate(el => getComputedStyle(el).fontFamily), /PocketMono/);
  const libraryPhone = await browser.newPage({ viewport: { width: 390, height: 660 }, isMobile: true, hasTouch: true });
  monitor(libraryPhone);
  await libraryPhone.route(new URL(server).href, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('name="model-library" content=""',
      'name="model-library" content="test-model-library/"');
    await route.fulfill({ response, body });
  });
  await libraryPhone.route('**/test-model-library/catalog.json', route => route.fulfill({
    json: { assets: Array.from({ length: 35 }, (_, id) => ({
      id, path: `Fixtures/Model ${id}.glb`, modified: id, preview: id === 34,
    })) },
  }));
  await libraryPhone.route('**/test-model-library/assets/34/thumbnail.png', route => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNI6tsFAAMAAatF3neQAAAAAElFTkSuQmCC', 'base64'),
  }));
  await ready(libraryPhone);
  await libraryPhone.getByRole('button', { name: 'Open model' }).tap();
  const dialog = libraryPhone.getByRole('dialog', { name: 'Open model' });
  const rail = dialog.locator('#library-rail');
  assert.match(await rail.locator('button').first().innerText(), /Model 34/);
  assert(await rail.locator('img').evaluate(image => image.decode().then(() => image.naturalWidth > 0)));
  const railBox = await rail.boundingBox();
  await touchDrag(libraryPhone, { x: railBox.x + 180, y: railBox.y + 45 }, -155, 0);
  // Wait for native scrolling and snap to finish before starting a separate gesture.
  await libraryPhone.waitForFunction(() => {
    const element = document.querySelector('#library-rail');
    const start = element.scrollLeft;
    return new Promise(resolve => setTimeout(() => resolve(start > 0 && element.scrollLeft === start), 100));
  });
  await touchDrag(libraryPhone, { x: railBox.x + 55, y: railBox.y + 85 }, 0, -60);
  assert.equal(await dialog.getByRole('button', { name: 'Collections' }).getAttribute('aria-pressed'), 'true');
  await painted(libraryPhone);
  await rail.getByRole('button', { name: 'Fixtures 35 models' }).tap();
  await rail.getByRole('button', { name: 'Model 0 Fixtures' }).waitFor();
  await dialog.getByRole('button', { name: 'Full library' }).tap();
  await dialog.getByRole('button', { name: 'Model 34.glb' }).waitFor();
  const closePicker = dialog.getByRole('button', { name: 'Close model picker' });
  const pickerCloseBeforeScroll = await closePicker.boundingBox();
  const results = dialog.locator('#library-results');
  await results.evaluate(element => { element.scrollTop = element.scrollHeight; });
  assert(await results.evaluate(element => element.scrollTop > 0));
  assert.equal((await closePicker.boundingBox()).y, pickerCloseBeforeScroll.y, 'The library title bar stays pinned');
  await dialog.getByRole('heading', { name: 'Open model' }).tap();
  assert(await dialog.isVisible(), 'An inside tap leaves the picker open');
  await libraryPhone.touchscreen.tap(22, (await dialog.boundingBox()).y - 12);
  assert.equal(await dialog.isVisible(), false, 'A tap outside dismisses the picker');

  assert.deepEqual(errors, [], 'No page or WebGL shader errors');
  console.log('Verified studio defaults, shader looks, chamber effects, glTF sidecars, reversible materials, animation controls, projection, and phone-sized UI' +
    (process.env.DRACO_FIXTURE ? ', including Draco GLB.' : '.'));
} finally {
  await browser.close();
}
