import * as THREE from 'three';

const tones = new THREE.DataTexture(new Uint8Array([34, 94, 173, 255]), 4, 1, THREE.RedFormat);
tones.minFilter = tones.magFilter = THREE.NearestFilter;
tones.generateMipmaps = false;
tones.needsUpdate = true;

const surfaceFields = ['side', 'transparent', 'opacity', 'alphaMap', 'alphaTest',
  'depthWrite', 'depthTest', 'wireframe', 'vertexColors', 'polygonOffset',
  'polygonOffsetFactor', 'polygonOffsetUnits'];

export function createLookMaterial(source, look, retroResolution) {
  let material;
  if (look === 'clay') {
    material = new THREE.MeshStandardMaterial({ color: 0xc5b7a1, roughness: .82, flatShading: source.flatShading });
  } else if (look === 'normals') {
    material = new THREE.MeshNormalMaterial({ flatShading: source.flatShading });
  } else if (look === 'unlit') {
    material = new THREE.MeshBasicMaterial({ color: source.color ?? 0xffffff, map: source.map ?? null });
  } else if (look === 'banana-cel' || look === 'legacy-pixel') {
    material = source.isMeshBasicMaterial ? source.clone() : new THREE.MeshToonMaterial({
      color: source.color ?? 0xffffff, map: source.map ?? null, gradientMap: tones,
      emissive: source.emissive ?? 0x000000, emissiveMap: source.emissiveMap ?? null,
      emissiveIntensity: source.emissiveIntensity ?? 1,
    });
  } else {
    material = source.clone();
  }
  for (const field of surfaceFields) if (source[field] !== undefined && field in material) {
    material[field] = source[field];
  }

  if (look === 'banana-ps1') {
    // Screen-space vertex snap. Keep the source material and its texture bindings.
    material.customProgramCacheKey = () => 'studio-ps1';
    material.onBeforeCompile = shader => {
      shader.uniforms.uRetroGrid = { value: retroResolution };
      shader.vertexShader = 'uniform vec2 uRetroGrid;\n' + shader.vertexShader.replace(
        '#include <project_vertex>', `
        #include <project_vertex>
        if (gl_Position.w > 0.0) {
          vec2 projected = gl_Position.xy / gl_Position.w;
          vec2 grid = uRetroGrid * 0.5;
          vec2 snapped = round(projected * grid) / grid;
          gl_Position.xy = mix(projected, snapped, 0.72) * gl_Position.w;
        }`);
    };
  }
  if (look === 'resonance-mineral' && material.isMeshStandardMaterial) {
    // Add a mineral rim after lighting. The GLB keeps its own transmission and opacity.
    material.customProgramCacheKey = () => 'studio-mineral';
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float mineralEdge = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 3.0);
        vec3 mineralTint = mix(vec3(0.13, 0.54, 0.85), diffuseColor.rgb, 0.33);
        outgoingLight += mineralTint * mineralEdge * (0.48 + 0.27 * metalnessFactor);
        #include <opaque_fragment>
      `);
    };
  }
  return material;
}
