const { app, BrowserWindow, dialog } = require('electron');
const { fork } = require('child_process');
const http = require('http');
const fs = require('fs');
const net = require('net');
const path = require('path');

const BASE_PORT = Number(process.env.PORT || 3000);
let mainWindow = null;
let serverProcess = null;
let serverPort = BASE_PORT;

app.setName('ConvocaFutbol');

function writeDesktopLog(message) {
  try {
    const logDir = app.getPath('userData');
    const logFile = path.join(logDir, 'desktop.log');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`, 'utf-8');
  } catch {
    // Ignorar errores de logging para no romper el arranque.
  }
}

function getAppBasePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  return app.getAppPath();
}

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

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, '127.0.0.1');
  });
}

async function resolvePort(preferredPort) {
  if (await isPortAvailable(preferredPort)) return preferredPort;

  for (let offset = 1; offset <= 20; offset += 1) {
    const candidate = preferredPort + offset;
    if (await isPortAvailable(candidate)) return candidate;
  }

  throw new Error(`No hay puertos disponibles desde ${preferredPort} hasta ${preferredPort + 20}`);
}

async function startBackend() {
  const appBasePath = getAppBasePath();
  const backendEntry = path.join(appBasePath, 'server.js');
  const frontendDist = path.join(appBasePath, 'Whatsapp_Multicast', 'dist', 'convoca-futbol-web');
  serverPort = await resolvePort(BASE_PORT);

  if (!fs.existsSync(backendEntry)) {
    throw new Error(`No se encontro backend: ${backendEntry}`);
  }

  writeDesktopLog(`[Electron] appBasePath=${appBasePath}`);
  writeDesktopLog(`[Electron] backendEntry=${backendEntry}`);
  writeDesktopLog(`[Electron] frontendDist=${frontendDist}`);
  writeDesktopLog(`[Electron] serverPort=${serverPort}`);

  serverProcess = fork(backendEntry, [], {
    cwd: appBasePath,
    env: {
      ...process.env,
      PORT: String(serverPort),
      APP_DATA_DIR: app.getPath('userData'),
      FRONTEND_DIST: frontendDist,
      CORS_ORIGIN: '*'
    },
    stdio: 'pipe'
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (chunk) => {
      writeDesktopLog(`[backend][stdout] ${String(chunk).trim()}`);
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (chunk) => {
      writeDesktopLog(`[backend][stderr] ${String(chunk).trim()}`);
    });
  }

  serverProcess.on('error', (err) => {
    writeDesktopLog(`[Electron] Error iniciando backend: ${err.message}`);
  });

  serverProcess.on('exit', (code) => {
    if (!app.isQuitting) {
      writeDesktopLog(`[Electron] El backend termino inesperadamente. Codigo: ${code}`);
      dialog.showErrorBox(
        'Error de inicio',
        `El backend se cerro inesperadamente (codigo ${code}).\n\nRevisa el log: ${path.join(app.getPath('userData'), 'desktop.log')}`
      );
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

  await waitForServer(`http://127.0.0.1:${serverPort}/api/whatsapp/status`);
  await mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
}

app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (err) {
    writeDesktopLog(`[Electron] Fallo startBackend: ${err.message}`);
    dialog.showErrorBox(
      'Error de inicio',
      `No se pudo iniciar el backend.\n\n${err.message}\n\nLog: ${path.join(app.getPath('userData'), 'desktop.log')}`
    );
    app.quit();
    return;
  }

  try {
    await createWindow();
  } catch (err) {
    writeDesktopLog(`[Electron] Error al iniciar ventana: ${err.message}`);
    dialog.showErrorBox(
      'Error al iniciar la aplicacion',
      `${err.message}\n\nRevisa el log: ${path.join(app.getPath('userData'), 'desktop.log')}`
    );
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
