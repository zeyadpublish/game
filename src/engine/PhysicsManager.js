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
  _playerBox(position, radius) {
    return new THREE.Box3(
      new THREE.Vector3(position.x - radius, position.y + 0.1, position.z - radius),
      new THREE.Vector3(position.x + radius, position.y + 1.8, position.z + radius),
    );
  }
  _isBlocked(position, radius, boxes = this.colliders) {
    const probe = this._playerBox(position, radius);
    return boxes.some((box) => box.intersectsBox(probe));
  }
  findOpenPosition(preferred, radius = 0.45) {
    const origin = preferred.clone(); origin.y = this.getGroundHeight(origin);
    if (!this._isBlocked(origin, radius)) return origin;
    for (let distance = 3; distance <= 45; distance += 3) {
      for (let step = 0; step < 16; step++) {
        const angle = (step / 16) * Math.PI * 2;
        const candidate = origin.clone().add(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
        candidate.y = this.getGroundHeight(candidate);
        if (!this._isBlocked(candidate, radius)) return candidate;
      }
    }
    return origin;
  }
  resolveMove(current, attempted, radius = 0.45) {
    // Ignore boxes that already contain the player. This prevents a malformed
    // city collider from trapping the spawn point and freezing all controls.
    const currentProbe = this._playerBox(current, radius);
    const blockers = this.colliders.filter((box) => !box.intersectsBox(currentProbe));
    if (!this._isBlocked(attempted, radius, blockers)) return attempted;
    const xOnly = current.clone(); xOnly.x = attempted.x;
    if (!this._isBlocked(xOnly, radius, blockers)) return xOnly;
    const zOnly = current.clone(); zOnly.z = attempted.z;
    if (!this._isBlocked(zOnly, radius, blockers)) return zOnly;
    return current.clone();
  }
}
