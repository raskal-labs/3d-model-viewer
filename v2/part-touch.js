import * as THREE from 'three';

export function installPartTouch({ surface, toggle, toolbar, camera, modelTools, invalidate, stopSpin }) {
  const buttons = [...toolbar.querySelectorAll('[data-part-tool]')];
  const picker = new THREE.Raycaster();
  let mode = 'move', touch;

  function rayAt(x, y) {
    const rect = surface.getBoundingClientRect();
    picker.setFromCamera(new THREE.Vector2(
      2 * (x - rect.left) / rect.width - 1, 1 - 2 * (y - rect.top) / rect.height,
    ), camera.active);
    return picker.ray;
  }

  function rayPart(x, y) {
    const root = modelTools.root();
    if (!root) return null;
    root.updateWorldMatrix(true, true);
    rayAt(x, y);
    const hits = picker.intersectObject(root, true);
    return hits.find(({ object }) => {
      if (!object.isMesh || object.userData.modelRune) return false;
      for (let parent = object; parent; parent = parent.parent) {
        if (!parent.visible) return false;
      }
      return true;
    })?.object;
  }

  function startTransform(part, x, y) {
    const { object, edit, unit } = part;
    object.updateWorldMatrix(true, false);
    const { active } = camera;
    if (mode === 'move') {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        active.getWorldDirection(new THREE.Vector3()), object.getWorldPosition(new THREE.Vector3()),
      );
      const start = rayAt(x, y).intersectPlane(plane, new THREE.Vector3());
      if (!start) return () => ({});
      const inverse = new THREE.Matrix4().copy(object.parent.matrixWorld).invert();
      const origin = start.clone().applyMatrix4(inverse);
      return (dx, dy) => {
        const point = rayAt(x + dx, y + dy).intersectPlane(plane, new THREE.Vector3());
        if (!point) return {};
        const local = point.applyMatrix4(inverse).sub(origin).divideScalar(unit);
        return { move: local.toArray().map((value, i) => THREE.MathUtils.clamp(edit.move[i] + value, -2, 2)) };
      };
    }
    if (mode === 'scale') {
      return (_, dy) => ({ scale: THREE.MathUtils.clamp(edit.scale * Math.exp(-dy / 140), .05, 5) });
    }
    const worldToPart = object.getWorldQuaternion(new THREE.Quaternion()).invert();
    const right = new THREE.Vector3().setFromMatrixColumn(active.matrixWorld, 0).applyQuaternion(worldToPart);
    const up = new THREE.Vector3().setFromMatrixColumn(active.matrixWorld, 1).applyQuaternion(worldToPart);
    const before = new THREE.Quaternion().setFromEuler(new THREE.Euler(...edit.rotate.map(THREE.MathUtils.degToRad)));
    const turn = new THREE.Quaternion();
    const tilt = new THREE.Quaternion();
    const rotation = new THREE.Euler();
    return (dx, dy) => {
      turn.setFromAxisAngle(up, dx * .009);
      tilt.setFromAxisAngle(right, dy * .009);
      rotation.setFromQuaternion(tilt.premultiply(turn).premultiply(before));
      return { rotate: [rotation.x, rotation.y, rotation.z].map(THREE.MathUtils.radToDeg) };
    };
  }

  function finish(cancel) {
    if (!touch) return;
    const { id, drag } = touch;
    touch = null;
    if (drag) drag.end(cancel);
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }

  toggle.addEventListener('click', () => {
    finish(true);
    surface.hidden = toolbar.hidden = !surface.hidden;
    toggle.setAttribute('aria-pressed', String(!surface.hidden));
    if (!surface.hidden) stopSpin();
    invalidate();
  });
  for (const button of buttons) {
    button.addEventListener('click', () => {
      finish(true);
      mode = button.dataset.partTool;
      for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    });
  }
  surface.addEventListener('pointerdown', event => {
    if (touch || !event.isPrimary || event.button !== 0) return;
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    surface.setPointerCapture(touch.id);
  });
  function moveTo(event) {
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    if (!touch.drag) {
      if (Math.hypot(dx, dy) < 7) return;
      if (modelTools.selected() === modelTools.root()) {
        const hit = rayPart(touch.x, touch.y);
        if (hit) modelTools.selectObject(hit);
      }
      const part = modelTools.beginGesture();
      if (!part) return;
      touch.drag = part;
      touch.transform = startTransform(part, touch.x, touch.y);
    }
    touch.drag.preview(touch.transform(dx, dy));
  }
  surface.addEventListener('pointermove', event => {
    if (touch?.id === event.pointerId) moveTo(event);
  });
  surface.addEventListener('pointerup', event => {
    if (touch?.id !== event.pointerId) return;
    moveTo(event);
    if (!touch.drag) {
      const hit = rayPart(event.clientX, event.clientY);
      if (hit) modelTools.selectObject(hit);
    }
    finish(false);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    surface.addEventListener(type, event => { if (touch?.id === event.pointerId) finish(true); });
  }
  return { get enabled() { return !surface.hidden; }, cancel: () => finish(true) };
}
