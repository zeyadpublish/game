export class HUD {
  constructor(root) { this.root = root; this.kills = 0; this._build(); }
  _build() {
    this.root.innerHTML = `<section class="hud hidden" id="hud"><div class="scanlines"></div><div class="minimap"><div class="map-grid"></div><span class="map-player">▲</span><label>SECTOR // ${String(1).padStart(2, '0')}</label></div><div class="objective"><span class="eyebrow">OPERATION STATUS</span><b id="objective-text">CLEAR HOSTILES</b><small id="enemy-count">CONTACTS DETECTED</small></div><div class="kill-feed" id="kill-feed"></div><div class="crosshair"><i></i><i></i><i></i><i></i><b></b></div><div class="damage-vignette"></div><div class="survival"><div class="bar-set"><label><span>HEALTH</span><b id="health-value">100</b></label><div class="bar health"><i id="health-bar"></i></div></div><div class="bar-set"><label><span>ARMOR</span><b id="armor-value">150</b></label><div class="bar armor"><i id="armor-bar"></i></div></div></div><div class="weapon-readout"><span class="weapon-name">VX-4 // CARBINE</span><div><b id="ammo">30</b><em>/ <span id="reserve">180</span></em></div><small id="reload-label"></small></div><div class="score-readout"><span>KILLS</span><b id="kills">00</b></div></section>`;
    this.el = { hud: this.root.querySelector('#hud'), health: this.root.querySelector('#health-value'), armor: this.root.querySelector('#armor-value'), healthBar: this.root.querySelector('#health-bar'), armorBar: this.root.querySelector('#armor-bar'), ammo: this.root.querySelector('#ammo'), reserve: this.root.querySelector('#reserve'), reload: this.root.querySelector('#reload-label'), feed: this.root.querySelector('#kill-feed'), count: this.root.querySelector('#enemy-count'), objective: this.root.querySelector('#objective-text'), kills: this.root.querySelector('#kills') };
  }
  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }
  update({ player, weapon, enemies, level }) {
    const health = Math.ceil(player.health), armor = Math.ceil(player.armor); this.el.health.textContent = health; this.el.armor.textContent = armor;
    this.el.healthBar.style.width = `${health}%`; this.el.armorBar.style.width = `${armor / 1.5}%`;
    this.el.ammo.textContent = String(weapon.currentAmmo).padStart(2, '0'); this.el.reserve.textContent = weapon.reserveAmmo;
    this.el.reload.textContent = weapon.reloading ? 'RELOADING' : ''; const left = enemies.filter((enemy) => !enemy.dead).length;
    this.el.count.textContent = `${left} CONTACT${left === 1 ? '' : 'S'} REMAINING`; this.root.querySelector('.minimap label').textContent = `SECTOR // ${String(level).padStart(2, '0')}`;
  }
  hitMarker() { this.root.querySelector('.crosshair').classList.add('hit'); setTimeout(() => this.root.querySelector('.crosshair')?.classList.remove('hit'), 90); }
  damage() { const item = this.root.querySelector('.damage-vignette'); item.classList.add('active'); setTimeout(() => item.classList.remove('active'), 180); }
  damageNumber(position, amount, critical) {
    const node = document.createElement('span'); node.className = `damage-number ${critical ? 'critical' : ''}`; node.textContent = Math.round(amount);
    node.style.left = `${50 + (Math.random() - .5) * 12}%`; node.style.top = `${46 + (Math.random() - .5) * 10}%`; this.root.append(node); setTimeout(() => node.remove(), 700);
  }
  kill(name, critical = false) { this.kills++; this.el.kills.textContent = String(this.kills).padStart(2, '0'); const item = document.createElement('div'); item.innerHTML = `<b>YOU</b><span>${critical ? 'HEADSHOT' : 'ELIMINATED'}</span><em>${name}</em>`; this.el.feed.prepend(item); setTimeout(() => item.remove(), 3500); }
  announce(text) { this.el.objective.textContent = text; }
  death(onRespawn, onMenu) {
    document.exitPointerLock(); const screen = document.createElement('div'); screen.className = 'death-screen'; screen.innerHTML = `<div><p class="eyebrow">OPERATOR DOWN</p><h2>MISSION<br><span>INTERRUPTED</span></h2><p>You can re-enter the training zone or return to deployment.</p><button class="primary" data-action="respawn">RESPAWN <span>↻</span></button><button class="ghost" data-action="menu">MAIN MENU</button></div>`; this.root.append(screen); screen.querySelector('[data-action="respawn"]').onclick = () => { screen.remove(); onRespawn(); }; screen.querySelector('[data-action="menu"]').onclick = () => { screen.remove(); onMenu(); };
  }
  loading(label = 'LOADING OPERATION') { const node = document.createElement('div'); node.className = 'loading-screen'; node.innerHTML = `<div class="loading-mark">SV</div><p>${label}</p><i></i>`; this.root.append(node); return () => node.remove(); }
}
