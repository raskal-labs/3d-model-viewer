import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const html = readFileSync('v3/index.html', 'utf8');
const match = html.match(/window\.previewModels\s*=\s*(\[[\s\S]*?\]);<\/script>/);
assert.ok(match, 'The V3 viewer must have an explicit embedded asset catalogue');
assert.deepEqual(JSON.parse(match[1]), [], 'No models may be bundled in the public build');
assert.ok(!html.includes('Z2xURgIA'), 'No base64-encoded GLB payload may be embedded');
assert.ok(!html.includes('xy-porygon'), 'No official game model entry may be embedded');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/v3/', { waitUntil: 'domcontentloaded' });
  await page.locator('#model-canvas[data-ready]').waitFor({ timeout: 60000 });
  await page.locator('#open-model').click();
  await page.getByText('Browse device files', { exact: false }).first().waitFor({ timeout: 15000 });
  assert.deepEqual(errors, [], 'No JS errors');
  console.log('Public V3 loads in mobile Chromium with zero embedded models.');
} finally {
  await browser.close();
}
