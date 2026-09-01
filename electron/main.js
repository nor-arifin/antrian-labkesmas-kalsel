const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isPackaged = app.isPackaged;

const DEFAULT_REMOTE_URL = 'https://antrian.labkesmas-kalsel.id/kiosk';

let mainWindow;
let kioskUrl = null;

function isRemoteMode() {
  if (process.env.KIOSK_URL) return true;
  if (process.env.KIOSK_LOCAL === '1') return false;
  return isPackaged;
}

function remoteKioskUrl() {
  const base = process.env.KIOSK_URL || DEFAULT_REMOTE_URL;
  if (base.endsWith('/kiosk')) return base;
  return `${base.replace(/\/+$/, '')}/kiosk`;
}

function setupEnv() {
  process.env.NODE_ENV = 'production';

  const userData = app.getPath('userData');

  if (!process.env.DB_PATH) {
    process.env.DB_PATH = path.join(userData, 'antrian.db');
  }
  if (!process.env.VIDEO_DIR) {
    process.env.VIDEO_DIR = path.join(userData, 'videos');
  }
  if (!process.env.SQLJS_WASM_PATH) {
    process.env.SQLJS_WASM_PATH = isPackaged
      ? path.join(process.resourcesPath, 'sql-wasm.wasm')
      : path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  }
  if (!process.env.STATIC_DIR) {
    process.env.STATIC_DIR = isPackaged
      ? path.join(process.resourcesPath, 'app-dist')
      : path.join(__dirname, '..', 'dist');
  }
  if (!process.env.PUBLIC_DIR) {
    process.env.PUBLIC_DIR = isPackaged
      ? path.join(process.resourcesPath, 'app-public')
      : path.join(__dirname, '..', 'public');
  }

  process.env.PORT = '0';
}

function createWindow() {
  const remote = isRemoteMode();
  mainWindow = new BrowserWindow({
    fullscreen: process.env.ELECTRON_KIOSK !== '0',
    kiosk: process.env.ELECTRON_KIOSK !== '0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: remote,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.loadURL(kioskUrl || 'http://localhost:3001/kiosk');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const { server } = require('./server.bundle.cjs');

  const wait = setInterval(() => {
    const addr = server.address();
    if (!addr) return;
    clearInterval(wait);
    const port = addr.port;
    console.log(`[kiosk] server siap di port ${port}`);
    kioskUrl = `http://localhost:${port}/kiosk`;
    createWindow();
  }, 200);
}

app.whenReady().then(() => {
  if (isRemoteMode()) {
    kioskUrl = remoteKioskUrl();
    console.log(`[kiosk] remote mode -> ${kioskUrl}`);
    createWindow();
    return;
  }

  setupEnv();
  startServer();
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('print-ticket', (event, html) => {
  if (!mainWindow) {
    event.reply('print-result', { success: false, error: 'No window' });
    return;
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true
    }
  });

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  printWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true
        },
        (success, failureReason) => {
          if (!success) {
            console.error('Print failed:', failureReason);
          }
          event.reply('print-result', { success, error: failureReason || null });
          printWindow.close();
        }
      );
    }, 500);
  });

  printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Load failed:', errorCode, errorDescription);
    event.reply('print-result', { success: false, error: errorDescription });
    printWindow.close();
  });
});

ipcMain.on('quit-app', () => {
  app.quit();
});
