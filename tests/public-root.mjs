import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = readFileSync('index.html', 'utf8');
assert.match(root, /http-equiv="refresh" content="0;url=\.\/v2\/"/);
assert.match(root, /location\.replace\(new URL\("\.\/v2\/", location\.href\)\)/);

const v2 = readFileSync('v2/index.html', 'utf8');
assert.match(v2, /id="model-canvas"/);
assert.doesNotMatch(v2, /data:image\/(?:png|jpeg);base64/);
console.log('Public landing redirects to V2, with no model embedded in its HTML.');
