import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const url = process.env.STUDIO_URL || 'http://127.0.0.1:18723/v2/';
const vendor = process.env.STUDIO_THREE;
const artifacts = process.env.STUDIO_ARTIFACTS;
const browser = await chromium.launch({
  executablePath: process.env.STUDIO_CHROMIUM,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
async function ready(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  if (vendor) await page.route('https://cdn.jsdelivr.net/npm/three@0.168.0/**', route => {
    const name = new URL(route.request().url()).pathname.split('/three@0.168.0/')[1];
    return route.fulfill({ body: readFileSync(join(vendor, name)), contentType: 'text/javascript' });
  });
  await page.route(url, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('name="icon-runes" content=""', 'name="icon-runes" content="qa-runes.json"');
    await route.fulfill({ response, body });
  });
  await page.route('**/qa-runes.json', route => route.fulfill({ json: {
    interlock1: { label: 'Triangle', viewBox: '0 0 100 100',
      markup: '<path d="M50 8 L90 85 H10 Z" fill="none" stroke="white" stroke-width="11"/>' },
  } }));
  await page.goto(url);
  await page.locator('#model-canvas[data-ready="true"]').waitFor();
}

async function frame(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.locator('#model-canvas').screenshot({ style: '#inspector { visibility: hidden; }' });
}
async function upload(page, file, glb) {
  await page.locator('#files').setInputFiles({ name: file, mimeType: 'model/gltf-binary', buffer: glb });
  await page.waitForFunction(expected => document.querySelector('#model-name')?.textContent === expected, file);
}
async function supplyFixture(page, inlay = false) {
  return Buffer.from(await page.evaluate(async hasInlay => {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const THREE = await import('three');
    const group = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshPhysicalMaterial({ color: 0x294358, roughness: .32, flatShading: true }));
    stone.scale.set(.78, 1.28, .55);
    stone.name = 'Fixture stone';
    if (!hasInlay) stone.userData = { role: 'stone-body', rune: 'interlock1', runeColour: '#ffbc52' };
    group.add(stone);
    if (hasInlay) {
      const rune = new THREE.Mesh(new THREE.BoxGeometry(.32, .08, .04),
        new THREE.MeshStandardMaterial({ color: 0x53acdd, emissive: 0x53acdd, emissiveIntensity: 1.2 }));
      rune.position.z = .49;
      rune.name = 'Fixture rune inlay';
      group.add(rune);
    }
    const bytes = await new GLTFExporter().parseAsync(group, { binary: true });
    return Array.from(new Uint8Array(bytes));
  }, inlay));
}
async function changeValue(page, id, value) {
  await page.locator(id).evaluate((field, next) => {
    field.value = next;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
try {
  if (artifacts) await mkdir(artifacts, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 770 }, reducedMotion: 'reduce' });
  await ready(page);
  assert.equal(await page.locator('#stone-studio').isVisible(), false);
  const fixture = await supplyFixture(page);
  const nativeFixture = await supplyFixture(page, true);
  await upload(page, 'stone-qa.glb', fixture);
  const studio = page.locator('#stone-studio');
  await studio.locator('summary').click();
  const move = page.locator('#stone-motion');
  const colour = page.locator('#stone-colour-motion');
  const effect = page.locator('#stone-effect');
  const play = page.locator('#stone-playing');
  assert.equal(await move.inputValue(), 'off');
  assert.equal(await play.isChecked(), false, 'Reduced-motion defaults to paused');
  await page.locator('#model-customization summary').click();
  await page.waitForTimeout(150);
  const original = await frame(page);
  await changeValue(page, '#model-body-colour', '#c8396a');
  await changeValue(page, '#model-rune-colour', '#f8a7ef');
  assert.notDeepEqual(await frame(page), original, 'Body and rune swatches change the rendered model');
  await page.locator('#model-customization-reset').click();
  const baseline = await frame(page);

  for (const kind of ['ember', 'rune', 'edges']) {
    await effect.selectOption(kind);
    await page.waitForTimeout(150);
    const image = await frame(page);
    assert.notDeepEqual(image, baseline, kind + ' changes the stone frame');
    if (artifacts) await page.locator('#model-canvas').screenshot({ path: join(artifacts, kind + '.png'), style: '#inspector{visibility:hidden}' });
    await effect.selectOption('off');
    assert.deepEqual(await frame(page), baseline, kind + ' off restores the stone frame');
  }
  await colour.selectOption('pulse');
  await changeValue(page, '#stone-motion-colour', '#ff5232');
  assert.notDeepEqual(await frame(page), baseline);
  await colour.selectOption('off');
  assert.deepEqual(await frame(page), baseline);
  await move.selectOption('turn');
  const lifted = await frame(page);
  assert.notDeepEqual(lifted, baseline, 'Stone lifts while paused');
  await play.check();
  await page.waitForTimeout(300);
  assert.notDeepEqual(await frame(page), lifted, 'Turn and levitation animate');
  await play.uncheck();
  const frozen = await frame(page);
  await page.waitForTimeout(150);
  assert.deepEqual(await frame(page), frozen, 'Stone can pause mid-motion');
  await changeValue(page, '#model-rune-size', '125');
  assert.notDeepEqual(await frame(page), frozen, 'Rune reprojects after resizing in a rotated pose');

  await effect.selectOption('edges');
  await page.locator('#light-details summary').click();
  await page.locator('#outline').check();
  await frame(page);
  await page.locator('#outline').uncheck();
  await upload(page, 'prism-qa.glb', nativeFixture);
  assert.equal(await page.locator('#model-rune').inputValue(), 'native', 'Preserve an authored rune inlay');
  assert.equal(await move.inputValue(), 'off', 'A different stone has independent settings');
  const nativeFrame = await frame(page);
  await effect.selectOption('rune');
  assert.notDeepEqual(await frame(page), nativeFrame, 'The authored rune also supports Rune Current');

  await upload(page, 'stone-qa.glb', fixture);
  assert.equal(await move.inputValue(), 'turn', 'Motion is restored when reopening a stone');
  assert.equal(await effect.inputValue(), 'edges');
  assert.equal(await play.isChecked(), false);
  await page.locator('#stone-reset').click();
  assert.equal(await effect.inputValue(), 'off');
  assert.equal(await move.inputValue(), 'off');
  await page.getByRole('button', { name: 'Studio sample' }).click();
  assert.equal(await studio.isVisible(), false);

  const phone = await browser.newPage({ viewport: { width: 390, height: 680 }, isMobile: true, hasTouch: true });
  await ready(phone);
  await upload(phone, 'stone-qa.glb', fixture);
  await phone.getByRole('button', { name: 'Looks & View' }).tap();
  await phone.locator('#stone-studio summary').tap();
  await phone.locator('#stone-motion').selectOption('sway');
  await phone.getByRole('button', { name: 'Close settings' }).tap();
  await phone.locator('#precisionButton').tap();
  await phone.getByRole('menuitem', { name: 'Dual pads' }).tap();
  assert.equal(await phone.locator('#precisionDual').isVisible(), true, 'Camera controls remain usable with stone motion');
  assert.deepEqual(errors, []);
  console.log('Verified colour, all stone effects, motion, pause, rune projection, native inlay, persistence, and touch-sized camera controls.');
} finally {
  await browser.close();
}
