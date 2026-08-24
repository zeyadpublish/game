import * as THREE from 'three';

export class PhysicsManager {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.groundObjects = [];
    this.bulletTargets = [];
    this.colliders = [];
    this.down = new THREE.Vector3(0, -1, 0);
  }
  setGround(objects) { this.groundObjects = objects.filter(Boolean); }
  setColliders(boxes) { this.colliders = boxes; }
  registerTarget(target) { if (!this.bulletTargets.includes(target)) this.bulletTargets.push(target); }
  unregisterTarget(target) { this.bulletTargets = this.bulletTargets.filter((item) => item !== target); }
  getGroundHeight(position) {
    if (!this.groundObjects.length) return 0;
    this.raycaster.set(new THREE.Vector3(position.x, position.y + 60, position.z), this.down);
    const hit = this.raycaster.intersectObjects(this.groundObjects, true)[0];
    return hit ? hit.point.y : 0;
  }
  raycast(origin, direction, maxDistance = 160, excludeObjects = []) {
    this.raycaster.far = maxDistance;
    this.raycaster.set(origin, direction.normalize());
    const excluded = new Set(excludeObjects);
    const objects = this.bulletTargets.filter((target) => !excluded.has(target));
    return this.raycaster.intersectObjects(objects, true)[0] || null;
  }
  resolveMove(current, attempted, radius = 0.45) {
    const probe = new THREE.Box3(
      new THREE.Vector3(attempted.x - radius, attempted.y + 0.1, attempted.z - radius),
      new THREE.Vector3(attempted.x + radius, attempted.y + 1.8, attempted.z + radius),
    );
    if (this.colliders.some((box) => box.intersectsBox(probe))) return current.clone();
    return attempted;
  }
}
