export class TouchControls {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    this.abortController = new AbortController();
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    const touchPoints = navigator.maxTouchPoints || 0;
    const windowsDevice = /Windows NT/.test(navigator.userAgent);
    this.appleTouchDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (platform === 'MacIntel' && touchPoints > 1);
    const hasDesktopPointer = matchMedia('(any-hover: hover) and (any-pointer: fine)').matches;
    const touchOnlyDevice = matchMedia('(pointer: coarse)').matches && !hasDesktopPointer;
    this.active = !windowsDevice && (this.appleTouchDevice || touchOnlyDevice);
    if (this.active) this.build();
  }
  build() {
    const controls = document.createElement('div');
    controls.className = `touch-controls${this.appleTouchDevice ? ' apple-touch-controls' : ''}`;
    controls.innerHTML = `<div class="look-zone"></div><div class="stick"><i></i></div><button class="jump" data-touch="jump">JUMP</button><div class="touch-actions"><button data-touch="lock" aria-pressed="false">LOCK</button><button data-touch="reload">R</button><button data-touch="ads">ADS</button><button class="fire" data-touch="fire">FIRE</button></div>`;
    this.root.append(controls); this.controls = controls;
    const signal = this.abortController.signal;
    const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal });
    const capturePointer = (element, event) => { try { element.setPointerCapture?.(event.pointerId); } catch {} };

    const stick = controls.querySelector('.stick'), knob = stick.querySelector('i'); let stickStart, stickPointerId = null;
    const updateStick = (event) => {
      if (!stickStart || event.pointerId !== stickPointerId) return;
      if (event.cancelable) event.preventDefault();
      const x = Math.max(-34, Math.min(34, event.clientX - stickStart.x)); const y = Math.max(-34, Math.min(34, event.clientY - stickStart.y));
      knob.style.transform = `translate(${x}px,${y}px)`; this.input.virtualMove.set(x / 34, -y / 34);
    };
    const resetStick = (event) => {
      if (stickPointerId === null || event.pointerId !== stickPointerId) return;
      stickStart = null; stickPointerId = null; knob.style.transform = ''; this.input.virtualMove.set(0, 0);
    };
    listen(stick, 'pointerdown', (event) => { event.preventDefault(); stickStart = { x: event.clientX, y: event.clientY }; stickPointerId = event.pointerId; capturePointer(stick, event); });
    listen(window, 'pointermove', updateStick, { passive: false }); listen(window, 'pointerup', resetStick); listen(window, 'pointercancel', resetStick);

    const lookZone = controls.querySelector('.look-zone'); let lookStart, lookPointerId = null;
    const updateLook = (event) => {
      if (!lookStart || event.pointerId !== lookPointerId) return;
      if (event.cancelable) event.preventDefault();
      this.input.virtualLook.add((event.clientX - lookStart.x) * 1.15, (event.clientY - lookStart.y) * 1.15); lookStart = { x: event.clientX, y: event.clientY };
    };
    const resetLook = (event) => { if (lookPointerId === event.pointerId) { lookStart = null; lookPointerId = null; } };
    listen(lookZone, 'pointerdown', (event) => { event.preventDefault(); lookStart = { x: event.clientX, y: event.clientY }; lookPointerId = event.pointerId; capturePointer(lookZone, event); });
    listen(window, 'pointermove', updateLook, { passive: false }); listen(window, 'pointerup', resetLook); listen(window, 'pointercancel', resetLook);

    const fire = controls.querySelector('[data-touch="fire"]'), ads = controls.querySelector('[data-touch="ads"]'); let firePointerId = null, adsPointerId = null;
    const releaseFire = (event) => { if (firePointerId === event.pointerId) { firePointerId = null; this.input.fire = false; } };
    const releaseAds = (event) => { if (adsPointerId === event.pointerId) { adsPointerId = null; this.input.ads = false; } };
    listen(fire, 'pointerdown', (event) => { event.preventDefault(); firePointerId = event.pointerId; this.input.fire = true; capturePointer(fire, event); });
    listen(ads, 'pointerdown', (event) => { event.preventDefault(); adsPointerId = event.pointerId; this.input.ads = true; capturePointer(ads, event); });
    listen(window, 'pointerup', releaseFire); listen(window, 'pointercancel', releaseFire); listen(window, 'pointerup', releaseAds); listen(window, 'pointercancel', releaseAds);
    const jump = controls.querySelector('[data-touch="jump"]');
    listen(jump, 'pointerdown', (event) => { event.preventDefault(); this.input.requestJump(); capturePointer(jump, event); });
    listen(controls.querySelector('[data-touch="reload"]'), 'click', () => this.input.reloadRequested = true);
    const lock = controls.querySelector('[data-touch="lock"]');
    listen(lock, 'click', (event) => {
      event.preventDefault(); const active = this.input.toggleMovementLock();
      lock.classList.toggle('active', active); lock.setAttribute('aria-pressed', String(active)); lock.textContent = active ? 'UNLOCK' : 'LOCK';
    });
  }
  destroy() {
    this.abortController.abort(); this.controls?.remove(); this.input.virtualMove.set(0, 0); this.input.virtualLook.set(0, 0); this.input.fire = false; this.input.ads = false;
  }
}
