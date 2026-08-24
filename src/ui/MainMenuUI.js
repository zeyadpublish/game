export class MainMenuUI {
  constructor(root, { session, onlineClient, onStart }) { this.root = root; this.session = session; this.online = onlineClient; this.onStart = onStart; }
  show() {
    this.root.innerHTML = `
      <section class="menu-screen ui-screen">
        <header class="menu-head"><div><p class="eyebrow">TACTICAL RESPONSE SIMULATION</p><h1>STRIKE <span>VECTOR</span></h1></div><div class="profile"><span class="status-dot"></span><div><b>${this.session.user.username}</b><small>${this.session.user.isGuest ? 'GUEST OPERATOR' : 'VERIFIED OPERATOR'}</small></div></div></header>
        <main class="menu-main"><div class="menu-intro"><p class="eyebrow">SELECT DEPLOYMENT</p><h2>YOUR NEXT<br>OPERATION</h2><p>Three original combat modes. All interfaces and arenas are purpose-built for Strike Vector.</p></div>
          <div class="mode-grid">
            <button class="mode-card online" data-mode="online"><span class="mode-icon">◌</span><em>NETWORK</em><h3>PLAY ONLINE</h3><p>Multiplayer · Global rooms · Live scoreboard</p><i>01</i></button>
            <button class="mode-card selected" data-mode="offline"><span class="mode-icon">◇</span><em>TRAINING</em><h3>PLAY OFFLINE</h3><p>Solo assault · AI hostiles · Three original zones</p><i>02</i></button>
            <button class="mode-card friend" data-mode="friend"><span class="mode-icon">×</span><em>PRIVATE</em><h3>1v1 FRIEND</h3><p>Room code · Invite only · Tactical duel</p><i>03</i></button>
          </div>
          <div class="deployment panel"><div class="level-pick"><span>COMBAT ZONE</span><div class="segmented"><button class="selected" data-level="1">01 CIVIC</button><button data-level="2">02 FOUNDRY</button><button data-level="3">03 BLACKOUT</button></div></div><div class="room-entry hidden"><label>ROOM CODE<input id="room-code" maxlength="6" placeholder="A1B2C3" /></label><button class="secondary" id="create-room">CREATE ROOM</button><small id="room-status">Enter a code or create a private room.</small></div><button class="primary deploy" id="deploy">BEGIN TRAINING <span>→</span></button></div>
        </main><footer><span>BUILD 1.0.0</span><span>WASD / MOUSE · CLICK TO LOCK AIM</span><span>© STRIKE VECTOR</span></footer>
      </section>`;
    let mode = 'offline', level = 1, roomCode = '';
    const deploy = this.root.querySelector('#deploy'); const room = this.root.querySelector('.room-entry');
    const refresh = () => { room.classList.toggle('hidden', mode !== 'friend'); deploy.innerHTML = `${mode === 'online' ? 'FIND MATCH' : mode === 'friend' ? 'OPEN PRIVATE LOBBY' : 'BEGIN TRAINING'} <span>→</span>`; };
    this.root.querySelectorAll('.mode-card').forEach((card) => card.addEventListener('click', () => { mode = card.dataset.mode; this.root.querySelectorAll('.mode-card').forEach((item) => item.classList.toggle('selected', item === card)); refresh(); }));
    this.root.querySelectorAll('[data-level]').forEach((button) => button.addEventListener('click', () => { level = Number(button.dataset.level); this.root.querySelectorAll('[data-level]').forEach((item) => item.classList.toggle('selected', item === button)); }));
    this.root.querySelector('#create-room').addEventListener('click', () => {
      const generated = Math.random().toString(36).slice(2, 8).toUpperCase(); this.root.querySelector('#room-code').value = generated; roomCode = generated;
      this.root.querySelector('#room-status').textContent = `Room ${generated} ready to share.`;
    });
    deploy.addEventListener('click', () => {
      roomCode = this.root.querySelector('#room-code').value.trim().toUpperCase() || roomCode;
      if (mode === 'friend' && !roomCode) { this.root.querySelector('#room-status').textContent = 'A six-character room code is required.'; return; }
      this.root.innerHTML = ''; this.onStart({ mode, level, roomCode });
    });
  }
}
