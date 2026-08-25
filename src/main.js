import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { PhysicsManager } from './engine/PhysicsManager.js';
import { InputManager } from './engine/InputManager.js';
import { AudioManager } from './engine/AudioManager.js';
import { CharacterController } from './characters/CharacterController.js';
import { WeaponManager } from './characters/WeaponManager.js';
import { LevelManager } from './levels/LevelManager.js';
import { HUD } from './ui/HUD.js';
import { AuthUI } from './ui/AuthUI.js';
import { MainMenuUI } from './ui/MainMenuUI.js';
import { TouchControls } from './ui/TouchControls.js';
import { AuthAPI } from './api/AuthAPI.js';
import { OnlineClient } from './api/OnlineClient.js';
import { RemotePlayer } from './api/RemotePlayer.js';

const canvas = document.querySelector('#game-canvas');
const root = document.querySelector('#ui-root');
const sceneManager = new SceneManager(canvas);
const physics = new PhysicsManager();
const input = new InputManager(canvas);
const audio = new AudioManager(sceneManager.camera);
const auth = new AuthAPI();
let hud, player, weapon, levelManager, online, session, gameActive = false, mode = 'offline';
const remotePlayers = new Map();

function clearRemotePlayers() { remotePlayers.forEach((remote) => remote.dispose()); remotePlayers.clear(); }
function showMenu() {
  gameActive = false; input.setEnabled(false); online?.disconnect(); clearRemotePlayers(); levelManager?.clear(); hud?.hide();
  new MainMenuUI(root, { session, onlineClient: online, onStart: startGame }).show();
}
function wireOnlineEvents() {
  online.on('players_transform_sync', (players) => {
    players.forEach((data) => {
      if (data.playerId === online.socket?.id) return;
      if (!remotePlayers.has(data.playerId)) remotePlayers.set(data.playerId, new RemotePlayer(sceneManager, data));
      remotePlayers.get(data.playerId).apply(data);
    });
  });
  online.on('player:left', ({ playerId }) => { remotePlayers.get(playerId)?.dispose(); remotePlayers.delete(playerId); });
  online.on('receive_damage', ({ amount, attackerName }) => { if (!player?.dead) { player.takeDamage(amount, attackerName); hud.damage(); } });
  online.on('player_killed', ({ killerName, victimName, hitZone }) => { hud.kill(`${killerName} → ${victimName}`, hitZone === 'head'); });
  online.on('error', () => hud.announce('NETWORK RETRYING — OFFLINE FALLBACK AVAILABLE'));
}
async function startGame(config) {
  mode = config.mode; root.innerHTML = ''; hud = new HUD(root); const doneLoading = hud.loading(config.mode === 'offline' ? 'INITIALIZING TRAINING ZONE' : 'CONNECTING TO OPERATION');
  if (!player) {
    player = new CharacterController({ sceneManager, physicsManager: physics, inputManager: input, onStep: () => audio.footstep(), onDeath: (attacker) => {
      gameActive = false; input.setEnabled(false); hud.damage(); hud.death(() => respawn(), () => showMenu()); hud.announce(`DOWNED BY ${attacker}`);
    } });
    weapon = new WeaponManager({ sceneManager, physicsManager: physics, player, inputManager: input, audioManager: audio, onHit: (point, amount, critical) => { hud.hitMarker(); hud.damageNumber(point, amount, critical); audio.hit(); }, onKill: (enemy, critical) => { hud.kill(enemy.variant === 'heavy' ? 'HEAVY UNIT' : 'HOSTILE', critical); audio.kill(); }, onShot: (origin, direction) => online?.shoot(origin, direction) });
    levelManager = new LevelManager({ sceneManager, physicsManager: physics, player, audioManager: audio, onEnemyAttack: (enemy, damage) => { if (!player.dead) { player.takeDamage(damage, enemy.variant === 'heavy' ? 'HEAVY UNIT' : 'HOSTILE'); hud.damage(); } }, onEnemyKilled: () => {}, onAllEnemiesKilled: async (level) => {
      hud.announce(level < 3 ? 'ZONE SECURED — NEXT DEPLOYMENT' : 'OPERATION COMPLETE');
      if (level < 3) { gameActive = false; setTimeout(async () => { const close = hud.loading('PREPARING NEXT ZONE'); await levelManager.loadLevel(level + 1); close(); gameActive = true; }, 1800); }
    } });
  }
  new TouchControls(root, input);
  if (config.mode !== 'offline') { online = new OnlineClient(session.user.username); wireOnlineEvents(); online.connect(config.roomCode || `OPEN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`); }
  await levelManager.loadLevel(config.level, undefined, config.mode !== 'offline');
  doneLoading(); hud.show(); hud.announce(config.mode === 'offline' ? 'CLEAR HOSTILES' : 'LIVE NETWORK OPERATION'); input.setEnabled(true); audio.unlock(); gameActive = true;
}
function respawn() { player.reset(levelManager.spawnPoint()); weapon.currentAmmo = weapon.magazineSize; gameActive = true; input.setEnabled(true); }
function loop() {
  requestAnimationFrame(loop); const delta = sceneManager.frame();
  if (gameActive) {
    player.update(delta); weapon.update(delta); levelManager.update(delta); remotePlayers.forEach((remote) => remote.update(delta));
    if (mode !== 'offline') online?.sendMove(player, input.movement.lengthSq() ? 'run' : 'idle');
    hud.update({ player, weapon, enemies: levelManager.enemies, level: levelManager.currentLevel });
  }
  sceneManager.render();
}
async function boot() { session = await new AuthUI(root, auth).present(); showMenu(); loop(); }
boot();
