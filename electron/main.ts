import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { setupWatcher, disposeWatcher } from './watcher';

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: 'Nava Atelier',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('watch:start', async (_evt, folderPath: string) => {
    return setupWatcher(folderPath, (payload) => {
      win?.webContents.send('watch:event', payload);
    });
  });

  ipcMain.handle('watch:stop', async () => {
    await disposeWatcher();
    return { ok: true };
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await disposeWatcher();
  if (process.platform !== 'darwin') app.quit();
});
