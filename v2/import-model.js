import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const decoderPath = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/draco/gltf/';
const draco = new DRACOLoader().setDecoderPath(decoderPath).setWorkerLimit(2);
const maxBytes = 64 * 1024 * 1024;
const modelExtension = /\.(glb|gltf|obj|stl)$/i;

export async function importModel(files, paths) {
  const filePath = file => paths?.get(file) || file.webkitRelativePath || file.name;
  if (files.reduce((sum, file) => sum + file.size, 0) > maxBytes) {
    throw new Error('Select a model and sidecars totalling 64 MB or less.');
  }
  const entries = files.filter(file => modelExtension.test(file.name));
  if (entries.length !== 1) {
    throw new Error('Select one GLB, glTF, OBJ, or STL and its sidecar files.');
  }

  const model = entries[0];
  const sidecars = new Map();
  const objectURLs = new Map();
  for (const file of files) {
    const name = filePath(file);
    if (sidecars.has(name)) throw new Error(`Duplicate sidecar name: ${name}`);
    sidecars.set(name, file);
  }

  const base = new URL('./local-import/', location.href);
  const basePath = base.pathname;
  const directory = filePath(model).split('/').slice(0, -1).map(encodeURIComponent).join('/');
  const resourceBase = new URL(directory ? directory + '/' : '.', base).href;
  const manager = new THREE.LoadingManager();
  function resolveSidecar(url) {
    const resolved = new URL(url, resourceBase);
    if (resolved.origin !== base.origin || !resolved.pathname.startsWith(basePath)) {
      throw new Error('This model references an external file. Select a local bundle instead.');
    }
    const name = decodeURIComponent(resolved.pathname.slice(basePath.length));
    const file = sidecars.get(name) || sidecars.get(name.split('/').at(-1));
    if (!file) throw new Error(`Missing sidecar: ${name}`);
    return file;
  }

  manager.setURLModifier(url => {
    if (/^(data:|blob:)/i.test(url)) return url;
    const file = resolveSidecar(url);
    if (!objectURLs.has(file)) objectURLs.set(file, URL.createObjectURL(file));
    return objectURLs.get(file);
  });

  try {
    const extension = model.name.split('.').at(-1).toLowerCase();
    let root;
    let animations = [];
    if (extension === 'glb' || extension === 'gltf') {
      const data = await model.arrayBuffer();
      const gltf = await new GLTFLoader(manager).setDRACOLoader(draco).parseAsync(data, resourceBase);
      root = gltf.scene;
      animations = gltf.animations;
    } else if (extension === 'obj') {
      const source = await model.text();
      const loader = new OBJLoader(manager);
      const libraries = [...source.matchAll(/^\s*mtllib\s+(.+?)\r?$/gm)];
      if (libraries.length && files.some(file => /\.mtl$/i.test(file.name))) {
        const name = libraries[0][1].trim();
        const file = resolveSidecar(new URL(name, resourceBase).href);
        loader.setMaterials(new MTLLoader(manager).parse(await file.text(), new URL('.', new URL(name, resourceBase)).href));
      }
      root = loader.parse(source);
      if (objectURLs.size) {
        // OBJ material textures are scheduled by MTLLoader during synchronous parsing.
        await new Promise((resolve, reject) => {
          manager.onLoad = resolve;
          manager.onError = url => reject(new Error(`Could not load texture: ${url}`));
        });
      }
    } else {
      const geometry = new STLLoader().parse(await model.arrayBuffer());
      root = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color: geometry.hasColors ? 0xffffff : 0xbec6d1,
        vertexColors: Boolean(geometry.hasColors), roughness: 0.55,
      }));
    }
    if (!root) throw new Error('This file does not contain a scene.');
    return { root, animations, name: model.name };
  } finally {
    for (const url of objectURLs.values()) URL.revokeObjectURL(url);
  }
}

export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  root.traverse(object => {
    if (object.isSkinnedMesh) object.skeleton.dispose();
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of [object.material].flat()) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) {
    if (texture.image?.close) images.add(texture.image);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const geometry of geometries) geometry.dispose();
}
