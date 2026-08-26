import * as THREE from 'three';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label', 'Game viewport');
    this.keys = new Set();
    this.look = new THREE.Vector2();
    this.fire = false;
    this.ads = false;
    this.reloadRequested = false;
    this.jumpRequested = false;
    this.interactRequested = false;
    this.virtualMove = new THREE.Vector2();
    this.virtualLook = new THREE.Vector2();
    this.lockedMove = new THREE.Vector2();
    this.movementLocked = false;
    this.enabled = false;
    this.dragLook = false;
    this.pointerLocked = false;
    this._bind();
  }
  _bind() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const code = this._keyCode(e);
      this.keys.add(code);
      if (code === 'KeyR') this.reloadRequested = true;
      if (code === 'Space') this.jumpRequested = true;
      if (code === 'KeyE') this.interactRequested = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) e.preventDefault();
    }, { capture: true });
    window.addEventListener('keyup', (e) => this.keys.delete(this._keyCode(e)), { capture: true });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas && this.enabled) this.look.add(e.movementX, e.movementY);
    });
    document.addEventListener('pointermove', (e) => {
      // Click-drag remains a usable camera fallback when a browser denies lock.
      if (this.enabled && this.dragLook && e.pointerType === 'mouse' && document.pointerLockElement !== this.canvas) this.look.add(e.movementX, e.movementY);
    }, { capture: true });
    document.addEventListener('pointerup', () => { this.dragLook = false; }, { capture: true });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      this.canvas.classList.toggle('pointer-locked', this.pointerLocked);
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      this.canvas.focus({ preventScroll: true });
      this.captureMouse();
      if (e.button === 0) { this.dragLook = true; this.fire = true; }
      if (e.button === 2) this.ads = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.fire = false; if (e.button === 2) this.ads = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  }
  _keyCode(event) {
    const key = event.key?.toLowerCase();
    const aliases = { w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', r: 'KeyR', e: 'KeyE', c: 'KeyC', ' ': 'Space', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', shift: 'ShiftLeft', control: 'ControlLeft' };
    return aliases[key] || event.code || event.key;
  }
  get movement() {
    return new THREE.Vector2(
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) + this.virtualMove.x + (this.movementLocked ? this.lockedMove.x : 0),
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) + this.virtualMove.y + (this.movementLocked ? this.lockedMove.y : 0),
    ).clampLength(0, 1);
  }
  get sprint() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  get crouch() { return this.keys.has('ControlLeft') || this.keys.has('KeyC'); }
  consumeLook() { const look = this.look.clone().add(this.virtualLook); this.look.set(0, 0); this.virtualLook.set(0, 0); return look; }
  consumeReload() { const result = this.reloadRequested; this.reloadRequested = false; return result; }
  consumeJump() { const result = this.jumpRequested; this.jumpRequested = false; return result; }
  requestJump() { this.jumpRequested = true; }
  consumeInteract() { const result = this.interactRequested; this.interactRequested = false; return result; }
  captureMouse() {
    if (!this.enabled || this.pointerLocked || !this.canvas.requestPointerLock) return;
    try {
      const request = this.canvas.requestPointerLock({ unadjustedMovement: true });
      request?.catch?.(() => this.canvas.requestPointerLock?.());
    } catch { this.canvas.requestPointerLock(); }
  }
  toggleMovementLock() {
    if (this.movementLocked) {
      this.movementLocked = false; this.lockedMove.set(0, 0); return false;
    }
    this.lockedMove.copy(this.virtualMove);
    if (this.lockedMove.lengthSq() < 0.02) this.lockedMove.set(0, 1);
    else this.lockedMove.normalize();
    this.movementLocked = true;
    return true;
  }
  clear() { this.keys.clear(); this.fire = false; this.ads = false; this.jumpRequested = false; this.dragLook = false; this.movementLocked = false; this.virtualMove.set(0, 0); this.virtualLook.set(0, 0); this.lockedMove.set(0, 0); }
  setEnabled(value) { this.enabled = value; if (!value) { this.clear(); if (document.pointerLockElement === this.canvas) document.exitPointerLock(); } }
}
