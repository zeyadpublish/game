export class TouchControls {
  constructor(root, input) { this.root = root; this.input = input; this.active = matchMedia('(pointer: coarse)').matches; if (this.active) this.build(); }
  build() {
    const controls = document.createElement('div'); controls.className = 'touch-controls'; controls.innerHTML = `<div class="look-zone"></div><div class="stick"><i></i></div><div class="touch-actions"><button data-touch="ads">ADS</button><button data-touch="reload">R</button><button class="fire" data-touch="fire">FIRE</button></div>`; this.root.append(controls);
    const stick = controls.querySelector('.stick'), knob = stick.querySelector('i'); let start;
    stick.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; stick.setPointerCapture(e.pointerId); });
    stick.addEventListener('pointermove', (e) => { if (!start) return; const x = Math.max(-34, Math.min(34, e.clientX - start.x)); const y = Math.max(-34, Math.min(34, e.clientY - start.y)); knob.style.transform = `translate(${x}px,${y}px)`; this.input.virtualMove.set(x / 34, -y / 34); });
    const reset = () => { start = null; knob.style.transform = ''; this.input.virtualMove.set(0, 0); }; stick.addEventListener('pointerup', reset); stick.addEventListener('pointercancel', reset);
    const lookZone = controls.querySelector('.look-zone'); let lookStart;
    lookZone.addEventListener('pointerdown', (e) => { lookStart = { x: e.clientX, y: e.clientY }; lookZone.setPointerCapture(e.pointerId); });
    lookZone.addEventListener('pointermove', (e) => { if (!lookStart) return; this.input.virtualLook.add((e.clientX - lookStart.x) * 1.15, (e.clientY - lookStart.y) * 1.15); lookStart = { x: e.clientX, y: e.clientY }; });
    lookZone.addEventListener('pointerup', () => { lookStart = null; }); lookZone.addEventListener('pointercancel', () => { lookStart = null; });
    controls.querySelector('[data-touch="fire"]').addEventListener('pointerdown', () => this.input.fire = true); controls.querySelector('[data-touch="fire"]').addEventListener('pointerup', () => this.input.fire = false);
    controls.querySelector('[data-touch="ads"]').addEventListener('pointerdown', () => this.input.ads = true); controls.querySelector('[data-touch="ads"]').addEventListener('pointerup', () => this.input.ads = false);
    controls.querySelector('[data-touch="reload"]').addEventListener('click', () => this.input.reloadRequested = true);
  }
}
