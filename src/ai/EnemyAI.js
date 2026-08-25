import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

export class EnemyAI {
  constructor({ sceneManager, physicsManager, spawn, player, variant = 'grunt', onKilled, onAttack }) {
    this.sceneManager = sceneManager; this.physics = physicsManager; this.player = player; this.variant = variant;
    this.onKilled = onKilled; this.onAttack = onAttack;
    this.group = new THREE.Group(); this.group.position.copy(spawn); this.group.visible = true; this.group.name = `enemy-${variant}`;
    this.group.userData.enemy = this;
    this.sceneManager.add(this.group); this.physics.registerTarget(this.group);
    this.health = variant === 'heavy' ? 155 : 80; this.dead = false; this.state = 'IDLE'; this.attackClock = Math.random();
    this.patrolAnchor = spawn.clone(); this.patrolAngle = Math.random() * Math.PI * 2; this.speed = variant === 'heavy' ? 2.2 : 3.7;
    this._makeFallback();
    this.ready = new URLSearchParams(location.search).get('detail') === '1' ? this.load() : Promise.resolve();
  }
  _makeFallback() {
    const material = new THREE.MeshStandardMaterial({ color: this.variant === 'heavy' ? '#5c2d38' : '#263743', roughness: .65, metalness: .15 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.34, 1.1, 5, 10), material); torso.position.y = 1.15; torso.name = 'body'; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#b38a72' })); head.position.y = 1.94; head.name = 'head'; head.castShadow = true;
    this.group.add(torso, head); this.group.traverse((child) => { child.userData.enemy = this; });
  }
  async load() {
    try {
      const [model, idle] = await Promise.all([
        new FBXLoader().loadAsync(`${ASSETS}models/soldier/Swat.fbx`),
        new FBXLoader().loadAsync(`${ASSETS}models/soldier/animations/idle.fbx`),
      ]);
      model.scale.setScalar(.01); model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; child.userData.enemy = this; } });
      this.group.clear(); this.group.add(model);
      if (idle.animations?.[0]) { this.mixer = new THREE.AnimationMixer(model); this.mixer.clipAction(idle.animations[0]).play(); }
    } catch { /* fallback target remains usable */ }
    this.group.position.y = this.physics.getGroundHeight(this.group.position);
    this.group.visible = true;
  }
  update(delta) {
    if (this.dead || !this.group.visible) return;
    this.group.position.y = this.physics.getGroundHeight(this.group.position);
    this.mixer?.update(delta);
    const toPlayer = this.player.position.clone().sub(this.group.position); toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance < 28) this.state = distance < 13 ? (this.variant === 'heavy' ? 'CROUCH_COMBAT' : 'COMBAT') : 'CHASE';
    else this.state = 'PATROL';
    if (this.state === 'PATROL') {
      this.patrolAngle += delta * .36;
      const target = this.patrolAnchor.clone().add(new THREE.Vector3(Math.sin(this.patrolAngle) * 5, 0, Math.cos(this.patrolAngle) * 5));
      this._moveToward(target, delta * .5);
    } else if (this.state === 'CHASE') this._moveToward(this.player.position, delta);
    if (distance < 20) this.group.lookAt(this.player.position.x, this.group.position.y, this.player.position.z);
    if (this.state.includes('COMBAT')) {
      this.attackClock += delta;
      if (this.attackClock > (this.variant === 'heavy' ? 1.15 : .78)) {
        this.attackClock = 0; this.onAttack?.(this, this.variant === 'heavy' ? 16 : 10);
      }
    }
  }
  _moveToward(target, delta) {
    const direction = target.clone().sub(this.group.position); direction.y = 0;
    if (direction.lengthSq() < 2) return;
    direction.normalize();
    const attempted = this.group.position.clone().add(direction.multiplyScalar(this.speed * delta));
    this.group.position.copy(this.physics.resolveMove(this.group.position, attempted, .38));
    this.group.lookAt(target.x, this.group.position.y, target.z);
  }
  takeDamage(amount) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0; this.dead = true; this.state = 'DEAD'; this.physics.unregisterTarget(this.group);
      this.group.rotation.z = .9; this.onKilled?.(this);
    }
  }
  dispose() { this.physics.unregisterTarget(this.group); this.sceneManager.remove(this.group); }
}
