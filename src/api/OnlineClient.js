import { io } from 'socket.io-client';

const API_URL = 'https://warzone-tactical-fps-server--my-api.replit.app/api';
const SOCKET_URL = 'wss://warzone-tactical-fps-server--my-api.replit.app';

export class OnlineClient {
  constructor(playerName) { this.playerName = playerName; this.socket = null; this.handlers = new Map(); this.lastMove = 0; this.roomCode = ''; }
  on(event, handler) { this.handlers.set(event, handler); return () => this.handlers.delete(event); }
  _emitLocal(event, data) { this.handlers.get(event)?.(data); }
  async connect(roomCode) {
    this.disconnect(); this.roomCode = roomCode;
    try {
      await fetch(`${API_URL}/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomCode, roomName: roomCode }) });
    } catch (error) { console.warn('Room REST request failed; trying socket connection.', error); }
    this.socket = io(SOCKET_URL, { transports: ['websocket'] });
    this.socket.on('connect', () => { this.socket.emit('join_room', { roomName: roomCode, playerName: this.playerName }); this._emitLocal('connected'); });
    ['room:state', 'player:joined', 'player:left', 'players_transform_sync', 'player_killed', 'receive_damage', 'scoreboard_sync', 'respawn', 'server_pong'].forEach((event) => this.socket.on(event, (data) => this._emitLocal(event, data)));
    this.socket.on('connect_error', (error) => this._emitLocal('error', error));
  }
  sendMove(player, anim = 'idle') {
    if (!this.socket?.connected || performance.now() - this.lastMove < 50) return;
    this.lastMove = performance.now(); const { position, health } = player;
    this.socket.emit('player:move', { x: position.x, y: position.y, z: position.z, health, anim });
  }
  shoot(origin, direction) { this.socket?.emit('shoot_event', { origin, direction }); }
  hit(targetId, damage, hitZone = 'body') { this.socket?.emit('hit_event', { targetId, damage, hitZone }); }
  ping() { const now = Date.now(); this.socket?.emit('client_ping', now); }
  disconnect() { this.socket?.disconnect(); this.socket = null; }
}
