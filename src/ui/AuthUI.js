export class AuthUI {
  constructor(root, authAPI) { this.root = root; this.authAPI = authAPI; }
  async present() {
    const existing = this.authAPI.getSession(); if (existing) return existing;
    return new Promise((resolve) => {
      this.root.innerHTML = `
        <section class="auth-screen ui-screen">
          <div class="auth-noise"></div><div class="auth-panel panel">
            <p class="eyebrow">STRIKE VECTOR // SECURE ACCESS</p><h1>ENTER THE<br><span>OPERATION</span></h1>
            <p class="subcopy">Deploy into an original tactical training simulation.</p>
            <div class="tabs"><button class="tab active" data-tab="guest">GUEST</button><button class="tab" data-tab="login">LOGIN</button><button class="tab" data-tab="signup">SIGN UP</button></div>
            <form id="auth-form"><label>CALLSIGN<input name="username" maxlength="20" autocomplete="username" placeholder="Operator name" /></label><label class="email-field">EMAIL<input name="email" type="email" autocomplete="email" placeholder="you@example.com" /></label><label class="password-field">PASSWORD<input name="password" type="password" autocomplete="current-password" placeholder="••••••••" /></label><button class="primary wide" type="submit">DEPLOY AS GUEST <span>→</span></button></form>
            <p class="fine-print">Guest profiles are stored only in this browser.</p>
          </div>
        </section>`;
      let tab = 'guest'; const form = this.root.querySelector('#auth-form'); const button = form.querySelector('button');
      const select = (next) => {
        tab = next; this.root.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item.dataset.tab === tab));
        form.querySelector('.email-field').style.display = tab === 'guest' ? 'none' : '';
        form.querySelector('.password-field').style.display = tab === 'guest' ? 'none' : '';
        button.innerHTML = `${tab === 'guest' ? 'DEPLOY AS GUEST' : tab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'} <span>→</span>`;
      };
      this.root.querySelectorAll('.tab').forEach((item) => item.addEventListener('click', () => select(item.dataset.tab)));
      select(tab);
      form.addEventListener('submit', async (event) => {
        event.preventDefault(); const data = new FormData(form); const username = data.get('username')?.trim();
        button.disabled = true;
        const session = tab === 'guest' ? this.authAPI.guest(username) : await this.authAPI.authenticate(tab, Object.fromEntries(data));
        this.root.innerHTML = ''; resolve(session);
      });
    });
  }
}
