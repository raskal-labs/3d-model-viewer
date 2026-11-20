import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { useLocalThree } from './local-three.mjs';

const server = process.env.STUDIO_URL || 'http://127.0.0.1:8765/v2/';
const artifacts = process.env.STUDIO_ARTIFACTS || 'viewer-smoke-artifacts/v2';
const modelPath = 'p2/media/generated/phaseone-crystal/v3-20261105/model.glb';
const browser = await chromium.launch({
  executablePath: process.env.STUDIO_CHROMIUM,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  await mkdir(artifacts, { recursive: true });
  const phone = await browser.newPage({
    viewport: { width: 390, height: 840 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  phone.on('pageerror', error => errors.push(error.message));
  phone.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await useLocalThree(phone);
  await phone.route(server, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('name="model-library" content=""',
      'name="model-library" content="test-model-library/"');
    await route.fulfill({ response, body });
  });
  await phone.route('**/test-model-library/catalog.json', route => route.fulfill({
    json: { assets: [{ id: 'crystal', path: modelPath }] },
  }));
  await phone.route('**/test-model-library/assets/crystal/bundle.json', route => route.fulfill({
    json: { files: [{ path: modelPath }] },
  }));
  await phone.goto(server, { waitUntil: 'domcontentloaded' });
  const canvas = phone.locator('#model-canvas');
  await canvas.waitFor();
  await phone.locator('#model-canvas[data-ready]').waitFor();
  assert.equal(await phone.locator('#crystal-lighting').evaluate(element => element.hidden), true);

  // Synthetic coloured meshes, including a white patch and a white eye, with one animation.
  const bytes = await phone.evaluate(async () => {
    const THREE = await import('three');
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const group = new THREE.Group();
    function mesh(name, color, x, y, size, z = 0) {
      const item = new THREE.Mesh(new THREE.BoxGeometry(size, size, size / 5),
        new THREE.MeshStandardMaterial({ color }));
      item.name = name;
      item.position.set(x, y, z);
      group.add(item);
      return item;
    }
    mesh('body', 0xcd555d, -.57, .15, 1.1);
    mesh('bill', 0x645eba, .58, .15, 1.1);
    mesh('white_patch', 0xf8f8f8, -.78, .29, .24, .13);
    mesh('eye_near', 0xffffff, -.32, -.01, .18, .13);
    mesh('pupil_near', 0x22183d, -.32, -.01, .08, .17);
    const track = new THREE.VectorKeyframeTrack('bill.position', [0, 1], [.58, .15, 0, .58, .32, 0]);
    const animation = new THREE.AnimationClip('Nod', 1, [track]);
    const glb = await new GLTFExporter().parseAsync(group, { binary: true, animations: [animation] });
    return Array.from(new Uint8Array(glb));
  });
  const buffer = Buffer.from(bytes);
  await phone.route('**/test-model-library/assets/crystal/0', route => route.fulfill({
    contentType: 'model/gltf-binary', body: buffer,
  }));
  await phone.locator('#open-model').tap();
  await phone.locator('.library-card').first().tap();
  await phone.waitForFunction(() => document.querySelector('#model-name').textContent === 'model.glb');

  await phone.locator('#show-animation').tap();
  assert.equal(await phone.locator('#animation-editor').evaluate(element => element.open), true);
  assert.equal(await phone.locator('#animation-clip option:checked').textContent(), 'Nod');
  await phone.locator('#clip-time').evaluate(element => {
    element.value = '650';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.match(await phone.locator('#clip-readout').textContent(), /^0\.65/);
  await phone.locator('[data-view="front"]').tap();
  await phone.locator('#close-panel').tap();

  const bounds = await canvas.boundingBox();
  const x = Math.round(bounds.x + bounds.width * .32);
  const y = Math.round(bounds.y + bounds.height * .56);
  await phone.locator('#touch-edit').tap();
  await phone.touchscreen.tap(x, y);
  assert.equal(await phone.locator('#touch-part-name').textContent(), 'body');

  const session = await phone.context().newCDPSession(phone);
  async function drag(dx, dy, end = 'touchEnd') {
    const event = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
    await event('touchStart', [{ x, y }]);
    for (const step of [.25, .5, .75, 1]) {
      await event('touchMove', [{ x: x + dx * step, y: y + dy * step }]);
      await phone.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await event(end, []);
  }
  const move = phone.locator('[data-transform="move"][data-axis="0"]');
  const rotate = phone.locator('[data-transform="rotate"][data-axis="1"]');
  const scale = phone.locator('[data-transform="scale"]');
  await drag(-25, 4, 'touchCancel');
  assert.equal(Number(await move.inputValue()), 0);
  await drag(-25, 4);
  assert(Number(await move.inputValue()) < -2);
  await phone.locator('[data-part-tool="rotate"]').tap();
  await drag(-35, 0);
  assert(Number(await rotate.inputValue()) < -10, `Rotated ${await phone.locator('#touch-part-name').textContent()} Y ${await rotate.inputValue()}`);
  await phone.locator('[data-part-tool="scale"]').tap();
  await drag(0, -30);
  assert(Number(await scale.inputValue()) > 1,
    `Scaled ${await phone.locator('#touch-part-name').textContent()} to ${await scale.inputValue()}, tool ${await phone.locator('[data-part-tool][aria-pressed="true"]').textContent()}`);

  await phone.screenshot({ path: `${artifacts}/touch-part-edit.png` });
  await phone.locator('#panel-toggle').tap();
  await phone.getByText('Pose and edit parts', { exact: true }).tap();
  await phone.locator('#undo-model-edit').tap();
  assert.equal(Number(await scale.inputValue()), 1);
  assert(Number(await rotate.inputValue()) < -10, 'Undo restores the previous gesture only');
  await phone.locator('#reset-pose').tap();
  assert.equal(Number(await move.inputValue()), 0);
  async function frame() {
    await phone.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return canvas.screenshot({
      style: '#inspector, #inspector-backdrop, .viewport-tools, #navigationTools, .asset-label { visibility: hidden; }',
    });
  }

  async function readPixels(buffer, sample) {
    return phone.evaluate(async ({ encoded, sample }) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + encoded;
      await image.decode();
      const context = document.createElement('canvas').getContext('2d');
      context.canvas.width = image.width;
      context.canvas.height = image.height;
      context.drawImage(image, 0, 0);
      if (sample) {
        return Array.from(context.getImageData(
          Math.floor(image.width * sample[0]), Math.floor(image.height * sample[1]), 1, 1,
        ).data);
      }
      const { data } = context.getImageData(0, 0, image.width, image.height);
      const colours = { red: 0, blue: 0, white: 0, black: 0 };
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = data.subarray(i, i + 3);
        if (r === 206 && g === 74 && b === 82) colours.red++;
        if (r === 82 && g === 99 && b === 198) colours.blue++;
        if (r === 255 && g === 255 && b === 255) colours.white++;
        if (r === 0 && g === 0 && b === 0) colours.black++;
      }
      return colours;
    }, { encoded: buffer.toString('base64'), sample });
  }

  const billPixel = [ .68, .51 ];
  const allMeshes = await readPixels(await frame(), billPixel);
  await phone.locator('#isolate-part').tap();
  assert.equal(await phone.locator('#isolate-part').getAttribute('aria-pressed'), 'true');
  assert.notDeepEqual(await readPixels(await frame(), billPixel), allMeshes);
  await phone.locator('#isolate-part').tap();
  assert.equal(await phone.locator('#isolate-part').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(await readPixels(await frame(), billPixel), allMeshes);
  await phone.locator('#close-panel').tap();
  await phone.locator('#touch-edit').tap();

  const setLight = async (angle, elevation) => {
    await phone.evaluate(([azimuth, height]) => {
      for (const [id, value] of [['key-angle', azimuth], ['key-elevation', height]]) {
        const field = document.getElementById(id);
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, [angle, elevation]);
  };
  const pixels = async () => readPixels(await frame());

  const setSpriteMode = async mode => phone.locator('#crystal-white').evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, mode);
  const source = await readPixels(await frame(), billPixel);
  await setSpriteMode('fixed');
  await setLight(0, 0);
  const fixed = await pixels();
  await canvas.screenshot({ path: `${artifacts}/phaseone-fixed-synthetic.png` });
  for (const color of ['red', 'blue', 'white', 'black']) assert(fixed[color] > 10, `${color} is in the rendered palette`);
  await setLight(180, 0);
  const fixedBack = await pixels();
  assert.equal(fixed.white, fixedBack.white, 'Painted white remains fixed while the lit red and blue bands move');
  assert.equal(fixedBack.red + fixedBack.blue, 0);
  await setSpriteMode('light');
  const movingBack = await pixels();
  assert(movingBack.white < fixedBack.white, 'The inferred body highlight mask is released, and the eye stays white');
  await setLight(0, 0);
  const movingFront = await pixels();
  assert(movingFront.white > fixed.white, 'Moving mode creates new white when the key points at the visible surfaces');
  await setLight(-37, 45);
  await setSpriteMode('original');
  assert.deepEqual(await readPixels(await frame(), billPixel), source);

  await phone.locator('#files').setInputFiles({ name: 'model.glb', mimeType: 'model/gltf-binary', buffer });
  await phone.waitForFunction(() => document.getElementById('crystal-lighting').hidden);
  assert.equal(await canvas.getAttribute('data-look'), 'original');
  assert.deepEqual(errors, []);
  console.log('Verified phone touch selection, transforms, cancellation and undo, animation access, mesh isolation, and scoped four-colour relighting.');
} finally {
  await browser.close();
}
