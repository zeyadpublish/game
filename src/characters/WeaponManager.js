import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const ASSETS = `${import.meta.env?.BASE_URL || new URL('../../public/', import.meta.url).href}assets/`;

export class WeaponManager {
  constructor({ sceneManager, physicsManager, player, inputManager, audioManager, onHit, onKill, onShot }) {
    this.sceneManager = sceneManager; this.physics = physicsManager; this.player = player; this.input = inputManager;
    this.audio = audioManager; this.onHit = onHit; this.onKill = onKill; this.onShot = onShot;
    this.damage = 25; this.magazineSize = 30; this.currentAmmo = 30; this.reserveAmmo = 180;
    this.shotInterval = 60 / 600; this.shotClock = 0; this.reloading = false; this.recoil = 0;
    this.gunRoot = new THREE.Group(); this.gunRoot.name = 'view-weapon';
    this.sceneManager.camera.add(this.gunRoot);
    this._fallbackGun(); this.loadGun();
    this.flash = new THREE.PointLight('#d7f6ff', 0, 8, 2); this.gunRoot.add(this.flash);
  }
  _fallbackGun() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.9), new THREE.MeshStandardMaterial({ color: '#1d2632', metalness: .85, roughness: .25 }));
    body.rotation.y = Math.PI; body.position.set(.37, -.34, -.74); this.gunRoot.add(body);
    this.fallback = body;
  }
  async loadGun() {
    try {
      const model = await new OBJLoader().loadAsync(`${ASSETS}models/gun/gun.obj`);
      model.scale.setScalar(.045); model.rotation.set(0, Math.PI, 0); model.position.set(.43, -.5, -1.1);
      model.traverse((child) => { if (child.isMesh) { child.material = new THREE.MeshStandardMaterial({ color: '#384552', metalness: .75, roughness: .3, emissive: '#07101b' }); } });
      this.gunRoot.add(model); this.fallback.visible = false;
    } catch { /* compact procedural rifle is already in view */ }
  }
  update(delta) {
    this.shotClock += delta;
    if (this.input.consumeReload()) this.reload();
    if (this.input.fire && !this.reloading && this.shotClock >= this.shotInterval) this.shoot();
    const ads = this.input.ads ? 1 : 0;
    this.sceneManager.camera.fov = THREE.MathUtils.lerp(this.sceneManager.camera.fov, ads ? 45 : 75, Math.min(1, delta * 13));
    this.sceneManager.camera.updateProjectionMatrix();
    const targetX = ads ? 0 : .37, targetY = ads ? -.23 : -.34;
    this.gunRoot.position.x = THREE.MathUtils.lerp(this.gunRoot.position.x, targetX, delta * 14);
    this.gunRoot.position.y = THREE.MathUtils.lerp(this.gunRoot.position.y, targetY + Math.sin(performance.now() * .004) * .006, delta * 14);
    this.recoil = Math.max(0, this.recoil - delta * 8);
    this.gunRoot.rotation.x = -this.recoil;
    this.flash.intensity = Math.max(0, this.flash.intensity - delta * 80);
  }
  reload() {
    if (this.reloading || this.currentAmmo === this.magazineSize || this.reserveAmmo <= 0) return;
    this.reloading = true; this.audio.reload();
    setTimeout(() => {
      const need = this.magazineSize - this.currentAmmo; const loaded = Math.min(need, this.reserveAmmo);
      this.currentAmmo += loaded; this.reserveAmmo -= loaded; this.reloading = false;
    }, 1150);
  }
  shoot() {
    if (!this.currentAmmo) { this.reload(); return; }
    this.currentAmmo--; this.shotClock = 0; this.recoil = .07; this.flash.intensity = 11; this.audio.gunshot();
    const camera = this.sceneManager.camera;
    const origin = camera.getWorldPosition(new THREE.Vector3());
    const direction = camera.getWorldDirection(new THREE.Vector3());
    this.onShot?.(origin, direction);
    const hit = this.physics.raycast(origin, direction, 170, [this.player.group]);
    const end = hit ? hit.point : origin.clone().add(direction.multiplyScalar(85));
    this._tracer(origin, end);
    if (!hit) return;
    let node = hit.object, enemy;
    while (node && !enemy) { enemy = node.userData.enemy; node = node.parent; }
    if (enemy?.takeDamage) {
      const critical = hit.object.name.toLowerCase().includes('head');
      const dealt = critical ? this.damage * 1.55 : this.damage;
      enemy.takeDamage(dealt, critical ? 'HEADSHOT' : 'RIFLE');
      this.onHit?.(hit.point, dealt, critical);
      if (enemy.dead) this.onKill?.(enemy, critical);
    }
  }
  _tracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#c7f7ff', transparent: true, opacity: .9 }));
    this.sceneManager.scene.add(line);
    setTimeout(() => { this.sceneManager.scene.remove(line); geometry.dispose(); line.material.dispose(); }, 45);
  }
}
