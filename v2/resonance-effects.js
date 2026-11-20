import * as THREE from 'three';

// The chamber's prism motion fits around the Studio's normalized model bounds.
function prismOrbit() {
  const root = new THREE.Group();
  const geometry = new THREE.OctahedronGeometry(1);
  const shards = Array.from({ length: 4 }, (_, index) => {
    const material = new THREE.MeshPhysicalMaterial({
      roughness: .16, metalness: .12, clearcoat: .7, ior: 1.53,
      iridescence: .68, emissiveIntensity: .55,
    });
    const shard = new THREE.Mesh(geometry, material);
    const size = .12 + index * .022;
    shard.scale.set(size, size * (1.8 + index * .13), size * .83);
    root.add(shard);
    return shard;
  });
  return { root, update(time, floor, colour) {
    shards.forEach((shard, index) => {
      const angle = index * Math.PI / 2 + .32 + time * (.20 + index * .021);
      const radius = 1.44 + index * .11 + Math.sin(time * .32 + index) * .10;
      shard.position.set(Math.cos(angle) * radius,
        Math.sin(angle + index * .7) * .76, Math.sin(angle) * radius);
      shard.rotation.set(.28 + Math.sin(angle) * .35, angle * 1.7, angle * .5);
      const hue = (index * .22 + time * .037) % 1;
      shard.material.color.setHSL(hue, .72, .55);
      shard.material.emissive.setHSL(hue, .84, .48);
      if (colour) {
        shard.material.color.lerp(colour, .93);
        shard.material.emissive.lerp(colour, .93);
      }
    });
  } };
}

// Translate the chamber's forked surface discharge to a spatial trace that
// works around a model of any shape without requiring chamber collision meshes.
function electricTrace() {
  const root = new THREE.Group();
  const segments = 40;
  const branches = 5;
  const positions = new THREE.BufferAttribute(new Float32Array((segments + branches * 3) * 6), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  const native = new THREE.Color(0x95d9ff);
  const material = new THREE.LineBasicMaterial({
    color: native.clone().multiplyScalar(2.7),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const trace = new THREE.LineSegments(geometry, material);
  trace.frustumCulled = false;
  root.add(trace);
  const position = (index, step, time, offset = 0) => {
    const angle = -.43 + step * 3.96 + time * .08 + offset * .34;
    const flick = Math.sin(index * 2.72 + Math.floor(time * 6) * 3.493);
    const radius = 1.56 + Math.sin(step * 6) * .16 + flick * .069 + offset * .42;
    return [Math.cos(angle) * radius, (step - .48) * 1.32 + flick * .09 + offset * .53,
      Math.sin(angle) * radius];
  };
  return { root, update(time, floor, colour) {
    material.color.copy(colour || native).multiplyScalar(2.7);
    for (let index = 0; index < segments; index++) {
      positions.setXYZ(index * 2, ...position(index, index / segments, time));
      positions.setXYZ(index * 2 + 1, ...position(index + 1, (index + 1) / segments, time));
    }
    for (let branch = 0; branch < branches; branch++) {
      const joint = 6 + branch * 7;
      for (let part = 0; part < 3; part++) {
        const vertex = (segments + branch * 3 + part) * 2;
        const direction = branch % 2 ? -.32 : .32;
        positions.setXYZ(vertex, ...position(joint + part, (joint + part) / segments, time, part * direction));
        positions.setXYZ(vertex + 1, ...position(joint + part + 1, (joint + part + 1) / segments, time, (part + 1) * direction));
      }
    }
    material.opacity = .67 + .18 * Math.sin(time * 2.4 + .4);
    positions.needsUpdate = true;
  } };
}

// The chamber pressure curtain's soft, travelling bands, scaled to a model.
function pressureTide() {
  const root = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(4.1, 3.5).rotateX(-Math.PI / 2);
  const palette = [0x628afe, 0x7ee4ef, 0x9978ff].map(tint => new THREE.Color(tint));
  const layers = palette.map((tint, index) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, phase: { value: index * 1.72 }, tint: { value: tint.clone() } },
      vertexShader: `
        varying vec2 vLocal;
        void main() {
          vLocal = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }`,
      fragmentShader: `
        uniform float time, phase;
        uniform vec3 tint;
        varying vec2 vLocal;
        void main() {
          vec2 p = vLocal;
          float mask = 1. - smoothstep(.4, 1.95, length(p * vec2(.91, 1.14)));
          float travel = sin(p.x * 2.26 + time * .92 + phase) * .34;
          float curtain = exp(-4.6 * abs(p.y + travel + .19 * cos(p.x * 4. + phase)));
          float shimmer = .57 + .43 * sin(p.x * 3. + p.y * 2. - time * .62 + phase);
          gl_FragColor = vec4(tint, mask * curtain * shimmer * .42);
          #include <colorspace_fragment>
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const layer = new THREE.Mesh(geometry, material);
    layer.rotation.y = index * 1.04 - .24;
    root.add(layer);
    return layer;
  });
  return { root, update(time, floor, colour) {
    root.position.y = floor;
    layers.forEach((layer, index) => {
      layer.position.y = .16 + index * .17 + Math.sin(time * .62 + index) * .085;
      layer.material.uniforms.time.value = time;
      layer.material.uniforms.tint.value.copy(palette[index]);
      if (colour) layer.material.uniforms.tint.value.lerp(colour, .93);
    });
  } };
}

export function createResonanceAccents() {
  const root = new THREE.Group();
  const effects = new Map([['prism', prismOrbit()], ['electric', electricTrace()], ['tide', pressureTide()]]);
  for (const effect of effects.values()) {
    effect.root.visible = false;
    root.add(effect.root);
  }
  let active;
  return { root, update(name, time, floor, colour) {
    const effect = effects.get(name);
    if (effect !== active) {
      if (active) active.root.visible = false;
      active = effect;
      if (active) active.root.visible = true;
    }
    active?.update(time, floor, colour);
  } };
}
