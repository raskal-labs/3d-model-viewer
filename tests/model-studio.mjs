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
  return page.locator('#model-canvas').screenshot({ animations: 'disabled' });
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
  await phone.getByRole('button', { name: 'Close settings' }).tap();
  assert.equal(await phone.locator('#inspector').isVisible(), false);
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
  await phone.getByRole('button', { name: 'Precision navigation' }).tap();
  await phone.getByRole('menuitem', { name: 'zoom' }).tap();
  await phone.locator('#precisionInstrument[data-mode="zoom"]').waitFor();
  await phone.locator('#precisionZoomSlider').tap();
  assert(await phone.locator('#precisionZoomSlider').isVisible(), 'Touching the zoom slider leaves it open');
  assert.match(await phone.locator('#open-model').evaluate(el => getComputedStyle(el).fontFamily), /PocketText/);
  assert.match(await phone.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /PocketDisplay/);
  assert.match(await phone.locator('#precisionValue').evaluate(el => getComputedStyle(el).fontFamily), /PocketMono/);
  assert.deepEqual(errors, [], 'No page or WebGL shader errors');
  console.log('Verified studio defaults, shader looks, chamber effects, glTF sidecars, reversible materials, animation controls, projection, and phone-sized UI' +
    (process.env.DRACO_FIXTURE ? ', including Draco GLB.' : '.'));
} finally {
  await browser.close();
}
