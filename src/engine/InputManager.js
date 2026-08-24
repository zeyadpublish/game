import * as THREE from 'three';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.look = new THREE.Vector2();
    this.fire = false;
    this.ads = false;
    this.reloadRequested = false;
    this.interactRequested = false;
    this.virtualMove = new THREE.Vector2();
    this.virtualLook = new THREE.Vector2();
    this.enabled = false;
    this._bind();
  }
  _bind() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.reloadRequested = true;
      if (e.code === 'KeyE') this.interactRequested = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    }, { capture: true });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), { capture: true });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas && this.enabled) this.look.add(e.movementX, e.movementY);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      // Lets laptop users aim while dragging even when a browser declines pointer lock.
      if (this.enabled && e.pointerType === 'mouse' && e.buttons && document.pointerLockElement !== this.canvas) this.look.add(e.movementX, e.movementY);
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement !== this.canvas) {
        const lockRequest = this.canvas.requestPointerLock?.();
        lockRequest?.catch?.(() => {});
      }
      if (e.button === 0) this.fire = true;
      if (e.button === 2) this.ads = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.fire = false; if (e.button === 2) this.ads = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  }
  get movement() {
    return new THREE.Vector2((this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.virtualMove.x, (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) + this.virtualMove.y).clampLength(0, 1);
  }
  get sprint() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  get crouch() { return this.keys.has('ControlLeft') || this.keys.has('KeyC'); }
  consumeLook() { const look = this.look.clone().add(this.virtualLook); this.look.set(0, 0); this.virtualLook.set(0, 0); return look; }
  consumeReload() { const result = this.reloadRequested; this.reloadRequested = false; return result; }
  consumeInteract() { const result = this.interactRequested; this.interactRequested = false; return result; }
  clear() { this.keys.clear(); this.fire = false; this.ads = false; this.virtualMove.set(0, 0); this.virtualLook.set(0, 0); }
  setEnabled(value) { this.enabled = value; if (!value && document.pointerLockElement === this.canvas) document.exitPointerLock(); }
}
