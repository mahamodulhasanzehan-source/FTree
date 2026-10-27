const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Frameless for custom Windows 11 title bar
    backgroundColor: '#020617', // Match slate-950 dark theme
    icon: path.join(__dirname, '../dist/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // In production load built dist/index.html; in dev load local dev server
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window control IPCs
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Handle native file dialogs
  ipcMain.handle('dialog:open-ftree', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Family Tree',
      filters: [
        { name: 'Family Tree File (*.ftree)', extensions: ['ftree', 'json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8');
      return {
        filePath: result.filePaths[0],
        content,
      };
    } catch (err) {
      console.error('Failed to read file:', err);
      throw err;
    }
  });

  ipcMain.handle('dialog:save-ftree', async (_event, { defaultName, content }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Family Tree As',
      defaultPath: `${defaultName || 'FamilyTree'}.ftree`,
      filters: [
        { name: 'Family Tree File (*.ftree)', extensions: ['ftree'] },
        { name: 'JSON File (*.json)', extensions: ['json'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to save file:', err);
      throw err;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
