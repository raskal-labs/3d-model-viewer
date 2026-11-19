import * as THREE from 'three';

const $ = id => document.getElementById(id);
const defaultEdit = { move: [0, 0, 0], rotate: [0, 0, 0], scale: 1, hidden: false, tint: null };
const degrees = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;

export function installModelTools({ invalidate, refreshLook, frameModel, setStatus }) {
  const nodeSelect = $('model-part');
  const fields = [...document.querySelectorAll('[data-transform]')];
  const playback = $('play-animation');
  const time = $('clip-time');
  const clip = $('animation-clip');
  const rate = $('clip-speed');
  const loop = $('clip-loop');
  const rotation = new THREE.Euler();
  const turn = new THREE.Quaternion();
  let asset, mixer, action, unit, playhead = 0, direction = 1;
  let nodes = new Map(), edits = new Map(), originals = new Map();
  const undo = [], redo = [];

  function updateTransport() {
    const duration = action?.getClip().duration ?? 0;
    const seconds = action ? playhead : 0;
    time.value = String(duration > 0 ? clamp(seconds / duration, 0, 1) * 1000 : 0);
    $('clip-readout').textContent = seconds.toFixed(2) + ' / ' + duration.toFixed(2) + ' s';
  }

  function withoutEdits(change) {
    for (const [object, base] of originals) {
      object.position.copy(base.position);
      object.quaternion.copy(base.quaternion);
      object.scale.copy(base.scale);
      object.visible = base.visible;
    }
    originals.clear();
    change?.();
    for (const [id, edit] of edits) {
      const object = nodes.get(id).object;
      originals.set(object, {
        position: object.position.clone(), quaternion: object.quaternion.clone(),
        scale: object.scale.clone(), visible: object.visible,
      });
      object.position.x += edit.move[0] * unit;
      object.position.y += edit.move[1] * unit;
      object.position.z += edit.move[2] * unit;
      rotation.set(...edit.rotate.map(degrees));
      object.quaternion.multiply(turn.setFromEuler(rotation));
      object.scale.multiplyScalar(edit.scale);
      if (edit.hidden) object.visible = false;
    }
    invalidate();
  }

  function sample(seconds) {
    playhead = seconds;
    withoutEdits(() => {
      action.time = playhead;
      mixer.update(0);
    });
    updateTransport();
  }

  function selectClip() {
    if (!mixer) return;
    withoutEdits(() => {
      mixer.stopAllAction();
      action = mixer.clipAction(asset.animations[Number(clip.value)]);
      action.play();
      playhead = 0;
      direction = 1;
      mixer.update(0);
    });
    updateTransport();
  }

  clip.addEventListener('change', selectClip);
  loop.addEventListener('change', () => { direction = 1; });
  playback.addEventListener('change', () => {
    if (playback.checked && action && loop.value === 'once' && playhead >= action.getClip().duration) sample(0);
    invalidate();
  });
  time.addEventListener('input', () => {
    if (!action) return;
    playback.checked = false;
    direction = 1;
    sample(action.getClip().duration * Number(time.value) / 1000);
  });

  function showPart() {
    const current = nodes.get(nodeSelect.value);
    const edit = edits.get(nodeSelect.value) ?? defaultEdit;
    for (const field of fields) {
      const { transform, axis } = field.dataset;
      const value = transform === 'scale' ? edit.scale : edit[transform][Number(axis)];
      field.value = transform === 'move' ? Math.round(value * 10000) / 100 : value;
    }
    $('part-hidden').checked = edit.hidden;
    $('part-hidden').disabled = !current || Boolean(current.object.isBone);
    $('part-tint-enabled').disabled = !current?.object.isMesh;
    $('part-tint-enabled').checked = Boolean(edit.tint);
    $('part-tint').value = edit.tint ?? '#83b9e5';
    $('part-tint').disabled = !current?.object.isMesh || !edit.tint;
    $('undo-model-edit').disabled = !undo.length;
    $('redo-model-edit').disabled = !redo.length;
    $('reset-part').disabled = !edits.has(nodeSelect.value);
    $('reset-pose').disabled = !edits.size;
    $('save-pose').disabled = !edits.size;
  }

  function replaceEdits(next) {
    const changesTint = [...new Set([...edits.keys(), ...next.keys()])]
      .some(id => edits.get(id)?.tint !== next.get(id)?.tint);
    edits = next;
    withoutEdits();
    if (changesTint) refreshLook();
    showPart();
  }

  function commit(next) {
    undo.push(edits);
    if (undo.length > 50) undo.shift();
    redo.length = 0;
    replaceEdits(next);
  }

  function updatePart(change) {
    const id = nodeSelect.value;
    if (!nodes.has(id)) return;
    playback.checked = false;
    const edit = { ...(edits.get(id) ?? defaultEdit), ...change };
    const next = new Map(edits);
    if (JSON.stringify(edit) === JSON.stringify(defaultEdit)) next.delete(id);
    else next.set(id, edit);
    commit(next);
  }

  nodeSelect.addEventListener('change', showPart);
  for (const field of fields) {
    field.addEventListener('change', () => {
      const { transform, axis } = field.dataset;
      if (field.value === '' || !field.checkValidity()) return showPart();
      const value = Number(field.value);
      if (transform === 'scale') {
        updatePart({ scale: value });
      } else {
        const vector = [...(edits.get(nodeSelect.value) ?? defaultEdit)[transform]];
        vector[Number(axis)] = transform === 'move' ? value / 100 : value;
        updatePart({ [transform]: vector });
      }
    });
  }
  $('part-hidden').addEventListener('change', event => updatePart({ hidden: event.target.checked }));
  $('part-tint-enabled').addEventListener('change', event => updatePart({
    tint: event.target.checked ? $('part-tint').value : null,
  }));
  $('part-tint').addEventListener('change', event => updatePart({ tint: event.target.value }));
  $('reset-part').addEventListener('click', () => {
    const next = new Map(edits);
    next.delete(nodeSelect.value);
    commit(next);
  });
  $('reset-pose').addEventListener('click', () => commit(new Map()));
  $('undo-model-edit').addEventListener('click', () => {
    if (!undo.length) return;
    redo.push(edits);
    replaceEdits(undo.pop());
  });
  $('redo-model-edit').addEventListener('click', () => {
    if (!redo.length) return;
    undo.push(edits);
    replaceEdits(redo.pop());
  });
  $('frame-edits').addEventListener('click', frameModel);

  $('save-pose').addEventListener('click', () => {
    const parts = [...edits].map(([id, value]) => ({ id, name: nodes.get(id).name, ...value }));
    const json = JSON.stringify({ version: 1, model: asset.name, parts }, null, 2);
    downloadFile(new Blob([json], { type: 'application/json' }), asset.name + '.pose.json');
  });
  $('open-pose').addEventListener('click', () => $('pose-file').click());
  $('pose-file').addEventListener('change', async event => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    const loadedAsset = asset;
    try {
      if (file.size > 1024 * 1024) throw new Error('Pose file exceeds 1 MB.');
      const { version, model, parts } = JSON.parse(await file.text());
      if (loadedAsset !== asset) return;
      if (version !== 1 || model !== asset.name || !Array.isArray(parts) || parts.length > nodes.size) {
        throw new Error('Open the matching model before loading this pose.');
      }
      const next = new Map();
      for (const part of parts) {
        const { id, name, move, rotate, scale, hidden, tint } = part;
        const node = nodes.get(id);
        const validVector = (values, max) => Array.isArray(values) && values.length === 3 &&
          values.every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max);
        if (!node || node.name !== name || next.has(id) || !validVector(move, 2) || !validVector(rotate, 360) ||
            typeof scale !== 'number' || !(scale >= .05 && scale <= 5) ||
            typeof hidden !== 'boolean' || (hidden && node.object.isBone) ||
            (tint !== null && (!node.object.isMesh || !/^#[\da-f]{6}$/i.test(tint)))) {
          throw new Error('This pose contains an invalid or mismatched model part.');
        }
        next.set(id, { move, rotate, scale, hidden, tint });
      }
      playback.checked = false;
      commit(next);
      setStatus('');
    } catch (error) {
      if (loadedAsset === asset) setStatus(error.message || 'Could not open pose.', true);
    }
  });

  return {
    setAsset(next, size) {
      if (mixer && asset) { mixer.stopAllAction(); mixer.uncacheRoot(asset.root); }
      asset = next;
      unit = size;
      edits = new Map();
      originals = new Map();
      nodes = new Map();
      undo.length = redo.length = 0;
      nodeSelect.replaceChildren();
      function addNodes(object, path, depth) {
        if (!depth || object.isMesh || object.isBone) {
          const name = depth ? object.name || (object.isBone ? 'Bone' : 'Mesh') : 'Whole model';
          const type = object.isBone ? ' · Bone' : object.isMesh && depth ? ' · Mesh' : '';
          nodeSelect.add(new Option(' '.repeat(Math.min(depth, 8)) + name + type, path));
          nodes.set(path, { object, name });
        }
        object.children.forEach((child, index) => addNodes(child, path + '/' + index, depth + 1));
      }
      addNodes(next.root, 'root', 0);
      clip.replaceChildren(...next.animations.map((item, index) => new Option(item.name || ('Clip ' + (index + 1)), index)));
      action = null;
      mixer = next.animations.length ? new THREE.AnimationMixer(next.root) : null;
      $('animation-control').hidden = $('animation-editor').hidden = !mixer;
      playback.checked = Boolean(mixer) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      time.disabled = !mixer;
      selectClip();
      showPart();
    },
    update(delta) {
      if (!action || !playback.checked) return false;
      const duration = action.getClip().duration;
      if (!(duration > 0)) return false;
      const step = delta * Number(rate.value);
      if (loop.value === 'pingpong') {
        const phase = ((direction > 0 ? playhead : 2 * duration - playhead) + step) % (2 * duration);
        direction = phase < duration ? 1 : -1;
        sample(direction > 0 ? phase : 2 * duration - phase);
      } else if (loop.value === 'once') {
        const next = Math.min(duration, playhead + step);
        sample(next);
        if (next === duration) playback.checked = false;
      } else {
        sample((playhead + step) % duration);
      }
      return true;
    },
    tintFor(object) {
      for (const [id, edit] of edits) {
        if (edit.tint && nodes.get(id).object === object) return edit.tint;
      }
      return null;
    },
    applyTint(colour) {
      if (!nodes.get(nodeSelect.value)?.object.isMesh) return false;
      updatePart({ tint: colour });
      return true;
    },
  };
}

export function downloadFile(blob, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
