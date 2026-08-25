import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const ASSETS = `${import.meta.env?.BASE_URL || new URL('../../public/', import.meta.url).href}assets/`;

export class CharacterController {
  constructor({ sceneManager, physicsManager, inputManager, onDeath, onStep }) {
    this.sceneManager = sceneManager;
    this.physics = physicsManager;
    this.input = inputManager;
    this.onDeath = onDeath;
    this.onStep = onStep;
    this.position = new THREE.Vector3(0, 0, 8);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.health = 100;
    this.armor = 150;
    this.dead = false;
    this.walkSpeed = 8;
    this.sprintSpeed = 14;
    this.crouchSpeed = 3.5;
    this.group = new THREE.Group();
    this.group.name = 'local-player-shadow';
    this.group.visible = false;
    this.sceneManager.add(this.group);
    this.stepClock = 0;
    this.velocity = new THREE.Vector3();
    this.loadModel();
  }
  async loadModel() {
    try {
      const model = await new FBXLoader().loadAsync(`${ASSETS}models/soldier/Swat.fbx`);
      model.scale.setScalar(0.01);
      model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      this.group.add(model);
    } catch { /* First person remains playable with no local body mesh. */ }
  }
  reset(position = new THREE.Vector3(0, 0, 8)) {
    this.position.copy(position); this.health = 100; this.armor = 150; this.dead = false; this.pitch = 0;
    this.sceneManager.camera.fov = 75; this.sceneManager.camera.updateProjectionMatrix();
  }
  update(delta) {
    if (this.dead) return;
    const look = this.input.consumeLook();
    this.yaw -= look.x * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - look.y * 0.0022, -1.32, 1.32);
    const m = this.input.movement;
    const crouching = this.input.crouch;
    const speed = crouching ? this.crouchSpeed : this.input.sprint ? this.sprintSpeed : this.walkSpeed;
    const moving = m.lengthSq() > 0;
    if (moving) m.normalize();
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = forward.multiplyScalar(m.y).add(right.multiplyScalar(m.x)).multiplyScalar(speed * delta);
    const attempted = this.position.clone().add(move);
    this.position.copy(this.physics.resolveMove(this.position, attempted));
    this.position.y = this.physics.getGroundHeight(this.position);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    const camera = this.sceneManager.camera;
    camera.position.set(this.position.x, this.position.y + (crouching ? 1.15 : 1.72), this.position.z);
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    if (moving) {
      this.stepClock += delta * speed;
      if (this.stepClock > 3.3) { this.stepClock = 0; this.onStep?.(); }
    } else this.stepClock = 0;
  }
  takeDamage(amount, attacker = 'Hostile') {
    if (this.dead) return { healthDamage: 0, armorDamage: 0 };
    const armorDamage = Math.min(this.armor, amount * 0.6);
    const healthDamage = amount - armorDamage;
    this.armor -= armorDamage; this.health = Math.max(0, this.health - healthDamage);
    if (this.health <= 0) { this.dead = true; this.onDeath?.(attacker); }
    return { healthDamage, armorDamage };
  }
}
