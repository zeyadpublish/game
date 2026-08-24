const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 620,
    backgroundColor: '#060b12',
    webPreferences: { webSecurity: false, contextIsolation: true },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  window.loadURL(devUrl || `file://${path.join(__dirname, 'dist', 'index.html')}`);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
