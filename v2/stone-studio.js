import * as THREE from 'three';
import { readAppearance, writeAppearance } from './customization.js';

const $ = id => document.getElementById(id);
const motionModes = new Set(['off', 'hover', 'sway', 'turn']);
const colourModes = new Set(['off', 'pulse', 'spectrum']);
const effectModes = new Set(['off', 'ember', 'rune', 'edges']);
const inspectionLooks = new Set(['wireframe', 'material-id', 'normals']);

export function createStoneStudio(motionRoot, updateLook, invalidate) {
  const panel = $('stone-studio');
  const defaults = {
    motion: 'off', lift: 1, speed: 1, colourMotion: 'off', accent: '#72c7ff',
    effect: 'off', tint: '#8de4ff', strength: .7,
    playing: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  const fields = {
    motion: $('stone-motion'), lift: $('stone-lift'), speed: $('stone-speed'),
    colourMotion: $('stone-colour-motion'), accent: $('stone-motion-colour'),
    effect: $('stone-effect'), tint: $('stone-effect-colour'), strength: $('stone-effect-strength'),
    playing: $('stone-playing'),
  };
  const edgeGroup = new THREE.Group();
  edgeGroup.visible = false;
  motionRoot.add(edgeGroup);
  const edgeMaterial = new THREE.LineBasicMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const surfaceMaterials = new Map();
  const edgeLines = new Map();
  const effectColour = new THREE.Color();
  const targetColour = new THREE.Color();
  const accentColour = new THREE.Color();
  const inverseMotion = new THREE.Matrix4();
  const uniforms = {
    studioStoneEffect: { value: 0 },
    studioStoneColour: { value: effectColour },
    studioStoneOrigin: { value: new THREE.Vector3() },
    studioStoneSize: { value: new THREE.Vector3(1, 1, 1) },
    studioStoneLocal: { value: inverseMotion },
  };
  let stone, values = { ...defaults }, phase = 0, diameter = 1;

  function callsForMaterials(state) {
    return state.colourMotion !== 'off' || state.effect === 'ember';
  }

  function updateFields() {
    for (const [name, field] of Object.entries(fields)) {
      if (name === 'playing') field.checked = values.playing;
      else field.value = values[name];
    }
    fields.lift.disabled = values.motion === 'off';
    fields.accent.disabled = values.colourMotion !== 'pulse';
    fields.tint.disabled = fields.strength.disabled = values.effect === 'off';
  }

  function buildEdges() {
    if (edgeLines.size || !stone) return;
    for (const mesh of stone.surfaces) {
      if (!mesh.geometry?.getAttribute('position')) continue;
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 22), edgeMaterial);
      wire.matrixAutoUpdate = false;
      wire.frustumCulled = false;
      wire.renderOrder = 5;
      edgeGroup.add(wire);
      edgeLines.set(mesh, wire);
    }
  }

  function updateFrame() {
    if (!stone) return;
    const moving = values.motion !== 'off';
    const tilt = values.motion === 'sway';
    const turn = values.motion === 'turn';
    const lift = moving ? diameter * values.lift * (.09 + .045 * Math.sin(phase * 1.35)) : 0;
    motionRoot.position.set(0, lift, 0);
    motionRoot.rotation.set(tilt ? Math.sin(phase * .83) * .08 : 0,
      turn ? phase * .44 : tilt ? Math.sin(phase * .7) * .12 : 0,
      tilt ? Math.sin(phase * 1.1) * .095 : 0);
    motionRoot.updateWorldMatrix(true, false);
    inverseMotion.copy(motionRoot.matrixWorld).invert();

    const wave = .50 + .50 * Math.sin(phase * 1.8);
    const flicker = .68 + .24 * Math.sin(phase * 2.5) + .08 * Math.sin(phase * 4.7);
    effectColour.set(values.tint);
    uniforms.studioStoneEffect.value = values.effect === 'ember' ? values.strength * flicker : 0;
    if (values.effect === 'rune') stone.glyph?.pulse(values.strength * (.38 + wave * 1.35), effectColour);
    else stone.glyph?.pulse(0, effectColour);
    edgeGroup.visible = values.effect === 'edges' && values.strength > 0;
    if (edgeGroup.visible) {
      buildEdges();
      edgeMaterial.color.copy(effectColour).multiplyScalar(1.25 + flicker * .55);
      edgeMaterial.opacity = values.strength * (.46 + .43 * wave);
      for (const [mesh, wire] of edgeLines) {
        mesh.updateWorldMatrix(true, false);
        wire.matrix.multiplyMatrices(inverseMotion, mesh.matrixWorld);
        wire.matrixWorldNeedsUpdate = true;
        let visible = true;
        for (let node = mesh; node && node !== motionRoot; node = node.parent) visible &&= node.visible;
        wire.visible = visible;
      }
    }

    accentColour.set(values.accent);
    for (const [material, base] of surfaceMaterials) {
      if (!base.colour) continue;
      if (values.colourMotion === 'spectrum') {
        targetColour.setHSL(base.hue.h + phase * .076, Math.max(.38, base.hue.s), base.hue.l, THREE.SRGBColorSpace);
        material.color.copy(phase ? targetColour : base.colour);
      } else {
        material.color.copy(base.colour);
        if (values.colourMotion === 'pulse') material.color.lerp(accentColour, wave * .62);
      }
      if (base.attenuation) {
        material.attenuationColor.copy(base.attenuation);
        if (values.colourMotion !== 'off') material.attenuationColor.lerp(material.color, .56);
      }
    }
  }

  function apply(previousNeedsMaterials) {
    updateFields();
    if (previousNeedsMaterials !== callsForMaterials(values)) updateLook();
    updateFrame();
    invalidate();
  }

  for (const [name, field] of Object.entries(fields)) {
    field.addEventListener('input', () => {
      if (!stone) return;
      const previous = callsForMaterials(values);
      const original = defaults[name];
      values[name] = typeof original === 'number' ? Number(field.value) :
        typeof original === 'boolean' ? field.checked : field.value;
      apply(previous);
    });
    field.addEventListener('change', () => {
      if (stone) writeAppearance(stone.key, values);
    });
  }
  $('stone-reset').addEventListener('click', () => {
    if (!stone) return;
    const previous = callsForMaterials(values);
    values = { ...defaults };
    phase = 0;
    writeAppearance(stone.key, {});
    apply(previous);
  });

  return {
    edgeGroup,
    setAsset(asset, bounds) {
      for (const wire of edgeLines.values()) wire.geometry.dispose();
      edgeGroup.clear();
      edgeGroup.visible = false;
      edgeLines.clear();
      surfaceMaterials.clear();
      motionRoot.position.set(0, 0, 0);
      motionRoot.rotation.set(0, 0, 0);
      motionRoot.updateMatrixWorld(true);
      stone = asset;
      panel.hidden = !stone;
      phase = 0;
      values = { ...defaults };
      if (!stone) return;
      const saved = readAppearance(stone.key);
      for (const [name, allowed] of [['motion', motionModes], ['colourMotion', colourModes], ['effect', effectModes]]) {
        if (allowed.has(saved[name])) values[name] = saved[name];
      }
      for (const [name, min, max] of [['lift', .2, 2], ['speed', .25, 2.5], ['strength', 0, 1]]) {
        if (typeof saved[name] === 'number' && saved[name] >= min && saved[name] <= max) values[name] = saved[name];
      }
      for (const name of ['accent', 'tint']) {
        if (typeof saved[name] === 'string' && /^#[\da-f]{6}$/i.test(saved[name])) values[name] = saved[name];
      }
      if (typeof saved.playing === 'boolean') values.playing = saved.playing;
      bounds.getCenter(uniforms.studioStoneOrigin.value);
      bounds.getSize(uniforms.studioStoneSize.value).multiplyScalar(.5).max(new THREE.Vector3(.06, .06, .06));
      diameter = uniforms.studioStoneSize.value.length() * 1.5;
      updateFields();
      updateFrame();
    },
    usesMaterial(object, look) {
      return stone?.surfaces.has(object) && !inspectionLooks.has(look) && callsForMaterials(values);
    },
    resetMaterials() { surfaceMaterials.clear(); },
    prepareMaterial(material) {
      surfaceMaterials.set(material, {
        colour: material.color?.clone(), hue: material.color?.getHSL({}, THREE.SRGBColorSpace),
        attenuation: material.attenuationColor?.clone(),
      });
      if (!material.isMeshStandardMaterial) return;
      const previousCompile = material.onBeforeCompile;
      const previousKey = material.customProgramCacheKey();
      material.customProgramCacheKey = () => previousKey + ':studio-stone';
      material.onBeforeCompile = (shader, renderer) => {
        previousCompile.call(material, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = 'varying vec3 vStudioStonePosition;\n' + shader.vertexShader.replace(
          '#include <project_vertex>', '#include <project_vertex>\n vStudioStonePosition = (modelMatrix * vec4(transformed, 1.)).xyz;');
        shader.fragmentShader = `
          varying vec3 vStudioStonePosition;
          uniform float studioStoneEffect;
          uniform vec3 studioStoneColour, studioStoneOrigin, studioStoneSize;
          uniform mat4 studioStoneLocal;
        ` + shader.fragmentShader.replace('#include <opaque_fragment>', `
          vec3 studioStonePoint = ((studioStoneLocal * vec4(vStudioStonePosition, 1.)).xyz - studioStoneOrigin) / studioStoneSize;
          float studioStoneCore = exp(-3.5 * dot(studioStonePoint.xy, studioStonePoint.xy));
          float studioStoneFacing = abs(dot(normalize(vViewPosition), normal));
          outgoingLight += studioStoneColour * studioStoneCore * (.24 + .76 * studioStoneFacing) * studioStoneEffect;
          #include <opaque_fragment>
        `);
      };
    },
    refresh() { updateFrame(); },
    tick(delta) {
      if (!stone || !values.playing ||
          (values.motion === 'off' && values.colourMotion === 'off' && values.effect === 'off')) return false;
      phase += delta * values.speed;
      updateFrame();
      return true;
    },
  };
}
