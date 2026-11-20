import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createResonanceAccents } from './resonance-effects.js';

const modes = new Map([['banana-cel', 1], ['banana-ps1', 2], ['legacy-pixel', 3],
  ['legacy-watercolour', 4], ['legacy-ink', 5], ['legacy-mono', 6]]);

const outputTreatment = `
  varying vec2 vUv;
  uniform sampler2D tDiffuse, tNormal, tDepth;
  uniform vec2 screenSize, retroSize;
  uniform int mode;
  uniform bool outline, vignette;
  float luma(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
  float noise(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float bayer2(vec2 p) { return 2. * p.x + 3. * p.y - 4. * p.x * p.y; }
  float bayer4(vec2 p) {
    vec2 q = mod(floor(p), 4.);
    return (4. * bayer2(mod(q, 2.)) + bayer2(floor(q / 2.)) + .5) / 16. - .5;
  }
  float edgeAt(vec2 uv, vec2 stepUv) {
    vec3 normal = texture2D(tNormal, uv).xyz;
    vec2 dx = vec2(stepUv.x, 0.), dy = vec2(0., stepUv.y);
    float normals = max(max(distance(normal, texture2D(tNormal, uv + dx).xyz),
                            distance(normal, texture2D(tNormal, uv - dx).xyz)),
                        max(distance(normal, texture2D(tNormal, uv + dy).xyz),
                            distance(normal, texture2D(tNormal, uv - dy).xyz)));
    float depth = texture2D(tDepth, uv).r;
    float outside = max(step(.999999, texture2D(tDepth, uv + dx).r),
                        step(.999999, texture2D(tDepth, uv + dy).r));
    return max(smoothstep(.24, .50, normals), outside) * (1. - step(.999999, depth));
  }
  void main() {
    bool pixel = mode == 2 || mode == 3;
    vec2 uv = pixel ? (floor(vUv * retroSize) + .5) / retroSize : vUv;
    vec4 color = texture2D(tDiffuse, uv);
    if (outline || mode == 1 || mode == 3 || mode == 5) {
      float edge = edgeAt(uv, pixel ? 1. / retroSize : 1.25 / screenSize);
      color.rgb = mix(color.rgb, vec3(.068, .06, .058), edge * .79);
    }
    if ((mode == 4 || mode == 5 || mode == 6) && texture2D(tDepth, uv).r < .999999) {
      float lightness = luma(color.rgb);
      if (mode == 4) {
        float grain = noise(floor(gl_FragCoord.xy * .72));
        color.rgb = mix(color.rgb, vec3(.97, .945, .90), clamp(.12 + lightness * .18 + (grain - .5) * .17, 0., .6));
      } else if (mode == 5) {
        float hatch = step(2., mod(gl_FragCoord.x + gl_FragCoord.y, 7.));
        float shade = mix(.12, .88, smoothstep(.12, .80, lightness));
        color.rgb = vec3(mix(shade, .84, hatch * .55));
      } else {
        color.rgb = vec3(floor(lightness * 8. + .5) / 8.);
      }
    }
    if (pixel && texture2D(tDepth, uv).r < .999999) {
      float steps = mode == 2 ? 31. : 15.;
      float dither = bayer4(vUv * retroSize) * .9;
      color.rgb = clamp(floor(color.rgb * steps + dither + .5) / steps, 0., 1.);
    }
    if (vignette) color.rgb *= 1. - .37 * smoothstep(.25, .70, length(vUv - .5));
    gl_FragColor = color;
  }`;

function createAccents(scene) {
  const group = new THREE.Group();
  const ribbons = new THREE.Group();
  const sparks = new THREE.Group();
  group.add(ribbons, sparks);
  scene.add(group);

  const pointCount = 120;
  const ribbonPalette = [0x45d8ff, 0xa884ff, 0x73ffbc].map(color => new THREE.Color(color));
  const strips = ribbonPalette.map((color, index) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(new Float32Array((pointCount + 1) * 6), 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    const triangles = [];
    for (let point = 0; point < pointCount; point++) {
      const start = point * 2;
      triangles.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
    }
    geometry.setIndex(triangles);
    const strip = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: color.clone().multiplyScalar(1.55), transparent: true,
      blending: THREE.AdditiveBlending, opacity: .47 - index * .052,
      side: THREE.DoubleSide, depthWrite: false,
    }));
    strip.frustumCulled = false;
    ribbons.add(strip);
    return positions;
  });

  const geometry = new THREE.BufferGeometry();
  const count = 68;
  const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i * Math.PI * (3 - Math.sqrt(5));
    const r = 1.18 + (i % 11) * .103;
    positions.setXYZ(i, Math.cos(t) * r, (i % 17) / 5.6 - 1.45, Math.sin(t) * r);
    phases[i] = (i * 2.399963 + 1) % (2 * Math.PI);
  }
  geometry.setAttribute('position', positions);
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  const sparkMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, pointSize: { value: 12 },
      customTint: { value: 0 }, ink: { value: new THREE.Color() } },
    vertexShader: `
      uniform float uTime, pointSize;
      attribute float phase;
      varying float twinkle, tint;
      void main() {
        vec3 p = position;
        p.y += sin(phase + uTime * .55) * .23;
        p.x += cos(phase * 1.7 + uTime * .33) * .14;
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.);
        twinkle = .25 + pow(.5 + .5 * sin(phase * 3. + uTime * 1.5), 4.);
        tint = .5 + .5 * sin(phase);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(pointSize * (.65 + twinkle) / max(1.6, -viewPosition.z), 1.7, 8.);
      }`,
    fragmentShader: `
      varying float twinkle, tint;
      uniform float customTint;
      uniform vec3 ink;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        vec3 color = mix(vec3(.12, 1.7, 2.7), vec3(1.5, .5, 2.5), tint);
        color = mix(color, ink * (1.75 + tint), customTint);
        gl_FragColor = vec4(color, (1. - smoothstep(.08, 1., d)) * twinkle * .8);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  sparks.add(new THREE.Points(geometry, sparkMaterial));

  function update(time, colours) {
    if (ribbons.visible) strips.forEach((strip, band) => {
      ribbons.children[band].material.color.copy(colours.ribbons || ribbonPalette[band]).multiplyScalar(1.55);
      for (let i = 0; i <= pointCount; i++) {
        const t = i / pointCount * Math.PI * 2;
        const radius = 1.66 + band * .15 + Math.sin(t * 3 - time * .9 + band) * .085;
        const y = (band - 1) * .34 + Math.sin(t * 2 + time * .85 + band * 1.7) * .17
          + Math.sin(t * 5 - time * 1.1) * .045;
        const width = .022 + .017 * (.5 + .5 * Math.cos(t * 2 - time + band));
        strip.setXYZ(i * 2, Math.cos(t) * radius, y - width, Math.sin(t) * radius);
        strip.setXYZ(i * 2 + 1, Math.cos(t) * radius, y + width, Math.sin(t) * radius);
      }
      strip.needsUpdate = true;
    });
    sparkMaterial.uniforms.uTime.value = time;
    sparkMaterial.uniforms.customTint.value = Number(Boolean(colours.sparks));
    if (colours.sparks) sparkMaterial.uniforms.ink.value.copy(colours.sparks);
  }
  return { group, ribbons, sparks, update };
}

export function createEffects(renderer, scene) {
  const retroResolution = new THREE.Vector2(320, 240);
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthTexture: new THREE.DepthTexture(1, 1),
  });
  const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  const colorPass = new RenderPass(scene, null);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .62, .48, .69);
  const treatment = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null },
      screenSize: { value: new THREE.Vector2() }, retroSize: { value: retroResolution },
      mode: { value: 0 }, outline: { value: false }, vignette: { value: false },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: outputTreatment,
  });
  treatment.uniforms.tNormal.value = normalTarget.texture;
  treatment.uniforms.tDepth.value = normalTarget.depthTexture;
  treatment.uniforms.retroSize.value = retroResolution;
  const composer = new EffectComposer(renderer);
  composer.addPass(colorPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(treatment);
  const accents = createAccents(scene);
  const resonance = createResonanceAccents();
  accents.group.add(resonance.root);
  const clear = new THREE.Color();
  let time = 0;

  function resize(width, height) {
    composer.setSize(width, height);
    renderer.getDrawingBufferSize(treatment.uniforms.screenSize.value);
    normalTarget.setSize(treatment.uniforms.screenSize.value.x, treatment.uniforms.screenSize.value.y);
  }

  function render(camera, options, delta, grid) {
    const mode = modes.get(options.look) ?? 0;
    accents.ribbons.visible = options.ribbons;
    accents.sparks.visible = options.sparks;
    if (options.animate && (options.ribbons || options.sparks || options.resonance)) time += delta;
    const colours = options.colours;
    if (options.ribbons || options.sparks) accents.update(time, colours);
    resonance.update(options.resonance, time, grid.position.y, colours[options.resonance]);
    if (!mode && !options.bloom && !options.outline && !options.vignette) {
      renderer.render(scene, camera);
      return;
    }

    colorPass.camera = camera;
    bloom.enabled = options.bloom;
    bloom.strength = options.bloomStrength ?? .62;
    for (const tint of bloom.bloomTintColors) {
      if (colours.bloom) tint.set(colours.bloom.r, colours.bloom.g, colours.bloom.b);
      else tint.set(1, 1, 1);
    }
    treatment.enabled = Boolean(mode || options.outline || options.vignette);
    treatment.uniforms.mode.value = mode;
    treatment.uniforms.outline.value = Boolean(options.outline);
    treatment.uniforms.vignette.value = Boolean(options.vignette);
    const size = treatment.uniforms.screenSize.value;
    const pixels = mode === 3 ? 180 : 240;
    retroResolution.set(Math.max(1, Math.round(size.x / Math.max(1, size.y) * pixels)), pixels);
    if (mode || options.outline) {
      // Use the geometry buffer for outlines and to keep paper effects off the background.
      const background = scene.background;
      const oldGrid = grid.visible;
      const stoneEdges = options.stoneEdges;
      const oldStoneEdges = stoneEdges?.visible;
      const oldAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      try {
        grid.visible = false;
        accents.group.visible = false;
        if (stoneEdges) stoneEdges.visible = false;
        scene.background = null;
        scene.overrideMaterial = normalMaterial;
        renderer.setRenderTarget(normalTarget);
        renderer.setClearColor(0x8080ff, 0);
        renderer.clear();
        renderer.render(scene, camera);
      } finally {
        renderer.setRenderTarget(null);
        renderer.setClearColor(clear, oldAlpha);
        scene.background = background;
        scene.overrideMaterial = null;
        accents.group.visible = true;
        if (stoneEdges) stoneEdges.visible = oldStoneEdges;
        grid.visible = oldGrid;
      }
    }
    composer.render(delta);
  }

  return { retroResolution, resize, render };
}
