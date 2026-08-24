const SESSION_KEY = 'warzone_session';

export class AuthAPI {
  getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
  _save(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); return session; }
  guest(username) {
    const callsign = (username || `Operator_${Math.floor(1000 + Math.random() * 9000)}`).replace(/[^a-z0-9_ -]/gi, '').slice(0, 20) || 'Operator';
    return this._save({ token: `guest-${crypto.randomUUID()}`, user: { id: crypto.randomUUID(), username: callsign, email: '', isGuest: true }, online: false });
  }
  async authenticate(kind, { username, email }) {
    // The supplied game server exposes rooms rather than identity endpoints. Keep an explicit local session for both forms.
    const callsign = (username || email?.split('@')[0] || 'Operator').replace(/[^a-z0-9_ -]/gi, '').slice(0, 20);
    return this._save({ token: `local-${crypto.randomUUID()}`, user: { id: crypto.randomUUID(), username: callsign, email: email || '', isGuest: false }, online: false, kind });
  }
  clear() { localStorage.removeItem(SESSION_KEY); }
}
