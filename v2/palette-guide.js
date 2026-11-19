import * as THREE from 'three';

export function installPaletteGuide({ applyLight, applyTint }) {
  const $ = id => document.getElementById(id);
  const base = $('palette-base');
  const mode = $('palette-mode');
  const target = $('palette-target');
  const message = $('palette-message');
  const swatches = $('palette-swatches');
  const harmonies = {
    complementary: [[0, -.21], [0, 0], [.5, .05], [.5, -.15], [0, .21], [.5, .22]],
    analogous: [[-.085, -.18], [0, 0], [.085, .08], [-.085, .18], [0, .23], [.085, -.20]],
    monochrome: [[0, -.26], [0, 0], [0, .23], [0, -.13], [0, .10], [0, .32]],
    triadic: [[0, -.20], [0, 0], [1 / 3, .04], [2 / 3, .04], [1 / 3, .22], [2 / 3, .22]],
  };
  function render() {
    const { h, s, l } = new THREE.Color(base.value).getHSL({}, THREE.SRGBColorSpace);
    swatches.replaceChildren();
    for (const [offset, lightness] of harmonies[mode.value]) {
      const colour = new THREE.Color().setHSL(h + offset, s, THREE.MathUtils.clamp(l + lightness, .08, .94), THREE.SRGBColorSpace);
      const hex = '#' + colour.getHexString();
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = hex;
      button.style.setProperty('--swatch', hex);
      const luminance = .2126 * colour.r + .7152 * colour.g + .0722 * colour.b;
      button.style.setProperty('--swatch-text', luminance > .179 ? '#000' : '#fff');
      button.onclick = () => {
        if (target.value === 'part') {
          message.textContent = applyTint(hex) ? '' : 'Select a mesh in Pose and edit parts.';
        } else {
          $(target.value).value = hex;
          applyLight();
          message.textContent = '';
        }
      };
      swatches.append(button);
    }
  }
  base.addEventListener('input', render);
  mode.addEventListener('change', render);
  target.addEventListener('change', () => { message.textContent = ''; });
  render();
}
