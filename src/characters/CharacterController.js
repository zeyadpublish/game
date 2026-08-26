import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const ASSETS = `${import.meta.env?.BASE_URL || new URL('../../public/', import.meta.url).href}assets/`;
const playerLoader = new FBXLoader();
let playerModelPromise;
let playerAnimationPromise;

function loadPlayerAssets() {
  playerModelPromise ??= playerLoader.loadAsync(`${ASSETS}models/soldier/Swat.fbx`);
  playerAnimationPromise ??= Promise.allSettled([
    ['idle', 'idle.fbx'],
    ['walk', 'walk forward.fbx'],
    ['run', 'run forward.fbx'],
    ['jump', 'jump up.fbx'],
  ].map(async ([name, file]) => [name, await playerLoader.loadAsync(`${ASSETS}models/soldier/animations/${file}`)]))
    .then((results) => Object.fromEntries(results.filter((result) => result.status === 'fulfilled').map((result) => result.value)));
  return Promise.all([playerModelPromise, playerAnimationPromise]);
}

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
    this.group.name = 'local-player-soldier';
    this.group.visible = false;
    this.sceneManager.add(this.group);
    this.stepClock = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.jumpSpeed = 8.5;
    this.gravity = 26;
    this.loadModel();
  }
  async loadModel() {
    try {
      const [source, animations] = await loadPlayerAssets();
      const model = cloneSkinned(source);
      model.scale.setScalar(0.01);
      model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      this.group.add(model);
      this.mixer = new THREE.AnimationMixer(model); this.actions = {};
      Object.entries(animations).forEach(([name, animation]) => {
        const clip = animation.animations?.[0]; if (!clip) return;
        const action = this.mixer.clipAction(clip);
        if (name === 'jump') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = false; }
        this.actions[name] = action;
      });
      this._playAnimation('idle'); this.group.visible = true;
    } catch { /* First person remains playable with no local body mesh. */ }
  }
  reset(position = new THREE.Vector3(0, 0, 8)) {
    this.position.copy(position); this.health = 100; this.armor = 150; this.dead = false; this.pitch = 0; this.verticalVelocity = 0; this.grounded = true;
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
    const resolved = this.physics.resolveMove(this.position, attempted);
    const groundHeight = this.physics.getGroundHeight(resolved);
    const wantsJump = this.input.consumeJump();
    if (this.grounded && wantsJump) { this.verticalVelocity = this.jumpSpeed; this.grounded = false; this._playAnimation('jump'); }
    this.verticalVelocity -= this.gravity * delta;
    resolved.y = this.position.y + this.verticalVelocity * delta;
    if (resolved.y <= groundHeight) { resolved.y = groundHeight; this.verticalVelocity = 0; this.grounded = true; }
    this.position.copy(resolved);
    this.group.position.copy(this.position).addScaledVector(forward, .72);
    this.group.rotation.y = this.yaw + Math.PI;
    this.mixer?.update(delta);
    if (this.grounded) this._playAnimation(moving ? (this.input.sprint ? 'run' : 'walk') : 'idle');
    const camera = this.sceneManager.camera;
    camera.position.set(this.position.x, this.position.y + (crouching ? 1.15 : 1.72), this.position.z);
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    if (moving) {
      this.stepClock += delta * speed;
      if (this.stepClock > 3.3) { this.stepClock = 0; this.onStep?.(); }
    } else this.stepClock = 0;
  }
  _playAnimation(name) {
    const next = this.actions?.[name];
    if (!next || this.activeAction === next) return;
    this.activeAction?.fadeOut(.12); next.reset().fadeIn(.12).play(); this.activeAction = next;
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
