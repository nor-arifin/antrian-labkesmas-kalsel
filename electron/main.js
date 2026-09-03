const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isPackaged = app.isPackaged;

const DEFAULT_REMOTE_URL = 'https://antrian.labkesmas-kalsel.id/kiosk';

let mainWindow;
let kioskUrl = null;

function remoteKioskUrl() {
  const base = process.env.KIOSK_URL || DEFAULT_REMOTE_URL;
  if (base.endsWith('/kiosk')) return base;
  return `${base.replace(/\/+$/, '')}/kiosk`;
}

function createWindow() {
  kioskUrl = remoteKioskUrl();
  console.log(`[kiosk] remote -> ${kioskUrl}`);

  mainWindow = new BrowserWindow({
    fullscreen: process.env.ELECTRON_KIOSK !== '0',
    kiosk: process.env.ELECTRON_KIOSK !== '0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.loadURL(kioskUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
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
