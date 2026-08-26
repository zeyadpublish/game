export class TouchControls {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    const windowsDevice = /Windows NT/.test(navigator.userAgent);
    const appleTouchDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const touchOnlyDevice = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    this.active = !windowsDevice && (appleTouchDevice || touchOnlyDevice);
    if (this.active) this.build();
  }
  build() {
    const controls = document.createElement('div'); controls.className = 'touch-controls'; controls.innerHTML = `<div class="look-zone"></div><div class="stick"><i></i></div><div class="touch-actions"><button data-touch="lock" aria-pressed="false">LOCK</button><button data-touch="reload">R</button><button data-touch="ads">ADS</button><button class="fire" data-touch="fire">FIRE</button></div>`; this.root.append(controls);
    const capturePointer = (element, event) => { try { element.setPointerCapture?.(event.pointerId); } catch {} };
    const stick = controls.querySelector('.stick'), knob = stick.querySelector('i'); let start;
    stick.addEventListener('pointerdown', (e) => { e.preventDefault(); start = { x: e.clientX, y: e.clientY }; capturePointer(stick, e); });
    stick.addEventListener('pointermove', (e) => { if (!start) return; const x = Math.max(-34, Math.min(34, e.clientX - start.x)); const y = Math.max(-34, Math.min(34, e.clientY - start.y)); knob.style.transform = `translate(${x}px,${y}px)`; this.input.virtualMove.set(x / 34, -y / 34); });
    const reset = () => { start = null; knob.style.transform = ''; this.input.virtualMove.set(0, 0); }; stick.addEventListener('pointerup', reset); stick.addEventListener('pointercancel', reset); stick.addEventListener('lostpointercapture', reset);
    const lookZone = controls.querySelector('.look-zone'); let lookStart;
    lookZone.addEventListener('pointerdown', (e) => { e.preventDefault(); lookStart = { x: e.clientX, y: e.clientY }; capturePointer(lookZone, e); });
    lookZone.addEventListener('pointermove', (e) => { if (!lookStart) return; this.input.virtualLook.add((e.clientX - lookStart.x) * 1.15, (e.clientY - lookStart.y) * 1.15); lookStart = { x: e.clientX, y: e.clientY }; });
    lookZone.addEventListener('pointerup', () => { lookStart = null; }); lookZone.addEventListener('pointercancel', () => { lookStart = null; }); lookZone.addEventListener('lostpointercapture', () => { lookStart = null; });
    const fire = controls.querySelector('[data-touch="fire"]'), ads = controls.querySelector('[data-touch="ads"]');
    fire.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.fire = true; capturePointer(fire, e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((event) => fire.addEventListener(event, () => this.input.fire = false));
    ads.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.ads = true; capturePointer(ads, e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((event) => ads.addEventListener(event, () => this.input.ads = false));
    controls.querySelector('[data-touch="reload"]').addEventListener('click', () => this.input.reloadRequested = true);
    const lock = controls.querySelector('[data-touch="lock"]');
    lock.addEventListener('click', (e) => {
      e.preventDefault(); const active = this.input.toggleMovementLock();
      lock.classList.toggle('active', active); lock.setAttribute('aria-pressed', String(active)); lock.textContent = active ? 'UNLOCK' : 'LOCK';
    });
  }
}
