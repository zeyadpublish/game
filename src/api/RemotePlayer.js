import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const ASSETS = `${import.meta.env?.BASE_URL || new URL('../../public/', import.meta.url).href}assets/`;
export class RemotePlayer {
  constructor(sceneManager, data) {
    this.sceneManager = sceneManager; this.id = data.playerId; this.name = data.name || 'Operator'; this.health = data.health ?? 100;
    this.group = new THREE.Group(); this.target = new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0); this.group.position.copy(this.target);
    this._fallback(); this._label(); sceneManager.add(this.group); this.loadModel();
  }
  _fallback() { const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(.32, 1.15, 5, 10), new THREE.MeshStandardMaterial({ color: '#137f9a', roughness: .55 })); mesh.position.y = 1.1; mesh.castShadow = true; this.group.add(mesh); }
  _label() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 74; const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(2, 10, 16, .82)'; ctx.fillRect(4, 4, 248, 66); ctx.fillStyle = '#dcfbff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.name.slice(0, 18), 128, 30); ctx.fillStyle = '#28d3e8'; ctx.fillRect(28, 44, 200, 8);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false })); sprite.position.y = 2.8; sprite.scale.set(2.8, .8, 1); this.group.add(sprite);
  }
  async loadModel() { try { const model = await new FBXLoader().loadAsync(`${ASSETS}models/soldier/Swat.fbx`); model.scale.setScalar(.01); model.traverse((item) => { if (item.isMesh) item.castShadow = true; }); this.group.clear(); this.group.add(model); this._label(); } catch { /* fallback remains */ } }
  apply(data) { this.target.set(data.x || 0, data.y || 0, data.z || 0); this.health = data.health ?? this.health; this.group.rotation.y = data.yaw || 0; }
  update(delta) { this.group.position.lerp(this.target, Math.min(1, delta * 12)); }
  dispose() { this.sceneManager.remove(this.group); }
}
