import * as THREE from 'three';

export class AudioManager {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.context = this.listener.context;
    this.enabled = false;
  }
  unlock() {
    if (this.context.state === 'suspended') this.context.resume();
    this.enabled = true;
  }
  tone(frequency, duration = 0.05, volume = 0.03, type = 'square') {
    if (!this.enabled || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
  gunshot() { this.tone(105, 0.09, 0.06, 'sawtooth'); this.tone(58, 0.11, 0.035, 'square'); }
  reload() { this.tone(540, 0.045, 0.02, 'triangle'); setTimeout(() => this.tone(730, 0.04, 0.018, 'triangle'), 190); }
  footstep() { this.tone(75, 0.025, 0.012, 'triangle'); }
  hit() { this.tone(860, 0.045, 0.025, 'square'); }
  kill() { this.tone(320, 0.1, 0.035, 'sine'); setTimeout(() => this.tone(620, 0.12, 0.025, 'sine'), 70); }
}
