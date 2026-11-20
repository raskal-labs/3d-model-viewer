import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const index = await fs.readFile("index.html", "utf8");
assert.match(index, /http-equiv="refresh"[^>]*\.\/v2\//);
assert.match(index, /location\.replace\(new URL\("\.\/v2\/"/);
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const modelExt = /\.(?:glb|gltf|obj|fbx|stl|mtl|blend|prisma|usdz|dae|ply|3mf|off|hdr|exr|ktx2|zip)$/i;
const forbidden = tracked.filter(path => modelExt.test(path) || /^chief\/(?:porygon\d+\.(?:png|jpe?g|webp))$/i.test(path));
assert.deepEqual(forbidden, [], "Public repo includes tracked model assets: " + forbidden.join(", "));
assert.doesNotMatch(await fs.readFile("v2/studio.js","utf8"), /function studioSample\(/);
assert.doesNotMatch(await fs.readFile("v2/index.html","utf8"), /id="sample"/);
console.log("Verified code-only public landing, empty viewport, and no tracked model assets.");
