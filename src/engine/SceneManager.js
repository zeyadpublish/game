import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 650);
    this.camera.position.set(0, 1.7, 8);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.clock = new THREE.Clock();
    this.mixers = [];
    this._setLighting();
    addEventListener('resize', () => this.resize());
  }

  _setLighting() {
    this.scene.background = new THREE.Color('#7f9aae');
    this.scene.fog = new THREE.Fog('#7f9aae', 85, 280);
    this.scene.add(new THREE.HemisphereLight('#b7ddff', '#1b2028', 1.6));
    this.sun = new THREE.DirectionalLight('#fff1dc', 3.2);
    this.sun.position.set(-55, 85, 35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -110;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 110;
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight('#89a4c0', 0.2));
  }

  setMood({ background, fog, near = 70, far = 240, sun = 2.5, exposure = 1.05 }) {
    this.scene.background.set(background);
    this.scene.fog = new THREE.Fog(background, near, far);
    this.sun.intensity = sun;
    this.renderer.toneMappingExposure = exposure;
  }

  add(object) { this.scene.add(object); return object; }
  remove(object) { this.scene.remove(object); }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  frame() { return Math.min(this.clock.getDelta(), 0.05); }
  render() { this.renderer.render(this.scene, this.camera); }
  dispose() { this.renderer.dispose(); }
}
