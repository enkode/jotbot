import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    skipTaskbar: true, // Hide from taskbar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    alwaysOnTop: false,
    hasShadow: true,
    resizable: true, // Allow resizing by IPC
    useContentSize: true, // Important for tight bounds
  });

  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // IPC Handlers
  ipcMain.on('resize-window', (event, width, height) => {
    if (mainWindow) {
      mainWindow.setSize(width, height, true); // Animate? No, maybe false for snap
      // Force bounds update for transparent windows
      mainWindow.setBounds({ width, height });

      // Center if needed? No, let user move it.
      // But we might need to ensure it's not off-screen?
    }
  });

  ipcMain.on('set-always-on-top', (event, flag) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(flag, 'screen-saver'); // Higher priority
    }
  });

  // Tray Setup
  const iconPath = path.join(__dirname, '../public/tray.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide', click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('jot.bot');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      // If focused, hide? Or just focus?
      if (mainWindow.isFocused()) {
        // maybe minimize?
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
