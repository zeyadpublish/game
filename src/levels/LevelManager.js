import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { EnemyAI } from '../ai/EnemyAI.js';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;
const LEVELS = {
  1: { name: 'Civic District', mood: { background: '#7d98aa', fog: '#7d98aa', near: 92, far: 255, sun: 3 }, enemies: 8, heavies: 2 },
  2: { name: 'Foundry Transit', mood: { background: '#715844', fog: '#715844', near: 48, far: 155, sun: 1.4, exposure: .9 }, enemies: 13, heavies: 3 },
  3: { name: 'Blackout Quarter', mood: { background: '#071421', fog: '#071421', near: 34, far: 132, sun: .25, exposure: .75 }, enemies: 17, heavies: 4 },
};

export class LevelManager {
  constructor({ sceneManager, physicsManager, player, audioManager, onAllEnemiesKilled, onEnemyAttack, onEnemyKilled }) {
    this.sceneManager = sceneManager; this.physics = physicsManager; this.player = player; this.audio = audioManager;
    this.onAllEnemiesKilled = onAllEnemiesKilled; this.onEnemyAttack = onEnemyAttack; this.onEnemyKilled = onEnemyKilled;
    this.objects = []; this.enemies = []; this.ground = null; this.currentLevel = 1;
  }
  async loadLevel(levelNumber, onAllEnemiesKilled = this.onAllEnemiesKilled, skipEnemies = false) {
    this.clear(); this.currentLevel = levelNumber; this.onAllEnemiesKilled = onAllEnemiesKilled;
    const config = LEVELS[levelNumber] || LEVELS[1];
    this.sceneManager.setMood(config.mood);
    this._addGround(levelNumber);
    if (levelNumber === 1) {
      // The supplied city FBX is an optional high-detail showcase. Its draw
      // count can freeze touch devices, so gameplay uses the light district.
      const showDetailedCity = new URLSearchParams(location.search).get('detail') === '1';
      if (showDetailedCity) await this._loadCity();
      else { this._buildArena(1); this._addUrbanLandmarks(); }
    }
    else this._buildArena(levelNumber);
    this.player.reset(this.spawnPoint());
    if (!skipEnemies) this._spawnEnemies(config);
    return config;
  }
  spawnPoint() {
    const preferred = this.currentLevel === 2 ? new THREE.Vector3(0, 0, 20) : new THREE.Vector3(0, 0, 10);
    return this.physics.findOpenPosition(preferred);
  }
  _addGround(level) {
    const colors = ['#485763', '#4a3c32', '#0c1922'];
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240, 1, 1),
      new THREE.MeshStandardMaterial({ color: colors[level - 1], roughness: .96, metalness: .04 }),
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground';
    this.sceneManager.add(ground); this.objects.push(ground); this.ground = ground; this.physics.setGround([ground]);
  }
  async _loadCity() {
    try {
      const city = await new FBXLoader().loadAsync(`${ASSETS}models/environment/city.fbx`);
      city.rotation.x = -Math.PI / 2; city.updateMatrixWorld(true);
      const before = new THREE.Box3().setFromObject(city); const size = before.getSize(new THREE.Vector3());
      const scale = 180 / Math.max(size.x || 1, size.z || 1); city.scale.setScalar(scale); city.updateMatrixWorld(true);
      const colliders = [];
      city.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const name = mesh.name.toLowerCase(); const box = new THREE.Box3().setFromObject(mesh); const dimensions = box.getSize(new THREE.Vector3());
        let material;
        if (name.includes('glass') || name.includes('window')) material = new THREE.MeshStandardMaterial({ color: '#1b7891', metalness: .55, roughness: .16, transparent: true, opacity: .58, emissive: '#07394a', emissiveIntensity: .45 });
        else if (name.includes('road') || name.includes('asphalt')) material = new THREE.MeshStandardMaterial({ color: '#20262a', roughness: .92 });
        else if (dimensions.y > 20) material = new THREE.MeshStandardMaterial({ color: '#202b4b', metalness: .25, roughness: .6, emissive: '#080a20', emissiveIntensity: .3 });
        else material = new THREE.MeshStandardMaterial({ color: '#59616c', metalness: .12, roughness: .82 });
        mesh.material = material; mesh.castShadow = true; mesh.receiveShadow = true;
        const footprint = dimensions.x * dimensions.z;
        const isBuildingSized = dimensions.y > 2 && dimensions.x > 1.3 && dimensions.z > 1.3 && dimensions.x < 38 && dimensions.z < 38 && footprint < 800;
        if (colliders.length < 100 && isBuildingSized) colliders.push(box);
      });
      this.sceneManager.add(city); this.objects.push(city); this.physics.setColliders(colliders);
      this._addUrbanLandmarks();
    } catch (error) {
      console.warn('City model unavailable; rendering original fallback district.', error);
      this._buildArena(1);
    }
  }
  _addUrbanLandmarks() {
    const positions = [[-33, -32, 15, 10], [32, -32, 18, 8], [-45, 23, 12, 18], [30, 28, 10, 22], [-12, 45, 20, 6]];
    positions.forEach(([x, z, width, height], i) => this._building(x, z, width, height, '#273750', i % 2 ? '#8bd6ff' : '#d9b67a'));
  }
  _buildArena(level) {
    const palettes = level === 2 ? ['#42352c', '#72553b', '#b48348'] : level === 3 ? ['#102130', '#17354a', '#4bd7ff'] : ['#273750', '#41546a', '#a2d5e8'];
    const layout = level === 2
      ? [[-38, -26, 18, 8], [38, -22, 12, 16], [-25, 18, 16, 12], [23, 20, 23, 7], [0, -44, 40, 4], [0, 43, 42, 5]]
      : [[-35, -28, 18, 14], [36, -28, 14, 21], [-38, 28, 16, 19], [36, 27, 18, 12], [0, 47, 34, 4], [0, -48, 38, 5]];
    layout.forEach(([x, z, width, height], i) => this._building(x, z, width, height, palettes[i % 2], palettes[2]));
    for (let i = -3; i <= 3; i++) this._crate(i * 7, level === 2 ? 2 : -4, level === 2 ? '#5b4634' : '#213a49');
    if (level === 2) this._industrialSet(); if (level === 3) this._nightSet();
  }
  _building(x, z, width, height, color, accent) {
    const heightY = height;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, heightY, width * .7), new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .2, emissive: accent, emissiveIntensity: .045 }));
    mesh.position.set(x, heightY / 2, z); mesh.castShadow = mesh.receiveShadow = true; this.sceneManager.add(mesh); this.objects.push(mesh);
    this.physics.colliders.push(new THREE.Box3().setFromObject(mesh));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width * .65, .18, .05), new THREE.MeshBasicMaterial({ color: accent }));
    strip.position.set(x, heightY * .72, z - width * .35 - .04); this.sceneManager.add(strip); this.objects.push(strip);
  }
  _crate(x, z, color) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .18 }));
    crate.position.set(x, 1.25, z); crate.castShadow = crate.receiveShadow = true; this.sceneManager.add(crate); this.objects.push(crate);
    this.physics.colliders.push(new THREE.Box3().setFromObject(crate));
  }
  _industrialSet() {
    for (let i = -3; i <= 3; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 8), new THREE.MeshStandardMaterial({ color: '#2a2826', metalness: .85, roughness: .3 }));
      post.position.set(i * 9, 4, -8); post.castShadow = true; this.sceneManager.add(post); this.objects.push(post);
      this.physics.colliders.push(new THREE.Box3().setFromObject(post));
    }
    const catwalk = new THREE.Mesh(new THREE.BoxGeometry(64, .35, 4), new THREE.MeshStandardMaterial({ color: '#3c3730', metalness: .85, roughness: .4 }));
    catwalk.position.set(0, 7, -8); catwalk.castShadow = catwalk.receiveShadow = true; this.sceneManager.add(catwalk); this.objects.push(catwalk);
  }
  _nightSet() {
    this.player.flashlight = new THREE.SpotLight('#cbefff', 16, 70, .42, .6, 1.2);
    this.player.flashlight.position.set(0, 0, 0); this.player.flashlight.target.position.set(0, 0, -10);
    this.sceneManager.camera.add(this.player.flashlight, this.player.flashlight.target);
    [-28, 0, 28].forEach((x) => {
      const light = new THREE.PointLight('#26bfe8', 10, 25, 2); light.position.set(x, 6, -18); this.sceneManager.add(light); this.objects.push(light);
    });
  }
  _spawnEnemies(config) {
    const all = config.enemies + config.heavies;
    for (let i = 0; i < all; i++) {
      const angle = (i / all) * Math.PI * 2 + .4; const radius = 28 + (i % 4) * 8;
      const spawn = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const enemy = new EnemyAI({
        sceneManager: this.sceneManager, physicsManager: this.physics, spawn, player: this.player,
        variant: i >= config.enemies ? 'heavy' : 'grunt',
        onAttack: (unit, damage) => this.onEnemyAttack?.(unit, damage),
        onKilled: (unit) => this._enemyKilled(unit),
      });
      this.enemies.push(enemy);
    }
  }
  _enemyKilled(enemy) {
    this.onEnemyKilled?.(enemy);
    if (this.enemies.every((unit) => unit.dead)) this.onAllEnemiesKilled?.(this.currentLevel);
  }
  update(delta) { this.enemies.forEach((enemy) => enemy.update(delta)); }
  clear() {
    this.enemies.forEach((enemy) => enemy.dispose()); this.enemies = [];
    this.objects.forEach((object) => this.sceneManager.remove(object)); this.objects = [];
    this.physics.setColliders([]); this.physics.setGround([]);
    if (this.player.flashlight) { this.sceneManager.camera.remove(this.player.flashlight, this.player.flashlight.target); this.player.flashlight = null; }
  }
}
