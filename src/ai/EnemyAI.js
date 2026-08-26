import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const ASSETS = `${import.meta.env?.BASE_URL || new URL('../../public/', import.meta.url).href}assets/`;
const enemyLoader = new FBXLoader();
let soldierTemplatePromise;
let animationTemplatesPromise;

function loadSharedSoldierAssets() {
  soldierTemplatePromise ??= enemyLoader.loadAsync(`${ASSETS}models/soldier/Swat.fbx`);
  animationTemplatesPromise ??= Promise.allSettled([
    ['idle', 'idle.fbx'],
    ['combat', 'idle aiming.fbx'],
    ['run', 'run forward.fbx'],
    ['death', 'death from front.fbx'],
  ].map(async ([name, file]) => [name, await enemyLoader.loadAsync(`${ASSETS}models/soldier/animations/${file}`)]))
    .then((results) => Object.fromEntries(results.filter((result) => result.status === 'fulfilled').map((result) => result.value)));
  return Promise.all([soldierTemplatePromise, animationTemplatesPromise]);
}

export class EnemyAI {
  constructor({ sceneManager, physicsManager, spawn, player, variant = 'grunt', onKilled, onAttack }) {
    this.sceneManager = sceneManager; this.physics = physicsManager; this.player = player; this.variant = variant;
    this.onKilled = onKilled; this.onAttack = onAttack;
    this.group = new THREE.Group(); this.group.position.copy(spawn); this.group.visible = false; this.group.name = `enemy-${variant}`;
    this.group.userData.enemy = this;
    this.sceneManager.add(this.group); this.physics.registerTarget(this.group);
    this.health = variant === 'heavy' ? 155 : 80; this.dead = false; this.state = 'IDLE'; this.attackClock = Math.random();
    this.patrolAnchor = spawn.clone(); this.patrolAngle = Math.random() * Math.PI * 2; this.speed = variant === 'heavy' ? 2.2 : 3.7;
    this._makeFallback(); this.ready = this.load();
  }
  _makeFallback() {
    const material = new THREE.MeshStandardMaterial({ color: this.variant === 'heavy' ? '#5c2d38' : '#263743', roughness: .65, metalness: .15 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.34, 1.1, 5, 10), material); torso.position.y = 1.15; torso.name = 'body'; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#b38a72' })); head.position.y = 1.94; head.name = 'head'; head.castShadow = true;
    this.group.add(torso, head); this.group.traverse((child) => { child.userData.enemy = this; });
  }
  async load() {
    try {
      const [source, animations] = await loadSharedSoldierAssets();
      const model = cloneSkinned(source);
      model.scale.setScalar(.01); model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; child.userData.enemy = this; } });
      this.group.clear(); this.group.add(model);
      this.mixer = new THREE.AnimationMixer(model); this.actions = {};
      Object.entries(animations).forEach(([name, animation]) => {
        const clip = animation.animations?.[0]; if (!clip) return;
        const action = this.mixer.clipAction(clip);
        if (name === 'death') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
        this.actions[name] = action;
      });
      this._playAnimation('idle');
    } catch { /* fallback target remains usable */ }
    this.group.position.y = this.physics.getGroundHeight(this.group.position);
    this.group.visible = true;
  }
  update(delta) {
    if (!this.group.visible) return;
    this.mixer?.update(delta);
    if (this.dead) return;
    this.group.position.y = this.physics.getGroundHeight(this.group.position);
    const toPlayer = this.player.position.clone().sub(this.group.position); toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance < 28) this.state = distance < 13 ? (this.variant === 'heavy' ? 'CROUCH_COMBAT' : 'COMBAT') : 'CHASE';
    else this.state = 'PATROL';
    let moving = false;
    if (this.state === 'PATROL') {
      this.patrolAngle += delta * .36;
      const target = this.patrolAnchor.clone().add(new THREE.Vector3(Math.sin(this.patrolAngle) * 5, 0, Math.cos(this.patrolAngle) * 5));
      moving = this._moveToward(target, delta * .5);
    } else if (this.state === 'CHASE') moving = this._moveToward(this.player.position, delta);
    if (distance < 20) this.group.lookAt(this.player.position.x, this.group.position.y, this.player.position.z);
    this._playAnimation(moving ? 'run' : this.state.includes('COMBAT') ? 'combat' : 'idle');
    if (this.state.includes('COMBAT')) {
      this.attackClock += delta;
      if (this.attackClock > (this.variant === 'heavy' ? 1.15 : .78)) {
        this.attackClock = 0; this.onAttack?.(this, this.variant === 'heavy' ? 16 : 10);
      }
    }
  }
  _moveToward(target, delta) {
    const direction = target.clone().sub(this.group.position); direction.y = 0;
    if (direction.lengthSq() < 2) return false;
    direction.normalize();
    const attempted = this.group.position.clone().add(direction.multiplyScalar(this.speed * delta));
    this.group.position.copy(this.physics.resolveMove(this.group.position, attempted, .38));
    this.group.lookAt(target.x, this.group.position.y, target.z);
    return true;
  }
  _playAnimation(name) {
    const next = this.actions?.[name];
    if (!next || this.activeAction === next) return;
    this.activeAction?.fadeOut(.16);
    next.reset().fadeIn(.16).play();
    this.activeAction = next;
  }
  takeDamage(amount) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0; this.dead = true; this.state = 'DEAD'; this.physics.unregisterTarget(this.group);
      if (this.actions?.death) this._playAnimation('death'); else this.group.rotation.z = .9;
      this.onKilled?.(this);
    }
  }
  dispose() { this.physics.unregisterTarget(this.group); this.sceneManager.remove(this.group); }
}
