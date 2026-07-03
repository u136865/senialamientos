const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const http = require('http');
const path = require('path');

const SERVER_PORT = process.env.PORT || 3000;
let mainWindow = null;
let serverProcess = null;

function waitForServer(url, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tryConnect = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('No se pudo iniciar el servidor backend a tiempo.'));
          return;
        }
        setTimeout(tryConnect, 800);
      });
    };

    tryConnect();
  });
}

function startBackend() {
  const appPath = app.getAppPath();
  const backendEntry = path.join(appPath, 'server.js');
  const frontendDist = path.join(appPath, 'Whatsapp_Multicast', 'dist', 'whatsapp-multicast');

  serverProcess = fork(backendEntry, [], {
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      APP_DATA_DIR: app.getPath('userData'),
      FRONTEND_DIST: frontendDist,
      CORS_ORIGIN: '*'
    },
    stdio: 'inherit'
  });

  serverProcess.on('exit', (code) => {
    if (!app.isQuitting) {
      console.error('[Electron] El backend terminó inesperadamente. Código:', code);
      app.quit();
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await waitForServer(`http://127.0.0.1:${SERVER_PORT}/api/whatsapp/status`);
  await mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
}

app.whenReady().then(async () => {
  startBackend();

  try {
    await createWindow();
  } catch (err) {
    console.error('[Electron] Error al iniciar:', err.message);
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
