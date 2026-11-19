import * as THREE from 'three';
import { createGestureNavigation } from '../gesture-navigation.js';

const radians = THREE.MathUtils.degToRad;
const degrees = THREE.MathUtils.radToDeg;
const defaultPose = { yaw: 31, pitch: 18, roll: 0 };
const views = {
  front: [0, 0], back: [180, 0], left: [-90, 0], right: [90, 0],
  top: [0, 90], bottom: [0, -90],
};
const fov = 40;
const slope = Math.tan(radians(fov / 2));

export function createCamera(canvas, onManual, onChange) {
  const perspective = new THREE.PerspectiveCamera(fov, 1, .01, 200);
  const orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 200);
  let camera = perspective;
  let aspect = 1, radius = 1, distance = 4;
  let yaw = defaultPose.yaw, pitch = defaultPose.pitch, roll = 0;
  const target = new THREE.Vector3();
  const center = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3();

  function update() {
    const a = radians(yaw);
    const b = radians(pitch);
    direction.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
    camera.position.copy(target).addScaledVector(direction, distance);
    // Keep the same compass orientation at the poles, where world-up is singular.
    right.set(Math.cos(a), 0, -Math.sin(a));
    camera.up.crossVectors(direction, right).normalize();
    camera.lookAt(target);
    camera.rotateZ(radians(roll));
    camera.updateMatrixWorld();
    if (camera.isOrthographicCamera) {
      const height = distance * slope;
      camera.left = -height * aspect;
      camera.right = height * aspect;
      camera.top = height;
      camera.bottom = -height;
    }
    camera.updateProjectionMatrix();
    navigation.update();
    onChange();
  }

  function zoomLimits() {
    return { min: Math.max(.09, radius * .22), max: Math.max(20, radius * 18) };
  }

  function setDistance(value) {
    const { min, max } = zoomLimits();
    distance = THREE.MathUtils.clamp(value, min, max);
    update();
  }

  function frame() {
    target.copy(center);
    ({ yaw, pitch, roll } = defaultPose);
    distance = radius / Math.sin(Math.atan(slope * Math.min(aspect, 1))) * 1.05;
    update();
  }

  const navigation = createGestureNavigation({
    canvas,
    getView: () => ({ yaw, pitch, roll, distance, target: target.toArray() }),
    applyView: view => {
      ({ yaw, pitch, roll, distance } = view);
      target.fromArray(view.target);
      update();
    },
    orbit: (x, y) => {
      yaw = THREE.MathUtils.euclideanModulo(yaw - x * .32 + 180, 360) - 180;
      pitch = THREE.MathUtils.clamp(pitch + y * .32, -90, 90);
      update();
    },
    pan: (x, y) => {
      const pixel = 2 * distance * slope / Math.max(1, canvas.clientHeight);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, -x * pixel).addScaledVector(up, y * pixel);
      update();
    },
    zoom: factor => setDistance(distance * factor),
    rollBy: delta => { roll += degrees(delta); update(); },
    getZoomLimits: zoomLimits,
    setDistance,
    reset: frame,
    onManual,
  });

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    onManual();
    setDistance(distance * Math.exp(THREE.MathUtils.clamp(event.deltaY * .0015, -.5, .5)));
  }, { passive: false });

  return {
    get active() { return camera; },
    resize(width, height) {
      aspect = width / Math.max(1, height);
      perspective.aspect = aspect;
      update();
    },
    setBounds(bounds) {
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      center.copy(sphere.center);
      radius = Math.max(.1, sphere.radius);
      navigation.clearHistory();
      frame();
    },
    projection(mode) {
      camera = mode === 'orthographic' ? orthographic : perspective;
      update();
    },
    snap(view) {
      [yaw, pitch] = views[view];
      roll = 0;
      update();
    },
    spin(delta) { yaw = (yaw + delta * 18) % 360; update(); },
    frame,
  };
}
