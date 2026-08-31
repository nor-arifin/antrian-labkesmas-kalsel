const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.loadURL('http://localhost:3080/kiosk');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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
