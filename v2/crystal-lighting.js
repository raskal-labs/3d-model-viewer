import * as THREE from 'three';

// PhaseOne's reference frames share red, white and black. Use the blue from the 60 × 60 reference.
const red = new THREE.Color(0xce4a52);
const blue = new THREE.Color(0x5263c6);
const white = new THREE.Color(0xffffff);

export function isPhaseOneCrystal(asset) {
  const path = asset.libraryPath?.replace(/^\/+/, '');
  return /^p2\/media\/generated\/phaseone-crystal\/[^/]+\/model\.glb$/i.test(path ?? '');
}

export function crystalPartRole(object, source) {
  const name = object.name.toLowerCase();
  const material = source.name.toLowerCase();
  const isPupil = /(?:^|[._ -])pupil(?:[._ -]|$)/;
  if (isPupil.test(name) || isPupil.test(material) || material === 'black') return 'black';
  const isEye = /(?:^|[._ -])(?:eye|iris|sclera)(?:[._ -]|$)/;
  if (isEye.test(name) || isEye.test(material)) return 'eye';
  if (/(?:bill|beak|foot|feet|leg|tail)/.test(name)) return 'blue';
  return 'red';
}

export function createCrystalMaterial(source, role, mode, light) {
  const material = new THREE.MeshPhongMaterial({
    color: source.color ?? 0xffffff,
    map: source.map ?? null,
    vertexColors: source.vertexColors,
    side: source.side,
    opacity: source.opacity,
    transparent: source.transparent,
    alphaMap: source.alphaMap ?? null,
    alphaTest: source.alphaTest,
    depthWrite: source.depthWrite,
    depthTest: source.depthTest,
    flatShading: source.flatShading,
    toneMapped: false,
    fog: false,
  });
  material.customProgramCacheKey = () => 'phaseone-crystal-v1';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      spriteRed: { value: red },
      spriteBlue: { value: blue },
      spriteWhite: { value: white },
      spriteMovingWhite: { value: Number(mode === 'light') },
      spriteEye: { value: Number(role === 'eye') },
      spriteBlack: { value: Number(role === 'black') },
      spriteBlueFallback: { value: Number(role === 'blue') },
      spriteKeyDirection: light.direction,
      spriteKeyStrength: light.strength,
    });
    shader.fragmentShader = `
      uniform vec3 spriteRed, spriteBlue, spriteWhite, spriteKeyDirection;
      uniform float spriteMovingWhite, spriteEye, spriteBlack, spriteBlueFallback, spriteKeyStrength;
    ` + shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 ink = diffuseColor.rgb;
      float brightest = max(max(ink.r, ink.g), ink.b);
      float darkest = min(min(ink.r, ink.g), ink.b);
      bool sourceWhite = brightest > .72 && darkest > brightest * .83;
      bool sourceBlack = brightest < .012 && darkest >= brightest * .55;
      bool sourceNeutral = brightest - darkest < brightest * .12;
      bool blueInk = sourceNeutral ? spriteBlueFallback > .5 : ink.b > ink.r * 1.05;
      float keyLight = max(0., dot(normal, normalize(mat3(viewMatrix) * spriteKeyDirection)));
      keyLight *= clamp(spriteKeyStrength / 2.4, 0., 1.6);
      if (spriteBlack > .5) {
        outgoingLight = vec3(0.);
      } else if (sourceWhite && (spriteEye > .5 || spriteMovingWhite < .5)) {
        outgoingLight = spriteWhite;
      } else if (sourceBlack || (spriteEye < .5 && keyLight < .12)) {
        outgoingLight = vec3(0.);
      } else if (spriteEye < .5 && spriteMovingWhite > .5 && keyLight > .93) {
        outgoingLight = spriteWhite;
      } else {
        outgoingLight = blueInk ? spriteBlue : spriteRed;
      }
      #include <opaque_fragment>
    `);
  };
  return material;
}
